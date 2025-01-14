exports.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "kreasindo-mitra-prima.firebaseapp.com",
  databaseURL:
    "https://kreasindo-mitra-prima-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kreasindo-mitra-prima",
  storageBucket: "kreasindo-mitra-prima.appspot.com",
  messagingSenderId: "280267916461",
  appId: "kreasindo-mitra-prima",
};

exports.REGION = "asia-southeast2";
exports.LIMIT_PER_PAGE = 20;

exports.ERROR_MESSAGE = {
  unauthorized: {
    code: 401,
    message: "Unauthorized",
  },
  invalidToken: {
    code: 405,
    message: "Invalid token",
  },
  invalidEmailPassword: {
    code: 405,
    message: "Invalid email or password",
  },
  invalidInput: {
    code: 405,
    message: "Invalid input",
  },
  invalidImage: {
    code: 405,
    message: "Invalid image",
  },
  alreadyExists: {
    code: 405,
    message: "Data already exists",
  },
};
