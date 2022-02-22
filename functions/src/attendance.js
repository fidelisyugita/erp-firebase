const { logger } = require("firebase-functions");
const { isEmpty, isNil } = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE, ERROR_MESSAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const {
  attendancesCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("./lib/firebaseHelper");
const { upload, remove } = require("./lib/storageHelper");
const { standarizeData } = require("./lib/transformHelper");

const express = require("express");
const { isSameDay } = require("./lib/utils");
const app = express();
app.use(authenticate);

app.get("/", async (req, res) => {
  const start = req?.query?.startDate
    ? moment(req.query.startDate, "YYYY-MM-DD").toDate()
    : null;
  const end = req?.query?.endDate
    ? moment(req.query.endDate, "YYYY-MM-DD").add(1, "d").toDate()
    : null;

  const limit = Number(req?.query?.limit || LIMIT_PER_PAGE);
  const offset = req?.query?.page ? limit * Number(req.query.page) : 0;
  logger.log(`GET ATTENDANCES LIMIT: "${limit}", OFFSET: "${offset}"`);

  let attendanceRef = attendancesCollection;
  if (start)
    attendanceRef = attendancesCollection.where("createdAt", ">", start);
  if (end) attendanceRef = attendancesCollection.where("createdAt", "<", end);

  try {
    const querySnapshot = await attendanceRef
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .get();
    const result = querySnapshot.docs.map((doc) =>
      standarizeData(doc.data(), doc.id)
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/", async (req, res) => {
  try {
    const body = req?.body || {};
    if (isNil(body.imageBase64) || isEmpty(body.imageBase64))
      return res.status(405).json(ERROR_MESSAGE.invalidImage);

    let data = {
      isIn: body?.isIn || false,
    };
    Object.keys(data).forEach((key) => isNil(data[key]) && delete data[key]);
    logger.log(`ATTENDANCE DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE ATTENDANCE BY: `, user);

    const lastAttend = doc.data()?.lastAttend;
    if (lastAttend && isSameDay(lastAttend.toDate(), new Date()))
      return res.status(200).json({ ok: true, message: "Already Attend" });

    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };

    const aId = body?.id || `aId${new Date().getTime()}`;

    logger.log("UPLOAD IMAGE FOR ATTENDANCE ID: ", aId);
    const publicUrl = await upload(body.imageBase64, aId, "attendances/");
    if (publicUrl) data.imageUrl = publicUrl;

    if (body?.id) {
      await attendancesCollection.doc(body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };

      const promises = [];
      promises.push(attendancesCollection.doc(aId).set(data));
      promises.push(
        usersCollection
          .doc(user.id)
          .set({ lastAttend: data.createdAt }, { merge: true })
      );
      await Promise.all(promises);
      data = { ...data, id: aId };
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.put("/approve/:attendanceId", async (req, res) => {
  const attendanceId = req.params.attendanceId;
  logger.log(`APPROVE ATTENDANCE WITH ID: "${attendanceId}"`);
  try {
    const userDoc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: userDoc.data().name || "-",
    };
    logger.log(`ATTENDANCE APPROVED BY: `, user);

    const doc = await attendancesCollection.doc(attendanceId).get();
    const data = {
      imageUrl: null,
      approvedBy: user,
      approvedAt: serverTimestamp(),
    };
    const promises = [];
    promises.push(attendancesCollection.doc(attendanceId).update(data));
    promises.push(remove(doc.data()?.imageUrl));
    await Promise.all(promises);

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.get("/:attendanceId", async (req, res) => {
  const attendanceId = req.params.attendanceId;
  logger.log(`GET ATTENDANCE WITH ID: "${attendanceId}"`);

  try {
    const doc = await attendancesCollection.doc(attendanceId).get();
    return res.status(200).json(standarizeData(doc.data(), attendanceId));
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.delete("/:attendanceId", async (req, res) => {
  const attendanceId = req.params.attendanceId;
  logger.log(`SOFT-DELETE ATTENDANCE WITH ID: "${attendanceId}"`);

  try {
    await attendancesCollection
      .doc(attendanceId)
      .set({ isActive: false }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

module.exports = https.onRequest(app);
