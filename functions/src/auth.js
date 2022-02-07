const { logger } = require("firebase-functions");
const {
  getAuth,
  signInWithCustomToken,
  signOut,
  sendPasswordResetEmail,
} = require("@firebase/auth");
const axios = require("axios");
const R = require("ramda");

const { FIREBASE_CONFIG } = require("./lib/config");
const { authenticate } = require("./lib/helper");
const { https } = require("./lib/utils");

const express = require("express");
const app = express();
app.use(authenticate);

app.post("/refreshToken", async (req, res) => {
  const { refreshToken, customToken } = req.body;
  try {
    if (!R.isEmpty(refreshToken)) {
      const newToken = axios({
        method: "post",
        url: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,
        data: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
      });
      logger.log(`refreshToken newToken: `, newToken);
      const data = {
        newAccessToken: newToken.id_token,
        newRefreshToken: newToken.refresh_token,
      };
      return res.status(200).json(data);
    }

    if (!R.isEmpty(customToken)) {
      const userCredential = await signInWithCustomToken(
        getAuth(),
        customToken
      );
      const { stsTokenManager } = userCredential.user;
      const data = {
        newAccessToken: stsTokenManager.accessToken,
        newRefreshToken: stsTokenManager.refreshToken,
      };
      return res.status(200).json(data);
    }

    return res.sendStatus(405);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.post("/logout", async (req, res) => {
  try {
    await signOut(getAuth());
    return res.sendStatus(200);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

app.post("/resetPassword", async (req, res) => {
  try {
    await sendPasswordResetEmail(getAuth(), req.user.email);
    return res.sendStatus(200);
  } catch (error) {
    logger.error(error.message);
    return res.sendStatus(500);
  }
});

module.exports = https.onRequest(app);
