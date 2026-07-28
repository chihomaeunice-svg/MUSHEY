// functions/subscriptions.js
// Subscription status tracking (35,000 TZS/month per company), managed
// manually for now — no payment gateway is wired up. Payments are collected
// outside the app and the period is extended by hand (Firestore or a future
// super-admin action); this file only runs the daily lapse sweep so overdue
// companies move trialing/active -> past_due -> locked on schedule.

const SUBSCRIPTION_AMOUNT = 35000;
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

module.exports = { checkAllSubscriptions, SUBSCRIPTION_AMOUNT, TRIAL_DAYS };
