// src/pages/Signup.jsx
// "Installing" the app for a new company: creates the owner account and the
// company's own isolated workspace in one step. Each successful signup here
// is one enrollment the super-admin dashboard counts.

import { useState } from "react";
import { registerCompany } from "../firebase/company";
import "../styles/login.css";

const emptyForm = {
  companyName: "", tin: "", phone: "",
  ownerName: "", email: "", password: "", confirmPassword: "",
};

export default function Signup({ onSwitchToLogin }) {
  const [form, setForm]       = useState(emptyForm);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await registerCompany({
        companyName: form.companyName,
        tin: form.tin,
        phone: form.phone,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
      });
      // onAuthStateChanged in AuthProvider picks up the new session automatically.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Left: Branding */}
      <div className="login-brand">
        <div className="brand-logo">
          <div className="logo-box">🏢</div>
          <div className="logo-text">
            <h1>Mushey Real Estate</h1>
            <span>Property Management</span>
          </div>
        </div>

        <div className="brand-headline">
          <h2>Bring your<br /><span>properties</span><br />online.</h2>
          <p>
            Register your company to get your own private workspace —
            tenants, contracts, payments, and receipts, separate from
            every other company on Mushey.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="login-form-panel">
        <div className="login-box">
          <h2 className="login-title">Register your company</h2>
          <p className="login-sub">Set up your workspace in a minute</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="companyName">Company / Landlord Name *</label>
              <input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="e.g. Mushey Real Estate Ltd"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="tin">TIN (optional)</label>
              <input
                id="tin"
                value={form.tin}
                onChange={(e) => set("tin", e.target.value)}
                placeholder="e.g. 123-456-789"
              />
            </div>

            <div className="login-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0712 345 678"
              />
            </div>

            <div className="login-field">
              <label htmlFor="ownerName">Your Name *</label>
              <input
                id="ownerName"
                value={form.ownerName}
                onChange={(e) => set("ownerName", e.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="owner@company.co.tz"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="login-field">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Repeat password"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Creating your workspace…" : "Create company workspace"}
            </button>

            {error && (
              <div className="login-error">
                ⚠️ {error}
              </div>
            )}
          </form>

          <p className="login-toggle">
            Already registered?{' '}
            <button type="button" onClick={onSwitchToLogin}>
              Sign in
            </button>
          </p>
        </div>
      </div>

    </div>
  );
}
