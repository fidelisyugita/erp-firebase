const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { ERROR_MESSAGE } = require("./config");

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
exports.authenticate = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Bearer "))
    return res.status(401).json(ERROR_MESSAGE.unauthorized);

  try {
    const idToken = authorization.split("Bearer ")[1];
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    return next();
  } catch (error) {
    logger.error(error.message);
    return res.status(401).json(ERROR_MESSAGE.unauthorized);
  }
};

exports.unseal = async (req, res, next) => {
  if (req?.headers?.seal !== "asylum")
    return res.status(401).json(ERROR_MESSAGE.unauthorized);

  return next();
};
