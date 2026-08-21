// functions/index.js
// Server-side notifications that fire on a real schedule (not just when
// someone has the app open): contract-expiry reminders, a monthly rent-due
// reminder, and an immediate "rent paid in full" notice — each one emails
// the landlord (company.notifyEmail) AND texts the tenant (property.phone),
// so both parties hear about it.
//
// Deploy with: firebase deploy --only functions
// Requires the project to be on the Blaze (pay-as-you-go) plan.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { sendEmail } = require("./email");
const { sendSms } = require("./sms");
const subscriptions = require("./subscriptions");
const otp = require("./otp");

admin.initializeApp();
const db = admin.firestore();

// v2 functions only get process.env populated for secrets they explicitly
// declare here — setting a secret with `firebase functions:secrets:set`
// alone does nothing for a function that doesn't list it. Any function that
// calls sendEmail/sendSms (even indirectly, like onCompanyCreated -> otp.js)
// needs the matching list below, or the send silently falls back to the
// outbox with no visible error.
const EMAIL_SECRETS = ["EMAIL_PROVIDER", "RESEND_API_KEY", "RESEND_FROM", "SENDGRID_API_KEY", "SENDGRID_FROM"];
const SMS_SECRETS = ["SMS_PROVIDER", "BEEM_API_KEY", "BEEM_SECRET_KEY", "BEEM_SENDER_ID", "AT_API_KEY", "AT_USERNAME", "AT_SENDER_ID"];

const EXPIRY_TRIGGER_DAYS = [14, 7, 1];
const RENT_DUE_DAYS_BEFORE_MONTH_END = 5;

function daysBetween(a, b) {
  return Math.ceil((a - b) / (1000 * 60 * 60 * 24));
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysLeftInMonth(d) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return daysBetween(end, d);
}

async function getNotifLog(companyId, propertyId) {
  const snap = await db.doc(`companies/${companyId}/notifications/${propertyId}`).get();
  return snap.exists ? snap.data() : {};
}

async function saveNotifLog(companyId, propertyId, log) {
  await db.doc(`companies/${companyId}/notifications/${propertyId}`).set(log, { merge: true });
}

/** Runs once a day: contract-expiry + monthly rent-due reminders, per company. */
exports.dailyNotifications = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Africa/Dar_es_Salaam", secrets: [...EMAIL_SECRETS, ...SMS_SECRETS] },
  async () => {
    const today = new Date();
    const companiesSnap = await db.collection("companies").where("active", "==", true).get();

    for (const companyDoc of companiesSnap.docs) {
      const company = companyDoc.data();
      const notifyEmail = company.notifyEmail;
      if (!notifyEmail) continue;

      const propsSnap = await companyDoc.ref.collection("properties").get();

      for (const propDoc of propsSnap.docs) {
        const p = propDoc.data();
        const log = await getNotifLog(companyDoc.id, propDoc.id);
        let updated = false;

        // Contract expiry: 14 / 7 / 1 day warnings (shared log with the
        // client-side check, so whichever runs first wins — no duplicates).
        if (p.contractEnd) {
          const daysLeft = daysBetween(new Date(p.contractEnd), today);
          for (const triggerDay of EXPIRY_TRIGGER_DAYS) {
            if (daysLeft < 0 || daysLeft > triggerDay) continue;
            if (log[`sent_${triggerDay}d`]) continue;

            await sendEmail({
              to: notifyEmail,
              subject: triggerDay === 1
                ? `URGENT — ${p.tenantName || "Tenant"}'s contract expires tomorrow`
                : `Contract expiring in ${triggerDay} days — ${p.tenantName || "Tenant"}`,
              html: `<p>Property <b>${p.propertyName}</b> (${p.area}) — tenant <b>${p.tenantName || "Unknown"}</b>.</p>
                     <p>Contract ends <b>${p.contractEnd}</b> (${daysLeft} day(s) left).</p>`,
            });
            if (p.phone) {
              await sendSms({
                to: p.phone,
                message: `Habari ${p.tenantName || ""}, mkataba wako wa ${p.propertyName} unaisha ${p.contractEnd} (siku ${daysLeft} zilizobaki). Wasiliana na mwenye nyumba.`,
              });
            }
            log[`sent_${triggerDay}d`] = today.toISOString();
            updated = true;
          }
        }

        // Rent-due reminder: once per month, in the final days of the
        // month, if rent hasn't been marked paid yet. Skip vacant units —
        // there's no tenant to owe rent.
        if (p.status !== "vacant" && !p.rentPaid && daysLeftInMonth(today) <= RENT_DUE_DAYS_BEFORE_MONTH_END) {
          const mKey = `sent_rentdue_${monthKey(today)}`;
          if (!log[mKey]) {
            await sendEmail({
              to: notifyEmail,
              subject: `Rent due soon — ${p.tenantName || "Tenant"} (${p.propertyName})`,
              html: `<p>Rent for <b>${p.propertyName}</b> (${p.area}), tenant <b>${p.tenantName || "Unknown"}</b>,
                     is not yet marked as paid and the month is ending soon.</p>
                     <p>Amount: <b>${Number(p.rent || 0).toLocaleString()} TZS</b>.</p>`,
            });
            if (p.phone) {
              await sendSms({
                to: p.phone,
                message: `Kumbusho: kodi ya ${p.propertyName} bado haijalipwa mwezi huu. Kiasi: ${Number(p.rent || 0).toLocaleString()} TZS.`,
              });
            }
            log[mKey] = today.toISOString();
            updated = true;
          }
        }

        if (updated) await saveNotifLog(companyDoc.id, propDoc.id, log);
      }
    }
  }
);

/** Fires immediately when rentPaid flips from false/unset to true. */
exports.onRentPaid = onDocumentUpdated(
  { document: "companies/{companyId}/properties/{propertyId}", secrets: [...EMAIL_SECRETS, ...SMS_SECRETS] },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.rentPaid === after.rentPaid || after.rentPaid !== true) return;

    const companySnap = await db.doc(`companies/${event.params.companyId}`).get();
    const notifyEmail = companySnap.data()?.notifyEmail;
    if (!notifyEmail) return;

    await sendEmail({
      to: notifyEmail,
      subject: `Rent paid in full — ${after.tenantName || "Tenant"} (${after.propertyName})`,
      html: `<p>Rent for <b>${after.propertyName}</b> (${after.area}), tenant <b>${after.tenantName || "Unknown"}</b>,
             has been marked as fully paid.</p>
             <p>Amount: <b>${Number(after.rent || 0).toLocaleString()} TZS</b>.</p>`,
    });

    if (after.phone) {
      await sendSms({
        to: after.phone,
        message: `Asante ${after.tenantName || ""}! Malipo ya kodi ya ${after.propertyName} yamepokelewa - ${Number(after.rent || 0).toLocaleString()} TZS.`,
      });
    }
  }
);

/** Runs once a day: moves lapsed companies trialing/active -> past_due -> locked. */
exports.dailySubscriptionCheck = onSchedule(
  { schedule: "30 7 * * *", timeZone: "Africa/Dar_es_Salaam" },
  async () => {
    await subscriptions.checkAllSubscriptions(db);
  }
);

/** Fires when a new company registers: emails an OTP to them, notifies superAdmins. */
exports.onCompanyCreated = onDocumentCreated(
  { document: "companies/{companyId}", secrets: EMAIL_SECRETS },
  async (event) => {
    const company = event.data.data();
    await otp.onCompanyCreated(db, event.params.companyId, company);
  }
);

exports.verifyEmailOtp = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return otp.verifyEmailOtp(db, request.auth.uid, request.data);
});

exports.resendEmailOtp = onCall({ secrets: EMAIL_SECRETS }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return otp.resendEmailOtp(db, request.auth.uid, request.data);
});
