const { logger } = require("firebase-functions");
const R = require("ramda");

const { LIMIT_PER_PAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  transactionTypesCollection,
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
    `GET TRANSACTION TYPES WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await transactionTypesCollection
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
    logger.log(`TRANSACTION TYPE DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE TRANSACTION TYPE BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await transactionTypesCollection
        .doc(req.body.id)
        .set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await transactionTypesCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:transactionTypeId", async (req, res) => {
  const transactionTypeId = req.params.transactionTypeId;
  logger.log(`GET TRANSACTION TYPE WITH ID: "${transactionTypeId}"`);

  try {
    const doc = await transactionTypesCollection.doc(transactionTypeId).get();
    return res.status(200).json({ ...doc.data(), id: transactionTypeId });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:transactionTypeId", async (req, res) => {
  const transactionTypeId = req.params.transactionTypeId;
  logger.log(`SOFT-DELETE TRANSACTION TYPE WITH ID: "${transactionTypeId}"`);

  try {
    await transactionTypesCollection
      .doc(transactionTypeId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
