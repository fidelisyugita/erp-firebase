const { logger } = require("firebase-functions");
const { FIREBASE_CONFIG, ERROR_MESSAGE } = require("../src/lib/config");
const { https, usersCollection, fauth } = require("../src/lib/firebaseHelper");

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const axios = require("axios");
const R = require("ramda");

// LOGIN START
exports.login = https.onRequest(async (req, res) => {
  const { email, password } = req.body;
  logger.log(`LOGIN USING EMAIL: "${email}"`);

  if (R.isEmpty(email) || R.isEmpty(password))
    return res.status(405).json(ERROR_MESSAGE.invalidEmailPassword);

  try {
    const userCredential = await fauth.signInWithEmailAndPassword(
      fauth.getAuth(),
      email,
      password
    );
    const { uid, stsTokenManager } = userCredential.user;

    let promises = [];
    promises.push(usersCollection.doc(uid).get());
    // promises.push(admin.auth().createCustomToken(uid));
    let promisesResult = await Promise.all(promises);

    const data = {
      user: promisesResult[0].data(),
      // customToken: promisesResult[1],
      accessToken: stsTokenManager.accessToken,
      refreshToken: stsTokenManager.refreshToken,
    };
    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});
// LOGIN END

// REFRESH TOKEN START
exports.refreshToken = https.onRequest(async (req, res) => {
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
// REFRESH TOKEN END

exports.logout = https.onRequest(async (req, res) => {
  try {
    await fauth.signOut(fauth.getAuth());
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

exports.resetPassword = https.onRequest(async (req, res) => {
  const { email } = req.body;
  if (R.isEmpty(email)) return res.status(405).json(ERROR_MESSAGE.invalidInput);

  try {
    await fauth.sendPasswordResetEmail(fauth.getAuth(), email);
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});
