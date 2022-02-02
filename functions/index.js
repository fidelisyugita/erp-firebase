const { FIREBASE_CONFIG } = require("./lib/config");

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const firebase = require("firebase/app");
firebase.initializeApp(FIREBASE_CONFIG);
const auth = require("@firebase/auth");

const express = require("express");
const app = express();

const { authenticate } = require("./lib/helper");

exports.login = functions
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    const { email, password } = req.body;
    functions.logger.log(`LOGIN USING EMAIL: "${email}"`);

    if (!email || !email.length > 0 || !password || !password.length > 0)
      return res.status(405).json({ message: "Invalid email or password" });

    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        auth.getAuth(),
        email,
        password
      );
      return res.status(200).json(userCredential);
    } catch (error) {
      functions.logger.error(error.message);
      return res.status(500).json({ message: error.message });
    }
  });

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
