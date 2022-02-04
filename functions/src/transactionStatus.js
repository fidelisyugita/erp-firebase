const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/helper");
const {
  transactionStatusesCollection,
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
    `GET TRANSACTION STATUSES WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await transactionStatusesCollection
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
    logger.log(`SAVE TRANSACTION STATUS BY USER: `, user);

    const body = req?.body || {};
    let data = {
      name: body?.name,
      description: body?.description,

      nameLowercase: String(body?.name).toLowerCase(),

      updatedBy: user,
      updatedAt: serverTimestamp(),
    };
    logger.log(`TRANSACTION STATUS DATA: `, data);

    if (req?.body?.id) {
      await transactionStatusesCollection
        .doc(req.body.id)
        .set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await transactionStatusesCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.get("/:transactionStatusId", async (req, res) => {
  const transactionStatusId = req.params.transactionStatusId;
  logger.log(`GET TRANSACTION STATUS WITH ID: "${transactionStatusId}"`);

  try {
    const doc = await transactionStatusesCollection
      .doc(transactionStatusId)
      .get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.delete("/:transactionStatusId", async (req, res) => {
  const transactionStatusId = req.params.transactionStatusId;
  logger.log(
    `SOFT-DELETE TRANSACTION STATUS WITH ID: "${transactionStatusId}"`
  );

  try {
    await transactionStatusesCollection
      .doc(transactionStatusId)
      .set({ isActive: false }, { merge: true });
    return res.sendStatus(200);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

module.exports = https.onRequest(app);
