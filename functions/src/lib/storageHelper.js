const R = require("ramda");
const { FIREBASE_CONFIG } = require("./config");
const { storageBucket } = require("./utils");

exports.upload = async (base64, id, folder = "") => {
  const fileType = base64.match(/[^:/]\w+(?=;|,)/)[0];
  if (fileType && !R.isEmpty(fileType)) {
    const fileName = `${folder}${id}.${fileType}`;
    const file = storageBucket.file(fileName);

    const encoded = base64.replace(/^data:\w+\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(encoded, "base64");
    await file.save(fileBuffer, { public: true });
    const publicUrl = `https://storage.googleapis.com/${FIREBASE_CONFIG.storageBucket}/${fileName}`;

    return publicUrl;
  }

  return null;
};
