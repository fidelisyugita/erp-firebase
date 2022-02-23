const { logger } = require("firebase-functions");

const { https, configDoc, inventoryDoc } = require("./lib/firebaseHelper");
const { unseal } = require("./lib/authHelper");

const express = require("express");
const app = express();
app.use(unseal);

app.get("/config", async (req, res) => {
  try {
    const doc = await configDoc.get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/inventory", async (req, res) => {
  try {
    const doc = await inventoryDoc.get();
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
