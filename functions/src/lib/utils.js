const functions = require("firebase-functions");
const { REGION, FIREBASE_CONFIG } = require("./config");

const firebase = require("firebase/app");
firebase.initializeApp(FIREBASE_CONFIG);

const fauth = require("firebase/auth");

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

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
const buyingStatusesCollection = firestore().collection("buyingStatuses");
const buyingTypesCollection = firestore().collection("buyingTypes");
// MASTER END

const usersCollection = firestore().collection("users");
const contactsCollection = firestore().collection("contacts");
const productsCollection = firestore().collection("products");
const transactionsCollection = firestore().collection("transactions");
const buyingsCollection = firestore().collection("buyings");

module.exports = {
  https,
  authFunctions: auth,

  storageBucket,

  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,

  measureUnitsCollection,
  productCategoriesCollection,
  transactionStatusesCollection,
  transactionTypesCollection,
  buyingStatusesCollection,
  buyingTypesCollection,

  usersCollection,
  contactsCollection,
  productsCollection,
  transactionsCollection,
  buyingsCollection,

  fauth,
};
