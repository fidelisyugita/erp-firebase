const { logger } = require("firebase-functions");
const {
  getAuth,
  signInWithCustomToken,
  signOut,
  sendPasswordResetEmail,
} = require("@firebase/auth");
const axios = require("axios");
const R = require("ramda");

const { FIREBASE_CONFIG, ERROR_MESSAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const { https } = require("./lib/utils");

const express = require("express");
const app = express();
app.use(authenticate);

app.post("/refreshToken", async (req, res) => {
  const { refreshToken, customToken } = req.body;
  try {
    if (refreshToken && !R.isEmpty(refreshToken)) {
      const response = await axios({
        method: "post",
        url: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,
        data: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
      });
      const data = {
        newAccessToken: response.data.id_token,
        newRefreshToken: response.data.refresh_token,
      };
      return res.status(200).json(data);
    }

    // if (customToken && !R.isEmpty(customToken)) {
    //   const userCredential = await signInWithCustomToken(
    //     getAuth(),
    //     customToken
    //   );
    //   const { stsTokenManager } = userCredential.user;
    //   const data = {
    //     newAccessToken: stsTokenManager.accessToken,
    //     newRefreshToken: stsTokenManager.refreshToken,
    //   };
    //   return res.status(200).json(data);
    // }

    return res.status(405).json(ERROR_MESSAGE.invalidToken);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/logout", async (req, res) => {
  try {
    await signOut(getAuth());
    return res.status(200).json({ id: req.user.uid });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/resetPassword", async (req, res) => {
  try {
    await sendPasswordResetEmail(getAuth(), req.user.email);
    return res.status(200).json({ id: req.user.uid, email: req.user.email });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
