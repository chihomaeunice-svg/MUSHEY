// src/pages/Login.jsx
import { useState } from "react";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { login } from "../firebase/auth";
import BrandMark from "../components/BrandMark";
import HeroSkyline from "../components/HeroSkyline";
import ThemeToggle from "../components/ThemeToggle";
import { useParallax } from "../utils/useParallax";
import "../styles/login.css";

export default function Login({ onSwitchToSignup, onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const brandRef = useParallax(0.6);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Left: Branding */}
      <div className="login-brand" ref={brandRef}>
        <HeroSkyline />
        <button
          type="button"
          className="brand-logo brand-logo-btn"
          onClick={onBack}
          disabled={!onBack}
        >
          <div className="logo-box"><BrandMark size={20} /></div>
          <div className="logo-text">
            <h1>Malachi</h1>
            <span>Property Management</span>
          </div>
        </button>

        <div className="brand-headline">
          <h2>Manage your<br /><span>properties</span><br />with ease.</h2>
          <p>
            Track tenants, contracts, payments, and profits
            across all your areas — from one clean dashboard.
          </p>
        </div>

        <div className="brand-stats">
          <div className="brand-stat">
            <div className="value">10</div>
            <div className="label">Areas</div>
          </div>
          <div className="brand-stat">
            <div className="value">3</div>
            <div className="label">Fee Types</div>
          </div>
          <div className="brand-stat">
            <div className="value">6M</div>
            <div className="label">Reports</div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="login-form-panel">
        {onBack && (
          <button type="button" className="login-back-btn" onClick={onBack}>
            <ArrowLeft size={15} weight="bold" /> Back
          </button>
        )}
        <ThemeToggle className="login-theme-toggle" />
        <div className="login-box">
          <h2 className="login-title">Welcome back</h2>
          <p className="login-sub">Sign in to your admin account</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@malachi.co.tz"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>

            {error && (
              <div className="login-error">
                <WarningCircle size={15} weight="fill" /> {error}
              </div>
            )}
          </form>

          <p className="login-toggle">
            New landlord or company?{' '}
            <button type="button" onClick={onSwitchToSignup}>
              Register your company
            </button>
          </p>

          <div className="login-divider">
            <span>Malachi Property Management</span>
          </div>

          <p className="login-footer-note">
            Each company's data is fully separate.<br />Staff accounts are added by your company owner.
          </p>
        </div>
      </div>

    </div>
  );
}
