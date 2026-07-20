// src/utils/notifications.js
// Client-side, best-effort contract-expiry emails: sends exactly 3 emails per
// contract (14 / 7 / 1 days before expiry) whenever an admin has the app
// open. Tracked in Firestore per company so it never repeats.
//
// NOTE: this only fires while someone has the app open in a browser tab.
// Reliable rent-due / rent-complete / expiry reminders that fire on a
// schedule live in Cloud Functions (functions/) instead — see task #8.

import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// ── Fill these in from your EmailJS dashboard ──────────────────────────
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || "YOUR_PUBLIC_KEY";
// ──────────────────────────────────────────────────────────────────────

// Exactly 3 trigger points (days before expiry)
const TRIGGER_DAYS = [14, 7, 1];

async function sendExpiryEmail(notifyEmail, { tenantName, propertyName, area, contractEnd, daysLeft, rent, triggerDay }) {
  const subject =
    triggerDay === 1  ? "URGENT — Contract Expires Tomorrow" :
    triggerDay === 7  ? "Contract Expiring in 1 Week" :
                        "Contract Expiring in 2 Weeks";

  const params = {
    to_email:      notifyEmail,
    tenant_name:   tenantName || "Unknown Tenant",
    property_id:   propertyName,
    area,
    contract_end:  contractEnd,
    days_left:     daysLeft,
    rent:          Number(rent || 0).toLocaleString() + " TZS/month",
    subject,
    trigger_label: `${triggerDay}-day warning`,
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY);
}

async function loadNotifLog(companyId, key) {
  try {
    const snap = await getDoc(doc(db, "companies", companyId, "notifications", key));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

async function saveNotifLog(companyId, key, log) {
  try {
    await setDoc(doc(db, "companies", companyId, "notifications", key), log);
  } catch (e) {
    console.error("Failed to save notification log:", e);
  }
}

// Main function — call on app load.
// Each contract gets max 3 emails. Tracked in Firebase so it never repeats.
export async function checkAndNotify(companyId, properties, notifyEmail) {
  if (!companyId || !notifyEmail) return [];

  const today   = new Date();
  const results = [];

  for (const p of properties) {
    if (!p.contractEnd) continue;

    const daysLeft = Math.ceil(
      (new Date(p.contractEnd) - today) / (1000 * 60 * 60 * 24)
    );

    // Only care about contracts in the 0–14 day window
    if (daysLeft < 0 || daysLeft > 14) continue;

    const key = p.id;
    const log = await loadNotifLog(companyId, key);
    let updated = false;

    for (const triggerDay of TRIGGER_DAYS) {
      // Send if daysLeft has reached this trigger AND we haven't sent it yet
      if (daysLeft > triggerDay) continue;
      if (log[`sent_${triggerDay}d`]) continue;

      try {
        await sendExpiryEmail(notifyEmail, {
          tenantName:   p.tenantName,
          propertyName: p.propertyName,
          area:         p.area,
          contractEnd:  p.contractEnd,
          daysLeft,
          rent:         p.rent,
          triggerDay,
        });

        log[`sent_${triggerDay}d`] = today.toISOString();
        updated = true;
        results.push({ success: true, property: p.propertyName, trigger: `${triggerDay}d` });
      } catch (err) {
        results.push({ success: false, property: p.propertyName, trigger: `${triggerDay}d`, error: err.message });
      }
    }

    if (updated) await saveNotifLog(companyId, key, log);
  }

  return results;
}

export async function getNotifStatus(companyId, propertyId) {
  return loadNotifLog(companyId, propertyId);
}
