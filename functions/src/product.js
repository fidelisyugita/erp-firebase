const { logger } = require("firebase-functions");
const R = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const {
  productsCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("./lib/utils");
const { createPdfBinary } = require("./lib/pdfHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
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
    return res.status(500).json(error);
  }
});

app.get("/getByCategory", async (req, res) => {
  const categoryId = String(req?.query?.categoryId || "");
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET PRODUCTS BY CATEGORY: "${categoryId}", WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    const querySnapshot = await productsCollection
      .where("category.id", "==", categoryId)
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

      skuLowercase: String(body?.sku).toLowerCase(),
      nameLowercase: String(body?.name).toLowerCase(),
    };
    Object.keys(data).forEach((key) => R.isNil(data[key]) && delete data[key]);
    logger.log(`PRODUCT DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE PRODUCT BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
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
    return res.status(500).json(error);
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
    return res.status(500).json(error);
  }
});

app.delete("/:productId", async (req, res) => {
  const productId = req.params.productId;
  logger.log(`SOFT-DELETE PRODUCT WITH ID: "${productId}"`);

  try {
    await productsCollection
      .doc(productId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/pdf/:productId", async (req, res) => {
  const productId = req.params.productId;
  logger.log(`GENERATE PDF FOR PRODUCT WITH ID: "${productId}"`);
  try {
    const doc = await productsCollection.doc(productId).get();
    const product = doc.data();

    const docDefinition = {
      content: [
        product.name || "No Name",
        "First paragraph",
        "Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
      ],
    };

    createPdfBinary(docDefinition, (pdf) => {
      return res
        .status(200)
        .contentType("application/pdf")
        .attachment(
          `Produk: ${product.name} - ${moment().format("D MMM YYYY")}.pdf`
        )
        .end(pdf);
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
