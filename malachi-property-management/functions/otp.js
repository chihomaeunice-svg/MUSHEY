// functions/otp.js
// Email verification for new signups: a 6-digit code is emailed to the new
// company's contact address, and every superAdmin is notified that a new
// company registered. The code itself is never written anywhere the client
// can read — it lives only in otpVerifications/{companyId}, a collection
// firestore.rules denies to clients entirely — otherwise the very person
// it's meant to verify could just read it out of Firestore instead of
// checking their email.

const crypto = require("crypto");
const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { sendEmail } = require("./email");

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function notifySuperAdmins(db, company) {
  const snap = await db.collection("users").where("role", "==", "superAdmin").get();
  const emails = snap.docs.map((d) => d.data().email).filter(Boolean);
  if (emails.length === 0) return;

  await Promise.all(emails.map((to) => sendEmail({
    to,
    subject: `New company registered — ${company.name || "Unnamed company"}`,
    html: `<p>A new company has registered on Malachi.</p>
           <p><b>Company:</b> ${company.name || "—"}<br/>
           <b>Contact:</b> ${company.contactEmail || "—"}${company.phone ? ` · ${company.phone}` : ""}<br/>
           <b>TIN:</b> ${company.tin || "—"}</p>`,
  })));
}

/** Fires on company creation: emails the OTP to the new company, and notifies superAdmins. */
async function onCompanyCreated(db, companyId, company) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.doc(`otpVerifications/${companyId}`).set({
    code,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    attempts: 0,
    verified: false,
    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (company.contactEmail) {
    await sendEmail({
      to: company.contactEmail,
      subject: "Verify your email — Malachi",
      html: `<p>Welcome to Malachi. Your verification code is:</p>
             <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
             <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    });
  }

  await notifySuperAdmins(db, company);
}

/** Callable: { companyId, code } -> marks the company verified if the code matches. */
async function verifyEmailOtp(db, uid, { companyId, code }) {
  if (uid !== companyId) throw new HttpsError("permission-denied", "You can only verify your own company.");
  if (!code) throw new HttpsError("invalid-argument", "Missing code.");

  const ref = db.doc(`otpVerifications/${companyId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "No pending verification — request a new code.");

  const data = snap.data();
  if (data.verified) return { verified: true };
  if (data.expiresAt.toDate() < new Date()) {
    throw new HttpsError("deadline-exceeded", "That code has expired — request a new one.");
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    throw new HttpsError("resource-exhausted", "Too many incorrect attempts — request a new code.");
  }
  if (data.code !== String(code).trim()) {
    await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new HttpsError("invalid-argument", "Incorrect code.");
  }

  await ref.update({ verified: true });
  await db.doc(`companies/${companyId}`).update({ emailVerified: true });
  return { verified: true };
}

/** Callable: { companyId } -> regenerates and re-sends the code. */
async function resendEmailOtp(db, uid, { companyId }) {
  if (uid !== companyId) throw new HttpsError("permission-denied", "You can only resend your own code.");

  const companyRef = db.doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new HttpsError("not-found", "Company not found.");
  const company = companySnap.data();
  if (company.emailVerified) return { sent: false, reason: "already-verified" };

  const otpRef = db.doc(`otpVerifications/${companyId}`);
  const otpSnap = await otpRef.get();
  if (otpSnap.exists) {
    const lastSentAt = otpSnap.data().lastSentAt?.toDate?.();
    if (lastSentAt && (Date.now() - lastSentAt.getTime()) / 1000 < RESEND_COOLDOWN_SECONDS) {
      throw new HttpsError("resource-exhausted", "Please wait a moment before requesting another code.");
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await otpRef.set({
    code,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    attempts: 0,
    verified: false,
    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (company.contactEmail) {
    await sendEmail({
      to: company.contactEmail,
      subject: "Your new verification code — Malachi",
      html: `<p>Your new verification code is:</p>
             <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
             <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    });
  }

  return { sent: true };
}

module.exports = { onCompanyCreated, verifyEmailOtp, resendEmailOtp };
