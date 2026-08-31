// src/firebase/staff.js
// Thin wrappers around the inviteStaff/removeStaffMember Cloud Functions —
// staff account creation/removal always happens server-side (see
// functions/staff.js for why), never as a direct Firestore write.

import { httpsCallable } from "firebase/functions";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { functions } from "./firebaseConfig";
import { db } from "./firebaseConfig";

export async function inviteStaff(email, name) {
  const call = httpsCallable(functions, "inviteStaff");
  const res = await call({ email, name });
  return res.data;
}

export async function removeStaffMember(staffUid) {
  const call = httpsCallable(functions, "removeStaffMember");
  const res = await call({ staffUid });
  return res.data;
}

export async function listStaff(companyId) {
  const snap = await getDocs(
    query(collection(db, "companies", companyId, "staff"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
