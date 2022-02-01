const config = require("./config");

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const firebase = require("firebase/app");
firebase.initializeApp(config.FIREBASE_CONFIG);
const auth = require("@firebase/auth");

const express = require("express");
const app = express();

exports.login = functions
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    const { email, password } = req.body;
    functions.logger.log(`LOGIN USING EMAIL: "${email}"`);

    if (!email || !email.length > 0 || !password || !password.length > 0) {
      return res.sendStatus(405);
    }

    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        auth.getAuth(),
        email,
        password
      );
      return res.status(200).json(userCredential.user);
    } catch (error) {
      functions.logger.error(error.message);
      return res.status(500).json({ message: error.message });
    }
  });

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const authenticate = async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    functions.logger.log(`authenticate decodedIdToken:`, decodedIdToken);
    req.user = decodedIdToken;
    return next();
  } catch (error) {
    functions.logger.error(error.message);
    return res.status(500).json({ message: "Invalid token" });
  }
};

app.use(authenticate);

// GET /message/{messageId}
// Get details about a message
app.get("/message/:messageId", async (req, res) => {
  const messageId = req.params.messageId;
  functions.logger.log(`LOOKING UP MESSAGE: "${messageId}"`);

  try {
    const uid = req.user.uid;
    const snapshot = await admin
      .database()
      .ref(`/users/${uid}/messages/${messageId}`)
      .once("value");

    return res.status(200).json(snapshot.val());
  } catch (error) {
    functions.logger.error(error.message);
    return res.sendStatus(500);
  }
});

// Expose the API as a function
exports.api = functions.region("asia-southeast2").https.onRequest(app);
