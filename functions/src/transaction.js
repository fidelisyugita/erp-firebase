const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/helper");
const {
  transactionsCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("./lib/utils");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET TRANSACTIONS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await transactionsCollection
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
    return res.sendStatus(500);
  }
});

app.post("/", async (req, res) => {
  try {
    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      displayName: doc.data().displayName,
    };
    logger.log(`SAVE TRANSACTION BY USER: `, user);

    const body = req?.body || {};
    let data = {
      invoiceCode: body?.invoiceCode,
      buyingPrice: Number(body?.buyingPrice || 0),
      sellingPrice: Number(body?.sellingPrice || 0),
      totalUnit: Number(body?.totalUnit || 0),
      description: body?.description,
      product: body?.product, // from product
      status: body?.status, // from transactionStatus
      type: body?.type, // from transactionType
      customer: body?.customer, // from contact
      tax: Number(body?.tax || 0), //  in percentage
      discount: Number(body?.discount || 0), //  in percentage

      invoiceCodeLowercase: String(body?.invoiceCode).toLowerCase(),

      updatedBy: user,
      updatedAt: serverTimestamp(),
    };
    logger.log(`TRANSACTION DATA: `, data);

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
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.get("/:transactionId", async (req, res) => {
  const transactionId = req.params.transactionId;
  logger.log(`GET TRANSACTION WITH ID: "${transactionId}"`);

  try {
    const doc = await transactionsCollection.doc(transactionId).get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.delete("/:transactionId", async (req, res) => {
  const transactionId = req.params.transactionId;
  logger.log(`SOFT-DELETE TRANSACTION WITH ID: "${transactionId}"`);

  try {
    await transactionsCollection
      .doc(transactionId)
      .set({ isActive: false }, { merge: true });
    return res.sendStatus(200);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

module.exports = https.onRequest(app);
