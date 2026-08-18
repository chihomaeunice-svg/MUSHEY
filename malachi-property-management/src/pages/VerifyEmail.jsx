// src/pages/VerifyEmail.jsx
// Shown right after signup, before the dashboard, until the company's
// contact email is confirmed via the 6-digit code the onCompanyCreated
// Cloud Function emailed them.

import { useState } from "react";
import { WarningCircle, CheckCircle, EnvelopeSimple } from "@phosphor-icons/react";
import { verifyEmailOtp, resendEmailOtp } from "../firebase/otp";
import { logout } from "../firebase/auth";
import HeroSkyline from "../components/HeroSkyline";
import BrandMark from "../components/BrandMark";
import "../styles/login.css";

export default function VerifyEmail({ companyId, email, onVerified }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmailOtp(companyId, code.trim());
      onVerified();
    } catch (err) {
      setError(err.message || "Couldn't verify that code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      await resendEmailOtp(companyId);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <HeroSkyline />
        <div className="brand-logo">
          <div className="logo-box"><BrandMark size={20} /></div>
          <div className="logo-text">
            <h1>Malachi</h1>
            <span>Property Management</span>
          </div>
        </div>
        <div className="brand-headline">
          <h2>Almost<br /><span>there.</span></h2>
          <p>One quick step — confirm it's really you before we open up your workspace.</p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-box">
          <EnvelopeSimple size={32} weight="light" style={{ marginBottom: 12, color: "var(--accent)" }} />
          <h2 className="login-title">Verify your email</h2>
          <p className="login-sub">
            We sent a 6-digit code to <strong>{email || "your email"}</strong>. Enter it below to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading || code.length !== 6}>
              {loading && <span className="spinner" />}
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>

            {error && (
              <div className="login-error">
                <WarningCircle size={15} weight="fill" /> {error}
              </div>
            )}
            {resent && (
              <div className="login-error" style={{ color: "var(--green)" }}>
                <CheckCircle size={15} weight="fill" /> A new code is on its way.
              </div>
            )}
          </form>

          <p className="login-toggle">
            Didn't get it?{" "}
            <button type="button" onClick={handleResend} disabled={resending}>
              {resending ? "Sending…" : "Resend code"}
            </button>
          </p>
          <p className="login-toggle">
            <button type="button" onClick={() => logout()}>Sign out</button>
          </p>
        </div>
      </div>
    </div>
  );
}
