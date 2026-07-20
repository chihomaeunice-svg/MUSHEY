// src/components/AuthGate.jsx
// Toggles between the sign-in screen and the "register your company" screen
// for anyone who isn't authenticated yet.

import { useState } from "react";
import Login from "../pages/Login";
import Signup from "../pages/Signup";

export default function AuthGate() {
  const [mode, setMode] = useState("login");

  return mode === "login"
    ? <Login onSwitchToSignup={() => setMode("signup")} />
    : <Signup onSwitchToLogin={() => setMode("login")} />;
}
