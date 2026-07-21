// src/firebase/company.js
// Multi-tenant helpers: every landlord/company that signs up ("installs" Mushey)
// gets its own companies/{companyId} document plus a users/{uid} record that
// points at it. All property data lives under companies/{companyId}/....

import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, orderBy, query,
} from "firebase/firestore";
import { auth } from "./auth";
import { db } from "./firebaseConfig";

/**
 * Register a brand-new company (an "enrollment"/install) and its owner account.
 * Creates: auth user, users/{uid}, companies/{companyId}. Starts with no
 * areas — every company adds its own from inside the app (Settings, or the
 * guided prompt on Properties) once signed in, there's no shared default (a
 * landlord in Arusha has nothing to do with "Kimara" or "Kariakoo", which
 * were specific to the original business).
 */
export async function registerCompany({ companyName, tin, phone, ownerName, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const companyId = uid; // one owner per company at signup time; simplest stable id

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const companyDoc = {
    name: companyName,
    tin: tin || "",
    phone: phone || "",
    contactEmail: email,
    notifyEmail: email,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    active: true,
    plan: "trial",
    areas: [],
    requireReceiptUpload: false,
    receiptPrefix: (companyName || "MSH").slice(0, 3).toUpperCase(),
    nextReceiptNumber: 1,
    // Subscription billing (companies/{companyId}) — these fields are only
    // ever changed server-side (Cloud Functions) after this initial write;
    // firestore.rules blocks clients from touching them afterward.
    subscriptionStatus: "trialing",
    subscriptionAmount: 35000,
    currentPeriodEnd: trialEnd.toISOString().slice(0, 10),
    paymentProvider: "clickpesa",
  };

  await setDoc(doc(db, "companies", companyId), companyDoc);
  await setDoc(doc(db, "users", uid), {
    companyId,
    role: "owner",
    name: ownerName || email,
    email,
    createdAt: serverTimestamp(),
  });

  return { uid, companyId };
}

export const logout = () => signOut(auth);

/** Look up the calling user's membership record (companyId + role). */
export async function getUserRecord(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function getCompany(companyId) {
  const snap = await getDoc(doc(db, "companies", companyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Super-admin only: list every company enrolled, most recent first. */
export async function listAllCompanies() {
  const snap = await getDocs(query(collection(db, "companies"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Super-admin only: count of properties/tenants for a single company. */
export async function countCompanyProperties(companyId) {
  const snap = await getDocs(collection(db, "companies", companyId, "properties"));
  return snap.size;
}
