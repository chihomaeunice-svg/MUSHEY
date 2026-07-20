// src/firebase/receipts.js
// Records a payment and hands out the next sequential receipt number for a
// company (e.g. MSH-000123), used for the TRA-styled PDF receipt.

import { runTransaction, doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function recordPayment(companyId, { property, type, amount, receiptPhotoUrl }) {
  const companyRef = doc(db, "companies", companyId);
  const paymentsRef = collection(db, "companies", companyId, "payments");

  const receiptNumber = await runTransaction(db, async (tx) => {
    const companySnap = await tx.get(companyRef);
    const data = companySnap.data() || {};
    const next = data.nextReceiptNumber || 1;
    const prefix = data.receiptPrefix || "MSH";
    tx.update(companyRef, { nextReceiptNumber: next + 1 });
    return `${prefix}-${String(next).padStart(6, "0")}`;
  });

  const paymentDoc = {
    propertyId: property.id,
    propertyName: property.propertyName,
    tenantName: property.tenantName || "",
    area: property.area,
    type,
    amount: Number(amount) || 0,
    receiptNumber,
    receiptPhotoUrl: receiptPhotoUrl || null,
    paidAt: serverTimestamp(),
  };

  const ref = await addDoc(paymentsRef, paymentDoc);
  return { id: ref.id, ...paymentDoc, paidAt: new Date() };
}
