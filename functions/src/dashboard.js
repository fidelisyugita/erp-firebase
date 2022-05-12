const { logger } = require("firebase-functions");
const { isNil, isEmpty } = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const {
  transactionsCollection,
  serverTimestamp,
  increment,
  https,
  usersCollection,
  productsCollection,
} = require("./lib/firebaseHelper");
const {
  thinObject,
  thinContact,
  thinTransactionProduct,
  standarizeData,
} = require("./lib/transformHelper");

const express = require("express");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const keyword = String(req?.query?.keyword || "").toLowerCase();

  const start = req?.query?.startDate
    ? moment(req.query.startDate, "YYYY-MM-DD").toDate()
    : null;
  const end = req?.query?.endDate
    ? moment(req.query.endDate, "YYYY-MM-DD").add(1, "d").toDate()
    : null;
  const statusId = String(req?.query?.statusId || "");
  const typeId = String(req?.query?.typeId || "");

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(`GET DASHBOARD FROM: "${start}", TO: "${end}"`);

  let transactionRef = transactionsCollection.where("isActive", "==", true);

  if (!isEmpty(keyword))
    transactionRef = transactionRef
      .where("invoiceCodeLowercase", ">=", keyword)
      .where("invoiceCodeLowercase", "<=", keyword + "\uf8ff")
      .orderBy("invoiceCodeLowercase");
  else {
    if (!isEmpty(statusId))
      transactionRef = transactionRef.where("status.id", "==", statusId);
    if (!isEmpty(typeId))
      transactionRef = transactionRef.where("type.id", "==", typeId);

    if (start) transactionRef = transactionRef.where("createdAt", ">=", start);
    if (end) transactionRef = transactionRef.where("createdAt", "<", end);

    transactionRef = transactionRef.orderBy("createdAt", "desc");
  }

  try {
    const querySnapshot = await transactionRef
      // .limit(limit)
      // .offset(offset)
      .get();

    let cashOut = 0;
    let cashIn = 0;
    let soldItem = 0;
    let rejectItem = 0;
    let products = [];

    querySnapshot.docs.forEach((doc) => {
      const transaction = standarizeData(doc.data(), doc.id);
      transaction.products.forEach((p) => {
        products.push(p);
        rejectItem += p?.rejected || 0;
      });

      cashOut += transaction?.totalBuyingPrice || 0;
      cashIn += transaction?.totalSellingPrice || 0;
      soldItem += transaction?.totalItem || 0;
    });

    const result = {
      cashOut,
      cashIn,
      soldItem,
      rejectItem,
      products,
    };

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
