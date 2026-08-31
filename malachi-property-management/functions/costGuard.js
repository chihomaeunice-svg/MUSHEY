// functions/costGuard.js
// A hard daily ceiling enforced centrally in email.js/sms.js/staff.js so it
// protects every caller (scheduled reminders, OTP, staff invites) regardless
// of which SMS/email provider eventually gets wired in. This exists for one
// reason: a bug or abuse shouldn't be able to turn into an open-ended
// per-message bill overnight. Defaults are generous for this app's actual
// scale — raise a specific day's limit by hand in Firestore
// (_costGuards/{key}_{date}.limit) if a legitimate spike ever needs more room.

const admin = require("firebase-admin");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atomically increments today's counter for `key` and returns true if this
 * call is still under the daily limit, false if it should be held back.
 * Fails open (returns true) if the guard itself errors, so a Firestore
 * hiccup never blocks a real notification — this is cost protection, not a
 * feature that should ever be a new point of failure.
 */
async function underDailyLimit(key, defaultLimit) {
  const db = admin.firestore();
  const ref = db.doc(`_costGuards/${key}_${todayKey()}`);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const count = data.count || 0;
      const limit = data.limit || defaultLimit;
      if (count >= limit) return false;
      tx.set(ref, { count: count + 1, limit, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
  } catch (err) {
    console.error(`Cost guard check failed for "${key}", allowing the call through:`, err);
    return true;
  }
}

module.exports = { underDailyLimit };
