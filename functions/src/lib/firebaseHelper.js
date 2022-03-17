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

const db = firestore();
db.settings({ ignoreUndefinedProperties: true });
// MASTER START
const configDoc = db.collection("master").doc("config");
const inventoryDoc = db.collection("master").doc("inventory");

const brandsCollection = db.collection("brands");
const measureUnitsCollection = db.collection("measureUnits");
const productCategoriesCollection = db.collection("productCategories");
const transactionStatusesCollection = db.collection("transactionStatuses");
const transactionTypesCollection = db.collection("transactionTypes");
const buyingStatusesCollection = db.collection("buyingStatuses");
const buyingTypesCollection = db.collection("buyingTypes");
// MASTER END

const usersCollection = db.collection("users");
const contactsCollection = db.collection("contacts");
const attendancesCollection = db.collection("attendances");

const productsCollection = db.collection("products");
const transactionsCollection = db.collection("transactions");
const buyingsCollection = db.collection("buyings");

module.exports = {
  https,
  authFunctions: auth,

  storageBucket,

  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,

  configDoc,
  inventoryDoc,

  brandsCollection,
  measureUnitsCollection,
  productCategoriesCollection,
  transactionStatusesCollection,
  transactionTypesCollection,
  buyingStatusesCollection,
  buyingTypesCollection,

  usersCollection,
  contactsCollection,
  attendancesCollection,

  productsCollection,
  transactionsCollection,
  buyingsCollection,

  fauth,
};
