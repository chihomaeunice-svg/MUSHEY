// src/components/AuthGate.jsx
// Shows the marketing homepage first for anyone who isn't authenticated,
// then toggles between the sign-in screen and the "register your company"
// screen once they choose one.

import { useState, lazy, Suspense } from "react";
import Landing from "../pages/Landing";
import InstallPrompt from "./InstallPrompt";

// Login/Signup are only needed once someone clicks past the landing page,
// so they don't need to be in the very first bundle every visitor downloads.
const Login = lazy(() => import("../pages/Login"));
const Signup = lazy(() => import("../pages/Signup"));

export default function AuthGate() {
  const [mode, setMode] = useState("landing");

  return (
    <>
      <InstallPrompt />
      {mode === "landing" ? (
        <Landing
          onGetStarted={() => setMode("signup")}
          onSignIn={() => setMode("login")}
        />
      ) : (
        <Suspense fallback={<div className="app-loading">Loading…</div>}>
          {mode === "login" ? (
            <Login onSwitchToSignup={() => setMode("signup")} onBack={() => setMode("landing")} />
          ) : (
            <Signup onSwitchToLogin={() => setMode("login")} onBack={() => setMode("landing")} />
          )}
        </Suspense>
      )}
    </>
  );
}
