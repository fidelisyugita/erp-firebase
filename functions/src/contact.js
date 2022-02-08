const { logger } = require("firebase-functions");

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/helper");
const {
  contactsCollection,
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
    `GET CONTACTS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await contactsCollection
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
    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      displayName: doc.data().displayName,
    };
    logger.log(`SAVE CONTACT BY USER: `, user);

    const body = req?.body || {};
    let data = {
      name: body?.name,
      email: body?.email,
      alias: body?.alias,
      phone: body?.phone,
      address: body?.address,
      description: body?.description,
      department: body?.department,

      nameLowercase: String(body?.name).toLowerCase(),

      updatedBy: user,
      updatedAt: serverTimestamp(),
    };
    logger.log(`CONTACT DATA: `, data);

    if (req?.body?.id) {
      await contactsCollection.doc(req.body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await contactsCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:contactId", async (req, res) => {
  const contactId = req.params.contactId;
  logger.log(`GET CONTACT WITH ID: "${contactId}"`);

  try {
    const doc = await contactsCollection.doc(contactId).get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:contactId", async (req, res) => {
  const contactId = req.params.contactId;
  logger.log(`SOFT-DELETE CONTACT WITH ID: "${contactId}"`);

  try {
    await contactsCollection
      .doc(contactId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ id: contactId });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
