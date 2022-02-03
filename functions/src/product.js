const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/helper");
const {
  productsCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("./lib/utils");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.body?.keyword || "").toLowerCase();

  const limit = Number(req?.body?.limit || LIMIT_PER_PAGE);
  const offset = req?.body?.page ? limit * Number(req.body.page) : 0;
  logger.log(
    `GET PRODUCTS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await productsCollection
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
    logger.log(`SAVE PRODUCT BY USER: `, user);

    const body = req?.body || {};
    let data = {
      sku: body?.sku,
      name: body?.name,
      barcode: body?.barcode,
      stock: Number(body?.stock || 0),
      category: body?.category,
      buyingPrice: Number(body?.buyingPrice || 0),
      sellingPrice: Number(body?.sellingPrice || 0),
      description: body?.description,
      totalSold: Number(body?.totalSold || 0),
      imageUrl: body?.imageUrl,
      measureUnit: body?.measureUnit,

      nameLowercase: String(body?.name).toLowerCase(),

      updatedBy: user,
      updatedAt: serverTimestamp(),
    };
    logger.log(`PRODUCT DATA: `, data);

    if (req?.body?.id) {
      await productsCollection.doc(req.body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await productsCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.get("/:productId", async (req, res) => {
  const productId = req.params.productId;
  logger.log(`GET PRODUCT WITH ID: "${productId}"`);

  try {
    const doc = await productsCollection.doc(productId).get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

module.exports = https.onRequest(app);
