const { logger } = require("firebase-functions");
const R = require("ramda");
const moment = require("moment");

const { LIMIT_PER_PAGE } = require("./lib/config");
const { authenticate } = require("./lib/authHelper");
const {
  attendancesCollection,
  serverTimestamp,
  https,
  usersCollection,
} = require("./lib/firebaseHelper");
const { upload, remove } = require("./lib/storageHelper");

const express = require("express");
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
  logger.log(
    `GET ATTENDANCES WITH KEYWORD: "${keyword}", LIMIT: "${limit}", OFFSET: "${offset}"`
  );

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
    const result = querySnapshot.docs.map((doc) => {
      const data = {
        ...doc.data(),
        id: doc.id,
      };
      return data;
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});

app.post("/", async (req, res) => {
  try {
    const body = req?.body || {};
    let data = {
      isIn: body?.isIn || false,
    };
    Object.keys(data).forEach((key) => R.isNil(data[key]) && delete data[key]);
    logger.log(`ATTENDANCE DATA: `, data);

    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`SAVE ATTENDANCE BY: `, user);
    data = { ...data, updatedBy: user, updatedAt: serverTimestamp() };
    if (req?.body?.id) {
      await attendancesCollection.doc(req.body.id).set(data, { merge: true });
    } else {
      data = {
        ...data,
        isActive: true,
        createdBy: user,
        createdAt: serverTimestamp(),
      };
      const docRef = await attendancesCollection.add(data);
      data = { ...data, id: docRef.id };
    }

    if (body?.imageBase64 && data?.id) {
      logger.log("UPLOAD IMAGE FOR ATTENDANCE ID: ", data.id);
      const publicUrl = await upload(body.imageBase64, data.id, "attendance/");
      if (publicUrl) {
        data.imageUrl = publicUrl;
        await attendancesCollection
          .doc(data.id)
          .set({ imageUrl: publicUrl }, { merge: true });
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json(error);
  }
});
app.put("/approve/attendanceId", async (req, res) => {
  const attendanceId = req.params.attendanceId;
  logger.log(`APPROVE ATTENDANCE WITH ID: "${attendanceId}"`);
  try {
    const doc = await usersCollection.doc(req.user.uid).get();
    const user = {
      id: req.user.uid,
      email: req.user.email,
      name: doc.data().name || "-",
    };
    logger.log(`ATTENDANCE APPROVED BY: `, user);
    data = {
      ...data,
      imageUrl: null,
      approvedBy: user,
      approvedAt: serverTimestamp(),
    };
    await attendancesCollection.doc(req.body.id).update(data);

    await remove(data.id, "attendance/");

    return res.status(200).json(data);
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
    return res.status(200).json({ ...doc.data(), id: attendanceId });
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
