const { logger } = require("firebase-functions");

const { auth, serverTimestamp, usersCollection } = require("./lib/utils");

exports.createUser = auth.user().onCreate(async (user) => {
  logger.log(`CREATE USER: `, user);

  const data = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.uid,
    roles: ["SALES", "ACCOUNTING", "PURCHASE", "INVENTORY"],
    isActive: true,
  };

  return usersCollection.doc(user.uid).set(data, { merge: true });
});
