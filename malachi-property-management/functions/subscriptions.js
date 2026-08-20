// functions/subscriptions.js
// Subscription status tracking — rate is agreed per company, no fixed price.
// No payment gateway is wired up: a company submits proof of payment in-app
// and a superAdmin reviews/approves it (extending currentPeriodEnd directly,
// per firestore.rules).
//
// Locking an account is a manual superAdmin decision (SuperAdmin panel) —
// it depends on whatever terms Malachi has with that customer, not a fixed
// rule. This daily sweep only ever marks an overdue company "past_due" (an
// informational warning banner, doesn't block anything) so a superAdmin can
// see who's overdue; it never locks anyone automatically, and never touches
// an account a superAdmin has already locked by hand.

const TRIAL_DAYS = 14;

/** Daily sweep: flags lapsed companies as past_due for a superAdmin to review. */
async function checkAllSubscriptions(db) {
  const today = new Date();
  const snap = await db.collection("companies").where("active", "==", true).get();

  for (const companyDoc of snap.docs) {
    const c = companyDoc.data();
    if (!c.currentPeriodEnd) continue;
    if (c.subscriptionStatus === "locked") continue; // manual-only from here

    const daysPast = Math.floor((today - new Date(c.currentPeriodEnd)) / (1000 * 60 * 60 * 24));
    if (daysPast <= 0) continue; // still within the paid/trial period

    if (c.subscriptionStatus !== "past_due") {
      await companyDoc.ref.update({ subscriptionStatus: "past_due" });
    }
  }
}

module.exports = { checkAllSubscriptions, TRIAL_DAYS };
