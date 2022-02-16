const { logger } = require("firebase-functions");
const R = require("ramda");

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const {
  usersCollection,
  serverTimestamp,
  https,
} = require("./lib/firebaseHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET USERS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await usersCollection
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

app.get("/getProfile", async (req, res) => {
  logger.log(`GET PROFILE WITH ID: "${req.user.uid}"`);

  try {
    const doc = await usersCollection.doc(req.user.uid).get();
    return res.status(200).json({ ...doc.data(), id: req.user.uid });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.put("/", async (req, res) => {
  try {
    const body = req?.body || {};
    let data = {
      phone: body?.phone,
      imageUrl: body?.imageUrl,
      name: body?.name,
      // email: body?.email,
      roles: body?.roles,
      address: body?.address,
      description: body?.description,

      nameLowercase: String(body?.name).toLowerCase(),
    };
    Object.keys(data).forEach((key) => R.isNil(data[key]) && delete data[key]);
    logger.log(`USER DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`UPDATE USER BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await usersCollection.doc(req.body.id).set(data, { merge: true });
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  logger.log(`GET USER WITH ID: "${userId}"`);

  try {
    const doc = await usersCollection.doc(userId).get();
    return res.status(200).json({ ...doc.data(), id: userId });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:userId", async (req, res) => {
  const userId = req.params.userId;
  logger.log(`SOFT-DELETE USER WITH ID: "${userId}"`);

  try {
    await usersCollection.doc(userId).set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
