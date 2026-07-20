// functions/payments/clickpesa.js
//
// ClickPesa payment adapter for the landlord subscription (35,000 TZS/month).
//
// IMPORTANT — this adapter is a STARTING POINT, not a verified integration.
// docs.clickpesa.com blocks automated access from this environment (every
// page returned 403), so the exact token-generation response field, the
// checksum algorithm, and the webhook payload shape below are placeholders
// based only on publicly-findable summaries (Bearer token auth; a
// mobile-money collection request with amount/currency/orderReference/
// phoneNumber/checksum fields; webhook-based confirmation with checksum
// validation).
//
// Before going live:
//   1. Get a ClickPesa sandbox account and open docs.clickpesa.com yourself
//      (it loads fine in a normal browser — the block is on automated tools).
//   2. Fill in computeChecksum() with their real algorithm.
//   3. Confirm the generate-token response field, the collection endpoint
//      path, and the webhook payload field names below against their docs.
//   4. Set CLICKPESA_CLIENT_ID / CLICKPESA_API_KEY via
//      `firebase functions:secrets:set`.
//
// Everything in subscriptions.js is written against this adapter's two
// exports (initiateCheckout, verifyWebhook) — swapping to a different
// provider later (Azampay, Selcom, DPO) means writing one new file with the
// same two exports and changing PAYMENT_PROVIDER, nothing else.

const CLICKPESA_API_BASE = process.env.CLICKPESA_API_BASE || "https://api.clickpesa.com";

function computeChecksum(/* fields */) {
  throw new Error(
    "ClickPesa checksum algorithm not yet configured — fill in computeChecksum() " +
    "in functions/payments/clickpesa.js from ClickPesa's own docs before taking payments."
  );
}

async function getAccessToken() {
  const res = await fetch(`${CLICKPESA_API_BASE}/third-parties/generate-token`, {
    method: "POST",
    headers: {
      "client-id": process.env.CLICKPESA_CLIENT_ID,
      "api-key": process.env.CLICKPESA_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`ClickPesa auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token; // TODO: confirm this field name against ClickPesa's docs
}

/**
 * Starts a mobile-money collection request (USSD push) for one subscription
 * payment. Returns whatever ClickPesa's API responds with (transaction id,
 * status, etc.) — the caller stores orderReference and waits for the webhook.
 */
async function initiateCheckout({ orderReference, amount, phoneNumber }) {
  const token = await getAccessToken();
  const body = {
    amount: String(amount),
    currency: "TZS",
    orderReference,
    phoneNumber,
    checksum: computeChecksum({ amount, currency: "TZS", orderReference, phoneNumber }),
  };

  const res = await fetch(`${CLICKPESA_API_BASE}/third-parties/payments/mobile-money`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ClickPesa checkout failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Normalizes ClickPesa's webhook body into { orderReference, status, amount }.
 * status must come back as exactly "SUCCESS" for subscriptions.js to mark the
 * payment paid — confirm ClickPesa's actual success value and add checksum/
 * signature verification here before trusting this in production.
 */
function verifyWebhook(reqBody /*, headers */) {
  return {
    orderReference: reqBody.orderReference,
    status: reqBody.status,
    amount: reqBody.amount,
  };
}

module.exports = { initiateCheckout, verifyWebhook };
