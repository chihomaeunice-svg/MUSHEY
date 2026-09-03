// functions/inquiries.js
// Landing-page "get in touch" form — anyone can submit this, signed in or
// not (it's shown to visitors who haven't registered yet), so it's a public
// callable rather than gated behind request.auth. The daily cost-guard cap
// exists specifically because this is the one write surface in the whole
// app that's reachable by a total stranger.

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { sendEmail } = require("./email");
const { underDailyLimit } = require("./costGuard");

const INQUIRY_EMAIL = "massawexavier@gmail.com";
const DAILY_INQUIRY_LIMIT = 50;

async function submitInquiry(db, { name, email, message }) {
  if (!name || !email || !message) {
    throw new HttpsError("invalid-argument", "Name, email, and message are all required.");
  }
  if (!email.includes("@")) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  if (!(await underDailyLimit("inquiry", DAILY_INQUIRY_LIMIT))) {
    throw new HttpsError("resource-exhausted", "Too many messages submitted today — please try again tomorrow, or reach out on WhatsApp instead.");
  }

  await db.collection("inquiries").add({
    name, email, message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await sendEmail({
    to: INQUIRY_EMAIL,
    subject: `New inquiry from ${name}`,
    html: `<p><b>Name:</b> ${name}<br/><b>Email:</b> ${email}</p><p>${message}</p>`,
  });

  return { ok: true };
}

module.exports = { submitInquiry };
