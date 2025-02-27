const master = require("./src/master");

const auto = require("./src/auto");
const auth = require("./src/auth");

const user = require("./src/user");
const contact = require("./src/contact");
const attendance = require("./src/attendance");
const dashboard = require("./src/dashboard");

const brand = require("./src/product/brand");
const measureUnit = require("./src/product/measureUnit");
const productCategory = require("./src/product/productCategory");
const transactionStatus = require("./src/transaction/transactionStatus");
const transactionType = require("./src/transaction/transactionType");
const buyingStatus = require("./src/buying/buyingStatus");
const buyingType = require("./src/buying/buyingType");

const product = require("./src/product/product");
const productVariant = require("./src/product/productVariant");
const transaction = require("./src/transaction/transaction");
const buying = require("./src/buying/buying");

// Expose the API as a function
exports.master = master;

exports.auto = auto;
exports.auth = auth;

exports.user = user;
exports.contact = contact;
exports.attendance = attendance;
exports.dashboard = dashboard;

exports.brand = brand;
exports.measureUnit = measureUnit;
exports.productCategory = productCategory;
exports.transactionStatus = transactionStatus;
exports.transactionType = transactionType;
exports.buyingStatus = buyingStatus;
exports.buyingType = buyingType;

exports.product = product;
exports.productVariant = productVariant;
exports.transaction = transaction;
exports.buying = buying;
