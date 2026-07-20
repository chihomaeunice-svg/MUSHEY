// functions/index.js
// Server-side notifications that fire on a real schedule (not just when
// someone has the app open): contract-expiry reminders, a monthly rent-due
// reminder, and an immediate "rent paid in full" email.
//
// Deploy with: firebase deploy --only functions
// Requires the project to be on the Blaze (pay-as-you-go) plan.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { sendEmail } = require("./email");

admin.initializeApp();
const db = admin.firestore();

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
  { schedule: "0 7 * * *", timeZone: "Africa/Dar_es_Salaam" },
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
            log[`sent_${triggerDay}d`] = today.toISOString();
            updated = true;
          }
        }

        // Rent-due reminder: once per month, in the final days of the
        // month, if rent hasn't been marked paid yet.
        if (!p.rentPaid && daysLeftInMonth(today) <= RENT_DUE_DAYS_BEFORE_MONTH_END) {
          const mKey = `sent_rentdue_${monthKey(today)}`;
          if (!log[mKey]) {
            await sendEmail({
              to: notifyEmail,
              subject: `Rent due soon — ${p.tenantName || "Tenant"} (${p.propertyName})`,
              html: `<p>Rent for <b>${p.propertyName}</b> (${p.area}), tenant <b>${p.tenantName || "Unknown"}</b>,
                     is not yet marked as paid and the month is ending soon.</p>
                     <p>Amount: <b>${Number(p.rent || 0).toLocaleString()} TZS</b>.</p>`,
            });
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
  "companies/{companyId}/properties/{propertyId}",
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
  }
);
