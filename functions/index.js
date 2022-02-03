const { logger } = require("firebase-functions");
const { FIREBASE_CONFIG } = require("./src/lib/config");
const firebase = require("firebase/app");
firebase.initializeApp(FIREBASE_CONFIG);
const auth = require("@firebase/auth");

const { https } = require("./src/lib/utils");

const auto = require("./src/auto");
const contact = require("./src/contact");
const measureUnit = require("./src/measureUnit");
const productCategory = require("./src/productCategory");
const product = require("./src/product");

// Expose the API as a function
exports.auto = auto;
exports.contact = contact;
exports.measureUnit = measureUnit;
exports.productCategory = productCategory;
exports.product = product;

// LOGIN START
exports.login = https.onRequest(async (req, res) => {
  const { email, password } = req.body;
  logger.log(`LOGIN USING EMAIL: "${email}"`);

  if (!email || !email.length > 0 || !password || !password.length > 0)
    return res.status(405).json({ message: "Invalid email or password" });

  try {
    const userCredential = await auth.signInWithEmailAndPassword(
      auth.getAuth(),
      email,
      password
    );
    return res.status(200).json(userCredential.user);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ message: error.message });
  }
});
// LOGIN END
