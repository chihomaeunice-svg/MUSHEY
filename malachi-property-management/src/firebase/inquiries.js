// src/firebase/inquiries.js
// Thin wrapper around the submitInquiry Cloud Function — the Landing page
// "get in touch" form. Callable without being signed in, since this is
// shown to visitors who haven't registered yet.

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebaseConfig";

export async function submitInquiry(name, email, message) {
  const call = httpsCallable(functions, "submitInquiry");
  const res = await call({ name, email, message });
  return res.data;
}
