// src/firebase/otp.js
// Thin wrapper around the verifyEmailOtp/resendEmailOtp Cloud Functions —
// the actual code lives server-side only (functions/otp.js), never in a
// client-readable Firestore document.

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";

export async function verifyEmailOtp(companyId, code) {
  const call = httpsCallable(functions, "verifyEmailOtp");
  const res = await call({ companyId, code });
  return res.data;
}

export async function resendEmailOtp(companyId) {
  const call = httpsCallable(functions, "resendEmailOtp");
  const res = await call({ companyId });
  return res.data;
}
