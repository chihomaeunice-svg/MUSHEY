// functions/email.js
// Pluggable email adapter. Which provider to use hasn't been decided yet, so
// by default this QUEUES emails into Firestore (mail_outbox) instead of
// sending or dropping them — nothing is lost while the provider decision is
// pending. Once you pick a provider, set EMAIL_PROVIDER and its API key via
// `firebase functions:secrets:set` (or functions config) and this file is
// the only place that needs to change.

const admin = require("firebase-admin");

async function queueToOutbox({ to, subject, html }) {
  await admin.firestore().collection("mail_outbox").add({
    to, subject, html,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "queued",
  });
}

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Mushey <notifications@mushey.co.tz>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
}

async function sendViaSendgrid({ to, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM || "notifications@mushey.co.tz";
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`);
}

/** Sends (or queues, if no provider is configured yet) one email. */
async function sendEmail({ to, subject, html }) {
  if (!to) return;

  const provider = process.env.EMAIL_PROVIDER; // "resend" | "sendgrid" | unset

  try {
    if (provider === "resend") {
      await sendViaResend({ to, subject, html });
    } else if (provider === "sendgrid") {
      await sendViaSendgrid({ to, subject, html });
    } else {
      console.log(`EMAIL_PROVIDER not set — queuing "${subject}" to mail_outbox instead of sending to ${to}.`);
      await queueToOutbox({ to, subject, html });
    }
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err);
    await queueToOutbox({ to, subject, html: `${html}<p><em>(send failed: ${err.message})</em></p>` });
  }
}

module.exports = { sendEmail };
