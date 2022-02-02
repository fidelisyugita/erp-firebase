const functions = require("firebase-functions");
const admin = require("firebase-admin");
// if (!admin.apps.length) admin.initializeApp();

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
exports.authenticate = async (req, res, next) => {
  const { authorization } = req.headers;
  functions.logger.log(`authenticate authorization: "${authorization}"`);
  if (!authorization || !authorization.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  try {
    const idToken = authorization.split("Bearer ")[1];
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    functions.logger.log(`authenticate decodedIdToken:`, decodedIdToken);
    req.user = decodedIdToken;
    return next();
  } catch (error) {
    functions.logger.error(error.message);
    return res.status(500).json({ message: "Invalid token" });
  }
};
