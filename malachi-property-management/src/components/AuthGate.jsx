// src/components/AuthGate.jsx
// Shows the marketing homepage first for anyone who isn't authenticated,
// then toggles between the sign-in screen and the "register your company"
// screen once they choose one.

import { useState } from "react";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import InstallPrompt from "./InstallPrompt";

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
      ) : mode === "login" ? (
        <Login onSwitchToSignup={() => setMode("signup")} onBack={() => setMode("landing")} />
      ) : (
        <Signup onSwitchToLogin={() => setMode("login")} onBack={() => setMode("landing")} />
      )}
    </>
  );
}
