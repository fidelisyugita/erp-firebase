const { logger } = require("firebase-functions");
const R = require("ramda");

const { LIMIT_PER_PAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  productCategoriesCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("../lib/firebaseHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET PRODUCT CATEGORIES WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await productCategoriesCollection
      .where("isActive", "==", true)
      .where("nameLowercase", ">=", keyword)
      .where("nameLowercase", "<=", keyword + "\uf8ff")
      .orderBy("nameLowercase")
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
    let data = {
      name: body?.name,
      description: body?.description,

      nameLowercase: String(body?.name).toLowerCase(),
    };
    Object.keys(data).forEach((key) => R.isNil(data[key]) && delete data[key]);
    logger.log(`PRODUCT CATEGORY DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE PRODUCT CATEGORY BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await productCategoriesCollection
        .doc(req.body.id)
        .set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await productCategoriesCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:productCategoryId", async (req, res) => {
  const productCategoryId = req.params.productCategoryId;
  logger.log(`GET PRODUCT CATEGORY WITH ID: "${productCategoryId}"`);

  try {
    const doc = await productCategoriesCollection.doc(productCategoryId).get();
    return res.status(200).json({ ...doc.data(), id: productCategoryId });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:productCategoryId", async (req, res) => {
  const productCategoryId = req.params.productCategoryId;
  logger.log(`SOFT-DELETE PRODUCT CATEGORY WITH ID: "${productCategoryId}"`);

  try {
    await productCategoriesCollection
      .doc(productCategoryId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
