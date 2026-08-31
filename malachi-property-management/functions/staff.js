// functions/staff.js
// Multi-staff accounts (DEC-5): an Owner can invite additional logins under
// their company. Staff creation/removal must happen server-side (Admin SDK)
// because a client can never be trusted to create its own users/{uid} doc
// pointing at someone else's company — firestore.rules only lets a user
// create their OWN record with companyId == their own uid (the signup
// shape). This is the "separate, trusted (server-side) operation" that
// company.js's comment already anticipated.

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { sendEmail } = require("./email");
const { underDailyLimit } = require("./costGuard");

const DAILY_INVITES_PER_COMPANY = 10;

async function requireOwner(db, uid) {
  const snap = await db.doc(`users/${uid}`).get();
  const record = snap.exists ? snap.data() : null;
  if (!record || record.role !== "owner") {
    throw new HttpsError("permission-denied", "Only the company owner can manage staff.");
  }
  return record;
}

async function inviteStaff(db, callerUid, { email, name }) {
  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  const owner = await requireOwner(db, callerUid);
  const companyId = owner.companyId;

  if (!(await underDailyLimit(`invite_${companyId}`, DAILY_INVITES_PER_COMPANY))) {
    throw new HttpsError("resource-exhausted", `You can invite up to ${DAILY_INVITES_PER_COMPANY} staff per day — try again tomorrow.`);
  }

  let alreadyExists = true;
  try {
    await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") alreadyExists = false;
    else throw err;
  }
  if (alreadyExists) {
    throw new HttpsError("already-exists", "That email already has an account — it can't be added as a new staff login.");
  }

  const userRecord = await admin.auth().createUser({ email, emailVerified: false });
  const uid = userRecord.uid;

  await db.doc(`users/${uid}`).set({
    companyId,
    role: "staff",
    name: name || email,
    email,
    invitedBy: callerUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.doc(`companies/${companyId}/staff/${uid}`).set({
    name: name || email,
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const companySnap = await db.doc(`companies/${companyId}`).get();
  const companyName = companySnap.data()?.name || "your company";
  const resetLink = await admin.auth().generatePasswordResetLink(email);

  await sendEmail({
    to: email,
    subject: `You've been added to ${companyName} on Malachi`,
    html: `<p>You've been added as a staff member on <b>${companyName}</b>'s Malachi Property Management workspace.</p>
           <p>Set your password to sign in:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>`,
  });

  return { uid };
}

async function removeStaffMember(db, callerUid, { staffUid }) {
  if (!staffUid) throw new HttpsError("invalid-argument", "Missing staffUid.");
  const owner = await requireOwner(db, callerUid);

  const staffSnap = await db.doc(`users/${staffUid}`).get();
  const staffRecord = staffSnap.exists ? staffSnap.data() : null;
  if (!staffRecord || staffRecord.companyId !== owner.companyId || staffRecord.role !== "staff") {
    throw new HttpsError("not-found", "No staff member found with that id in your company.");
  }

  await db.doc(`users/${staffUid}`).delete();
  await db.doc(`companies/${owner.companyId}/staff/${staffUid}`).delete();
  await admin.auth().updateUser(staffUid, { disabled: true }).catch(() => {});

  return { ok: true };
}

module.exports = { inviteStaff, removeStaffMember };
