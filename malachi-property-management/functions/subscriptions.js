// functions/subscriptions.js
// Subscription status tracking — rate is agreed per company, no fixed price.
// No payment gateway is wired up: a company submits proof of payment in-app
// and a superAdmin reviews/approves it (extending currentPeriodEnd directly,
// per firestore.rules). This file only runs the daily lapse sweep so overdue
// companies move trialing/active -> past_due -> locked on schedule.

const GRACE_PERIOD_DAYS = 5;
const TRIAL_DAYS = 14;

/** Daily sweep: moves lapsed companies active/trialing -> past_due -> locked. */
async function checkAllSubscriptions(db) {
  const today = new Date();
  const snap = await db.collection("companies").where("active", "==", true).get();

  for (const companyDoc of snap.docs) {
    const c = companyDoc.data();
    if (!c.currentPeriodEnd) continue;

    const daysPast = Math.floor((today - new Date(c.currentPeriodEnd)) / (1000 * 60 * 60 * 24));
    if (daysPast <= 0) continue; // still within the paid/trial period

    const nextStatus = daysPast <= GRACE_PERIOD_DAYS ? "past_due" : "locked";
    if (nextStatus !== c.subscriptionStatus) {
      await companyDoc.ref.update({ subscriptionStatus: nextStatus });
    }
  }
}

module.exports = { checkAllSubscriptions, TRIAL_DAYS };
