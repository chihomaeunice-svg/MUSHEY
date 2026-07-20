// src/utils/notifications.js
// Sends exactly 3 emails per contract:
//   • 14 days before expiry
//   •  7 days before expiry
//   •  1 day  before expiry
// Uses Firebase to track which emails have been sent,
// so it persists across sessions and devices.

import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// ── Fill these in from your EmailJS dashboard ──────────────────────────
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || "YOUR_PUBLIC_KEY";
const NOTIFY_EMAIL        = import.meta.env.VITE_NOTIFY_EMAIL        || "YOUR_EMAIL@gmail.com";
// ──────────────────────────────────────────────────────────────────────

// Exactly 3 trigger points (days before expiry)
const TRIGGER_DAYS = [14, 7, 1];

async function sendExpiryEmail({ tenantName, propertyId, area, contractEnd, daysLeft, rent, triggerDay }) {
  const subject =
    triggerDay === 1  ? "URGENT — Contract Expires Tomorrow" :
    triggerDay === 7  ? "Contract Expiring in 1 Week" :
                        "Contract Expiring in 2 Weeks";

  const params = {
    to_email:      NOTIFY_EMAIL,
    tenant_name:   tenantName || "Unknown Tenant",
    property_id:   propertyId,
    area,
    contract_end:  contractEnd,
    days_left:     daysLeft,
    rent:          Number(rent || 0).toLocaleString() + " TZS/month",
    subject,
    trigger_label: `${triggerDay}-day warning`,
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY);
}

async function loadNotifLog(key) {
  try {
    const snap = await getDoc(doc(db, "notifications", key));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

async function saveNotifLog(key, log) {
  try {
    await setDoc(doc(db, "notifications", key), log);
  } catch (e) {
    console.error("Failed to save notification log:", e);
  }
}

// Main function — call on app load.
// Each contract gets max 3 emails. Tracked in Firebase so it never repeats.
export async function checkAndNotify(properties) {
  const today   = new Date();
  const results = [];

  for (const p of properties) {
    if (!p.contractEnd) continue;

    const daysLeft = Math.ceil(
      (new Date(p.contractEnd) - today) / (1000 * 60 * 60 * 24)
    );

    // Only care about contracts in the 0–14 day window
    if (daysLeft < 0 || daysLeft > 14) continue;

    const key = `${p.area}_${p.id}`.replace(/\s+/g, "_");
    const log = await loadNotifLog(key);
    let updated = false;

    for (const triggerDay of TRIGGER_DAYS) {
      // Send if daysLeft has reached this trigger AND we haven't sent it yet
      if (daysLeft > triggerDay) continue;
      if (log[`sent_${triggerDay}d`]) continue;

      try {
        await sendExpiryEmail({
          tenantName:  p.tenantName,
          propertyId:  p.id,
          area:        p.area,
          contractEnd: p.contractEnd,
          daysLeft,
          rent:        p.rent,
          triggerDay,
        });

        log[`sent_${triggerDay}d`] = today.toISOString();
        updated = true;
        results.push({ success: true, property: p.id, trigger: `${triggerDay}d` });
      } catch (err) {
        results.push({ success: false, property: p.id, trigger: `${triggerDay}d`, error: err.message });
      }
    }

    if (updated) await saveNotifLog(key, log);
  }

  return results;
}

export async function getNotifStatus(area, propertyId) {
  const key = `${area}_${propertyId}`.replace(/\s+/g, "_");
  return loadNotifLog(key);
}