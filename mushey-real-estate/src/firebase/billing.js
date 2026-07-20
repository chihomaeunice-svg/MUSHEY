// src/firebase/billing.js
// Starts a subscription payment via the active payment gateway (ClickPesa
// today; the Cloud Function side is provider-agnostic, so switching gateways
// later doesn't change this call).

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";

export async function startSubscriptionCheckout(phoneNumber) {
  const call = httpsCallable(functions, "startSubscriptionCheckout");
  const { data } = await call({ phoneNumber });
  return data;
}
