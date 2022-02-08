const auto = require("./src/auto");
const auth = require("./src/auth");

const user = require("./src/user");
const contact = require("./src/contact");
const measureUnit = require("./src/measureUnit");
const productCategory = require("./src/productCategory");
const product = require("./src/product");
const transactionStatus = require("./src/transactionStatus");
const transactionType = require("./src/transactionType");
const transaction = require("./src/transaction");

// STATIC START
const express = require("express");
const { https } = require("./src/lib/utils");
const app = express();
app.use("/assets", express.static("src/assets"));
exports.static = https.onRequest(app);
// STATIC END

// Expose the API as a function
exports.auto = auto;
exports.auth = auth;

exports.user = user;
exports.contact = contact;
exports.measureUnit = measureUnit;
exports.productCategory = productCategory;
exports.product = product;
exports.transactionStatus = transactionStatus;
exports.transactionType = transactionType;
exports.transaction = transaction;
