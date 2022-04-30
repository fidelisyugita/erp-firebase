const { logger } = require("firebase-functions");
const { isNil, isEmpty } = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  buyingsCollection,
  serverTimestamp,
  increment,
  https,
  usersCollection,
  productsCollection,
} = require("../lib/firebaseHelper");
const {
  thinObject,
  thinContact,
  thinTransactionProduct,
  standarizeData,
} = require("../lib/transformHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const start = req?.query?.startDate
    ? moment(req.query.startDate, "YYYY-MM-DD").toDate()
    : null;
  const end = req?.query?.endDate
    ? moment(req.query.endDate, "YYYY-MM-DD").add(1, "d").toDate()
    : null;
  const statusId = String(req?.query?.statusId || "");
  const typeId = String(req?.query?.typeId || "");

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET BUYINGS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  let buyingRef = buyingsCollection.where("isActive", "==", true);

  if (!isEmpty(keyword))
    buyingRef = buyingRef
      .where("invoiceCodeLowercase", ">=", keyword)
      .where("invoiceCodeLowercase", "<=", keyword + "\uf8ff")
      .orderBy("invoiceCodeLowercase");
  else {
    if (!isEmpty(statusId))
      buyingRef = buyingRef.where("status.id", "==", statusId);
    if (!isEmpty(typeId)) buyingRef = buyingRef.where("type.id", "==", typeId);

    if (start) buyingRef = buyingRef.where("createdAt", ">=", start);
    if (end) buyingRef = buyingRef.where("createdAt", "<", end);

    buyingRef = buyingRef.orderBy("createdAt", "desc");
  }

  try {
    const querySnapshot = await buyingRef.limit(limit).offset(offset).get();
    const result = querySnapshot.docs.map((doc) =>
      standarizeData(doc.data(), doc.id)
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/", async (req, res) => {
  try {
    const body = req?.body || {};
    const products = body?.products || []; // from product

    if (isNil(req?.body?.id) && isEmpty(products))
      return res.status(405).json(ERROR_MESSAGE.invalidInput);

    let data = {
      invoiceCode: body?.invoiceCode,
      products: products.map((p) => thinTransactionProduct(p)),
      status: thinObject(body?.status), // from buyingStatus
      type: thinObject(body?.type), // from buyingType
      contact: thinContact(body?.contact), // from contact
      tax: Number(body?.tax || 0), //  in percentage
      discount: Number(body?.discount || 0), //  in percentage
      description: body?.description,
      note: body?.note,

      invoiceCodeLowercase: String(body?.invoiceCode).toLowerCase(),
    };

    let totalSellingPrice = 0;
    let totalBuyingPrice = 0;
    let totalItem = 0;
    let categoryIds = [];
    let brandIds = [];
    products.forEach((item) => {
      totalSellingPrice +=
        Number(item?.sellingPrice || 0) * Number(item?.amount || 1);
      totalBuyingPrice +=
        Number(item?.buyingPrice || 0) * Number(item?.amount || 1);
      totalItem += Number(item.amount);

      if (item?.category?.id) {
        const catId = item.category.id;
        if (!categoryIds.includes(catId)) categoryIds.push(catId);
      }
      if (item?.brand?.id) {
        const brandId = item.brand.id;
        if (!brandIds.includes(brandId)) brandIds.push(brandId);
      }
    });

    data = {
      ...data,
      totalSellingPrice: totalSellingPrice,
      totalBuyingPrice: totalBuyingPrice,
      totalItem: totalItem,
      categoryIds: categoryIds,
      brandIds: brandIds,
    };
    Object.keys(data).forEach((key) => isNil(data[key]) && delete data[key]);
    logger.log(`BUYING DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE BUYING BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await buyingsCollection.doc(req.body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await buyingsCollection.add(data);
      data = { ...data, id: docRef.id };

      // UPDATE PRODUCT START
      let promises = [];
      products.forEach((item) => {
        if (item?.id) {
          let stockAdded = item?.amount || 0;
          promises.push(
            productsCollection
              .doc(item.id)
              .set({ stock: increment(stockAdded) }, { merge: true })
          );
        }
      });
      await Promise.all(promises);
      // UPDATE PRODUCT END
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.put("/:buyingId", async (req, res) => {
  const buyingId = req.params.buyingId;
  logger.log(`UPDATE BUYING WITH ID: "${buyingId}"`);

  try {
    const body = req?.body || {};
    const updatedStatus = thinObject(body?.status);
    const products = body?.products || []; // from product

    if (isNil(updatedStatus))
      return res.status(405).json(ERROR_MESSAGE.invalidInput);

    const doc = await buyingsCollection.doc(buyingId).get();
    if (!doc.exists) return res.status(405).json(ERROR_MESSAGE.invalidInput);

    const updatedProducts = products.map((item) =>
      thinTransactionProduct(item)
    );

    const userDoc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: userDoc.data().name || "-",
    };
    logger.log(`UPDATE BUYING BY: `, user);

    const data = {
      status: updatedStatus,
      products: updatedProducts,
      updatedBy: user,
      updatedAt: serverTimestamp(),
    };

    let promises = [];
    promises.push(buyingsCollection.doc(buyingId).set(data, { merge: true }));
    promises.push(
      buyingsCollection
        .doc(buyingId)
        .collection("logs")
        .add({ ...data, createdBy: user, createdAt: serverTimestamp() })
    );
    await Promise.all(promises);

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:buyingId", async (req, res) => {
  const buyingId = req.params.buyingId;
  logger.log(`GET BUYING WITH ID: "${buyingId}"`);

  try {
    const doc = await buyingsCollection.doc(buyingId).get();
    return res.status(200).json(standarizeData(doc.data(), buyingId));
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:buyingId", async (req, res) => {
  const buyingId = req.params.buyingId;
  logger.log(`SOFT-DELETE BUYING WITH ID: "${buyingId}"`);

  try {
    await buyingsCollection
      .doc(buyingId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
