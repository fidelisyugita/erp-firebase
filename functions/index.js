const { logger } = require("firebase-functions");
const { FIREBASE_CONFIG } = require("./src/lib/config");
const firebase = require("firebase/app");
firebase.initializeApp(FIREBASE_CONFIG);
const { signInWithEmailAndPassword, getAuth } = require("@firebase/auth");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const R = require("ramda");

const { https, usersCollection } = require("./src/lib/utils");

const auto = require("./src/auto");
const contact = require("./src/contact");
const measureUnit = require("./src/measureUnit");
const productCategory = require("./src/productCategory");
const product = require("./src/product");
const transactionStatus = require("./src/transactionStatus");
const transactionType = require("./src/transactionType");
const transaction = require("./src/transaction");

// Expose the API as a function
exports.auto = auto;
exports.contact = contact;
exports.measureUnit = measureUnit;
exports.productCategory = productCategory;
exports.product = product;
exports.transactionStatus = transactionStatus;
exports.transactionType = transactionType;
exports.transaction = transaction;

// LOGIN START
exports.login = https.onRequest(async (req, res) => {
  const { email, password } = req.body;
  logger.log(`LOGIN USING EMAIL: "${email}"`);

  if (R.isEmpty(email) || R.isEmpty(password))
    return res.status(405).json({ message: "Invalid email or password" });

  try {
    const userCredential = await signInWithEmailAndPassword(
      getAuth(),
      email,
      password
    );
    const userDoc = await usersCollection.doc(userCredential.user.uid).get();

    // const customToken = await admin
    //   .auth()
    //   .createCustomToken(userCredential.user.uid);

    const data = {
      user: userDoc.data(),
      accessToken: await userCredential.user.getIdToken(),
      // customToken: customToken,
    };
    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ message: error.message });
  }
});
// LOGIN END
