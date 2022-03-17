const { logger } = require("firebase-functions");
const { isEmpty } = require("ramda");

const { LIMIT_PER_PAGE } = require("../lib/config");
const { authenticate } = require("../lib/authHelper");
const { productsCollection, https } = require("../lib/firebaseHelper");
const { standarizeData, thinObject } = require("../lib/transformHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(
    `GET VARIANT PRODUCTS WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
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

    const result = [];
    querySnapshot.docs.forEach((doc) => {
      const data = standarizeData(doc.data(), doc.id);
      data.variants.forEach((variant) => {
        result.push({
          ...variant,
          category: thinObject(data?.category),
          brand: thinObject(data?.brand),
          name: data?.name,
          color: data?.color,
          measureUnit: thinObject(data?.measureUnit),
          note: data?.note,
          imageUrl: data?.imageUrl,
        });
      });
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
