// src/firebase/auth.js
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { app } from "./firebaseConfig";

export const auth = getAuth(app);

/**
 * Sign in an existing user
 */
export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Send a password reset email — handled entirely by Firebase Auth itself
 * (the link, the reset page, and the actual password change), no custom
 * backend or email provider involved.
 */
export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);

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