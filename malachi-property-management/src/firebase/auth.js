// src/firebase/auth.js
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { app, functions } from "./firebaseConfig";

export const auth = getAuth(app);

/**
 * Sign in an existing user
 */
export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Request a password reset — routed through our own requestPasswordReset
 * Cloud Function (functions/passwordReset.js) instead of Firebase Auth's
 * client-side sendPasswordResetEmail, so the email itself is our own
 * branded template (matching the OTP/staff-invite emails) instead of
 * Firebase's generic default. The actual reset link and reset page are
 * still Firebase Auth's own — only the email delivery is custom.
 * Always resolves, regardless of whether the email is registered, so this
 * can't be used to enumerate accounts.
 */
export const resetPassword = async (email) => {
  const call = httpsCallable(functions, "requestPasswordReset");
  await call({ email });
};

/**
 * Sign out the current user
 */
export const logout = () => signOut(auth);

/**
 * Register a new user (optional, for admin setup)
 */
export const register = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

/**
 * Listen to auth state changes
 * Usage: const unsub = onAuthChange(user => { ... }); // call unsub() to stop
 */
export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, callback);