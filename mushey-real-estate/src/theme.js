// src/theme.js
// Persisted light/dark theme. Applies data-theme on <html> to override the
// prefers-color-scheme tokens in globals.css; falls back to the OS
// preference when the user hasn't picked explicitly.

const STORAGE_KEY = "mushey-theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY); // "light" | "dark" | null
}

export function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function setTheme(theme) {
  if (theme) {
    localStorage.setItem(STORAGE_KEY, theme);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  applyTheme(theme);
}

/** Call once at startup, before first paint if possible. */
export function initTheme() {
  applyTheme(getStoredTheme());
}

export function currentEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
