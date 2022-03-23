const { logger } = require("firebase-functions");
const { isNil, isEmpty } = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  transactionsCollection,
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
    `GET TRANSACTIONS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  let transactionRef = transactionsCollection.where("isActive", "==", true);

  if (!isEmpty(keyword))
    transactionRef = transactionRef
      .where("invoiceCodeLowercase", ">=", keyword)
      .where("invoiceCodeLowercase", "<=", keyword + "\uf8ff")
      .orderBy("invoiceCodeLowercase");
  else {
    if (!isEmpty(statusId))
      transactionRef = transactionRef.where("status.id", "==", statusId);
    if (!isEmpty(typeId))
      transactionRef = transactionRef.where("type.id", "==", typeId);

    if (start) transactionRef = transactionRef.where("createdAt", ">", start);
    if (end) transactionRef = transactionRef.where("createdAt", "<", end);

    transactionRef = transactionRef.orderBy("createdAt", "desc");
  }

  try {
    const querySnapshot = await transactionRef
      .limit(limit)
      .offset(offset)
      .get();
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
      status: thinObject(body?.status), // from transactionStatus
      type: thinObject(body?.type), // from transactionType
      contact: thinContact(body?.contact), // from contact
      tax: Number(body?.tax || 0), //  in percentage
      discount: Number(body?.discount || 0), //  in percentage
      description: body?.description,
      note: body?.note,

      invoiceCodeLowercase: String(body?.invoiceCode).toLowerCase(),
    };

    let totalPrice = 0;
    let categoryIds = [];
    let brandIds = [];
    products.forEach((item) => {
      totalPrice += Number(item?.price || 0) * Number(item?.amount || 1);
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
      totalPrice: totalPrice,
      categoryIds: categoryIds,
      brandIds: brandIds,
    };
    Object.keys(data).forEach((key) => isNil(data[key]) && delete data[key]);
    logger.log(`TRANSACTION DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE TRANSACTION BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await transactionsCollection.doc(req.body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await transactionsCollection.add(data);
      data = { ...data, id: docRef.id };

      // UPDATE PRODUCT START
      let promises = [];
      products.forEach((item) => {
        if (item?.id) {
          let stockAdded = (item?.amount || 0) * -1;
          let sold = item?.amount || 0;
          promises.push(
            productsCollection
              .doc(item.id)
              .set(
                { stock: increment(stockAdded), totalSold: increment(sold) },
                { merge: true }
              )
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

app.put("/:transactionId", async (req, res) => {
  const transactionId = req.params.transactionId;
  logger.log(`UPDATE TRANSACTION WITH ID: "${transactionId}"`);

  try {
    const body = req?.body || {};
    const updatedStatus = thinObject(body?.status);
    const products = body?.products || []; // from product

    if (isNil(updatedStatus))
      return res.status(405).json(ERROR_MESSAGE.invalidInput);

    const doc = await transactionsCollection.doc(transactionId).get();
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
    logger.log(`UPDATE TRANSACTION BY: `, user);

    const data = {
      status: updatedStatus,
      products: updatedProducts,
      updatedBy: user,
      updatedAt: serverTimestamp(),
    };

    let promises = [];
    promises.push(
      transactionsCollection.doc(transactionId).set(data, { merge: true })
    );
    promises.push(
      transactionsCollection
        .doc(transactionId)
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

app.get("/:transactionId", async (req, res) => {
  const transactionId = req.params.transactionId;
  logger.log(`GET TRANSACTION WITH ID: "${transactionId}"`);

  try {
    const doc = await transactionsCollection.doc(transactionId).get();
    return res.status(200).json(standarizeData(doc.data(), transactionId));
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:transactionId", async (req, res) => {
  const transactionId = req.params.transactionId;
  logger.log(`SOFT-DELETE TRANSACTION WITH ID: "${transactionId}"`);

  try {
    await transactionsCollection
      .doc(transactionId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
