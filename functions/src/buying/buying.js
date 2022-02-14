const { logger } = require("firebase-functions");
const R = require("ramda");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  buyingsCollection,
  serverTimestamp,
  increment,
  https,
  usersCollection,
  productsCollection,
} = require("../lib/utils");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET BUYINGS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await buyingsCollection
      .where("isActive", "==", true)
      .where("invoiceCodeLowercase", ">=", keyword)
      .where("invoiceCodeLowercase", "<=", keyword + "\uf8ff")
      .orderBy("invoiceCodeLowercase")
      .limit(limit)
      .offset(offset)
      .get();
    const result = querySnapshot.docs.map((doc) => {
      const data = {
        ...doc.data(),
        id: doc.id,
      };
      return data;
    });

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

    if (!req?.body?.id && R.isEmpty(products))
      return res.status(405).json(ERROR_MESSAGE.invalidInput);

    let data = {
      invoiceCode: body?.invoiceCode,
      description: body?.description,
      products: products,
      status: body?.status, // from buyingStatus
      type: body?.type, // from buyingType
      contact: body?.contact, // from contact
      tax: Number(body?.tax || 0), //  in percentage
      discount: Number(body?.discount || 0), //  in percentage
      note: body?.note,

      invoiceCodeLowercase: String(body?.invoiceCode).toLowerCase(),
    };

    let totalPrice = 0;
    let categoryIds = [];
    products.forEach((item) => {
      totalPrice +=
        Number(item?.pricePerUnit || 0) * Number(item?.totalUnit || 1);
      if (item?.category?.id) categoryIds.push(item.category.id);
    });

    data = {
      ...data,
      totalPrice: totalPrice,
      categoryIds: categoryIds,
    };
    Object.keys(data).forEach((key) => R.isNil(data[key]) && delete data[key]);
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
          let stockAdded = item?.totalUnit || 0;
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

app.get("/:buyingId", async (req, res) => {
  const buyingId = req.params.buyingId;
  logger.log(`GET BUYING WITH ID: "${buyingId}"`);

  try {
    const doc = await buyingsCollection.doc(buyingId).get();
    return res.status(200).json(doc.data());
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
