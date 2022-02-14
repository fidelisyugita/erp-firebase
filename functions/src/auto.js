const { logger } = require("firebase-functions");

const {
  authFunctions,
  serverTimestamp,
  usersCollection,
} = require("./lib/utils");

exports.createUser = authFunctions.user().onCreate(async (user) => {
  logger.log(`CREATE USER: `, user);

  const data = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    phone: user.phoneNumber,
    imageUrl: user.photoURL,
    name: user.displayName,
    email: user.email,
    id: user.uid,
    roles: ["SALES", "ACCOUNTING", "PURCHASE", "INVENTORY"],
    isActive: true,

    nameLowercase: String(body?.displayName).toLowerCase(),
  };

  return usersCollection.doc(user.uid).set(data, { merge: true });
});
