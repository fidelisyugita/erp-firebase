const { logger } = require("firebase-functions");
const R = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const {
  productsCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("../lib/firebaseHelper");
const { generatePdfProduct } = require("../lib/pdfHelper");
const { upload } = require("../lib/storageHelper");
const { thinObject, standarizeData } = require("../lib/transformHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const categoryId = String(req?.query?.categoryId || "");
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET PRODUCTS BY CATEGORY: "${categoryId}", WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

  try {
    let productRef = productsCollection;
    if (!R.isEmpty(categoryId))
      productRef = productsCollection.where("category.id", "==", categoryId);

    const querySnapshot = await productRef
      .where("isActive", "==", true)
      .where("nameLowercase", ">=", keyword)
      .where("nameLowercase", "<=", keyword + "\uf8ff")
      .orderBy("nameLowercase")
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
    let data = {
      sku: body?.sku,
      name: body?.name,
      size: body?.size,
      barcode: `P-${new Date().getTime()}`,
      stock: Number(body?.stock || 0),
      category: thinObject(body?.category),
      buyingPrice: Number(body?.buyingPrice || 0),
      sellingPrice: Number(body?.sellingPrice || 0),
      description: body?.description,
      totalSold: Number(body?.totalSold || 0),
      measureUnit: thinObject(body?.measureUnit),
      brand: thinObject(body?.brand),

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

    if (body?.imageBase64 && data?.id) {
      logger.log("UPLOAD IMAGE FOR PRODUCT ID: ", data.id);
      const publicUrl = await upload(body.imageBase64, data.id, "products/");
      if (publicUrl) {
        data.imageUrl = publicUrl;
        await productsCollection
          .doc(data.id)
          .set({ imageUrl: publicUrl }, { merge: true });
      }
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
    return res.status(200).json(standarizeData(doc.data(), productId));
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
    if (!doc.exists) return res.status(405).json(ERROR_MESSAGE.invalidInput);

    const product = { ...doc.data(), id: doc.id };

    generatePdfProduct(product, (pdf) => {
      return res
        .status(200)
        .contentType("application/pdf")
        .attachment(`${product.name} - ${moment().format("D MMM YYYY")}.pdf`)
        .end(pdf);
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
