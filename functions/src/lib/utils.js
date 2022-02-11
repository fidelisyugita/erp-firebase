const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { REGION, FIREBASE_CONFIG } = require("./config");

const runtimeOpts = {
  timeoutSeconds: 30,
  // memory: '1GB'
};
const { https, auth } = functions.region(REGION).runWith(runtimeOpts);
const { firestore, storage } = admin;
const { arrayUnion, arrayRemove, serverTimestamp, increment } =
  firestore.FieldValue;

const storageBucket = storage().bucket(FIREBASE_CONFIG.storageBucket);

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

  storageBucket,

  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,

  measureUnitsCollection,
  productCategoriesCollection,
  transactionStatusesCollection,
  transactionTypesCollection,

  usersCollection,
  contactsCollection,
  productsCollection,
  transactionsCollection,
};
