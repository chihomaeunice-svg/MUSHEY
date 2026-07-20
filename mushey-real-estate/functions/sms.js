// functions/sms.js
// Pluggable SMS adapter for tenant-facing reminders. Provider still
// undecided (Beem Africa vs Africa's Talking), so — same pattern as
// functions/email.js — this queues into Firestore (sms_outbox) by default
// instead of sending or silently dropping messages. Wiring in a real
// provider later means setting SMS_PROVIDER + its API keys via
// `firebase functions:secrets:set`; nothing else in this file's callers
// needs to change.

const admin = require("firebase-admin");

/** Converts a local Tanzanian number (0712...) to E.164 (+255712...). */
function normalizeTzPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0")) return `+255${digits.slice(1)}`;
  return `+255${digits}`;
}

async function queueToOutbox({ to, message }) {
  await admin.firestore().collection("sms_outbox").add({
    to, message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "queued",
  });
}

async function sendViaBeem({ to, message }) {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const senderId = process.env.BEEM_SENDER_ID || "MUSHEY";
  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  const res = await fetch("https://apisms.beem.africa/v1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source_addr: senderId,
      encoding: 0,
      message,
      recipients: [{ recipient_id: 1, dest_addr: to }],
    }),
  });
  if (!res.ok) throw new Error(`Beem API error ${res.status}: ${await res.text()}`);
}

async function sendViaAfricasTalking({ to, message }) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  const senderId = process.env.AT_SENDER_ID;

  const params = new URLSearchParams({ username, to, message });
  if (senderId) params.set("from", senderId);

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Africa's Talking API error ${res.status}: ${await res.text()}`);
}

/** Sends (or queues, if no provider is configured yet) one SMS. */
async function sendSms({ to, message }) {
  const normalized = normalizeTzPhone(to);
  if (!normalized) return;

  const provider = process.env.SMS_PROVIDER; // "beem" | "africastalking" | unset

  try {
    if (provider === "beem") {
      await sendViaBeem({ to: normalized, message });
    } else if (provider === "africastalking") {
      await sendViaAfricasTalking({ to: normalized, message });
    } else {
      console.log(`SMS_PROVIDER not set — queuing SMS to ${normalized} instead of sending.`);
      await queueToOutbox({ to: normalized, message });
    }
  } catch (err) {
    console.error(`Failed to send SMS to ${normalized}:`, err);
    await queueToOutbox({ to: normalized, message: `${message} (send failed: ${err.message})` });
  }
}

module.exports = { sendSms, normalizeTzPhone };
