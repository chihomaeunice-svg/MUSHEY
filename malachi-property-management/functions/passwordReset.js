// functions/passwordReset.js
// Forgot-password, branded to match the OTP/staff-invite emails instead of
// shipping Firebase Auth's own generic default template (raw project-id
// subject line, noreply@<project>.firebaseapp.com sender). Uses the same
// primitive staff invites already use — generatePasswordResetLink — just
// wrapped in our own email instead of Firebase's.

const admin = require("firebase-admin");
const { sendEmail } = require("./email");

const RESEND_COOLDOWN_SECONDS = 60;

// Firestore doc IDs can't contain "/" — emails don't have one, but this is
// keyed directly by user input, so stay defensive.
const docIdForEmail = (email) => email.trim().toLowerCase().replace(/\//g, "_");

/**
 * Callable: { email } -> always returns { ok: true }, whether or not the
 * email is actually registered, so this can never be used to enumerate
 * accounts (same enumeration-safe behavior the client used to get for free
 * from Firebase Auth's own "auth/user-not-found" handling).
 */
async function requestPasswordReset(db, { email }) {
  if (!email || !email.includes("@")) return { ok: true };

  const cooldownRef = db.doc(`passwordResetRequests/${docIdForEmail(email)}`);
  const cooldownSnap = await cooldownRef.get();
  const lastSentAt = cooldownSnap.exists ? cooldownSnap.data().lastSentAt?.toDate?.() : null;
  if (lastSentAt && (Date.now() - lastSentAt.getTime()) / 1000 < RESEND_COOLDOWN_SECONDS) {
    return { ok: true }; // silently no-op on rapid repeat requests
  }
  await cooldownRef.set({ lastSentAt: admin.firestore.FieldValue.serverTimestamp() });

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await sendEmail({
      to: email,
      subject: "Reset your Malachi password",
      html: `<p>We got a request to reset the password for your Malachi Property Management account.</p>
             <p><a href="${resetLink}">Reset your password</a></p>
             <p>This link expires after a short time. If you didn't request this, you can safely ignore this
             email — your password won't change.</p>`,
    });
  } catch (err) {
    // auth/user-not-found is the expected outcome for an unregistered
    // email — swallow it so the response timing/shape never reveals
    // whether an account exists. Anything else is a real failure worth
    // logging, though still not surfaced to the caller.
    if (err.code !== "auth/user-not-found") {
      console.error("Password reset request failed:", err);
    }
  }

  return { ok: true };
}

module.exports = { requestPasswordReset };
