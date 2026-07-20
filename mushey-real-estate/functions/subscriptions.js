// functions/subscriptions.js
// Provider-agnostic subscription billing (35,000 TZS/month per company).
// Which payment gateway is used is a single lookup (PAYMENT_PROVIDER) —
// switching from ClickPesa to another provider later means adding one new
// adapter file with the same two exports (initiateCheckout, verifyWebhook)
// and changing that env var, nothing in this file changes.

const admin = require("firebase-admin");
const clickpesa = require("./payments/clickpesa");

const SUBSCRIPTION_AMOUNT = 35000;
const GRACE_PERIOD_DAYS = 5;
const TRIAL_DAYS = 14;

const PROVIDERS = { clickpesa };

function getProvider() {
  const name = process.env.PAYMENT_PROVIDER || "clickpesa";
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown PAYMENT_PROVIDER: ${name}`);
  return { name, ...provider };
}

/** Starts a checkout for one company's subscription payment. */
async function startCheckout(db, { companyId, phoneNumber }) {
  const provider = getProvider();
  const orderReference = `${companyId}_${Date.now()}`;

  await db
    .collection("companies").doc(companyId)
    .collection("subscriptionPayments").doc(orderReference)
    .set({
      amount: SUBSCRIPTION_AMOUNT,
      status: "pending",
      provider: provider.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  const result = await provider.initiateCheckout({
    orderReference, amount: SUBSCRIPTION_AMOUNT, phoneNumber,
  });

  return { orderReference, ...result };
}

/** Handles an inbound payment-provider webhook and applies the result. */
async function handleWebhook(db, providerName, reqBody, headers) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  const { orderReference, status } = provider.verifyWebhook(reqBody, headers);
  const companyId = orderReference.split("_")[0];

  const paymentRef = db
    .collection("companies").doc(companyId)
    .collection("subscriptionPayments").doc(orderReference);

  if (status !== "SUCCESS") {
    await paymentRef.set({ status: "failed" }, { merge: true });
    return;
  }

  const newPeriodEnd = new Date();
  newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

  await Promise.all([
    paymentRef.set({ status: "paid", paidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    db.collection("companies").doc(companyId).set({
      subscriptionStatus: "active",
      currentPeriodEnd: newPeriodEnd.toISOString().slice(0, 10),
      lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentProvider: providerName,
    }, { merge: true }),
  ]);
}

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

module.exports = { startCheckout, handleWebhook, checkAllSubscriptions, SUBSCRIPTION_AMOUNT, TRIAL_DAYS };
