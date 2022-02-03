const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { REGION } = require("./config");

const runtimeOpts = {
  timeoutSeconds: 30,
  // memory: '1GB'
};
const { https, auth } = functions.region(REGION).runWith(runtimeOpts);
const { firestore } = admin;
const { arrayUnion, arrayRemove, serverTimestamp } = firestore.FieldValue;

// MASTER START
const measureUnitsCollection = firestore().collection("measureUnits");
const productCategoriesCollection = firestore().collection("productCategories");
const transactionStatusesCollection = firestore().collection(
  "transactionStatuses"
);
const transactionTypesCollection = firestore().collection("transactionTypes");
// MASTER END

const usersCollection = firestore().collection("users");
const contactsCollection = firestore().collection("contacts");
const productsCollection = firestore().collection("products");
const transactionsCollection = firestore().collection("transactions");

module.exports = {
  https,
  auth,

  arrayUnion,
  arrayRemove,
  serverTimestamp,

  measureUnitsCollection,
  productCategoriesCollection,
  transactionStatusesCollection,
  transactionTypesCollection,

  usersCollection,
  contactsCollection,
  productsCollection,
  transactionsCollection,
};
