// src/pages/Landing.jsx
// Public marketing homepage — shown before anyone signs in or registers.
// Explains what Malachi does and funnels into Signup (trial) or Login.

import { useEffect, useState } from "react";
import {
  House, CreditCard, BellRinging, ChartBar,
  CheckCircle, ArrowRight,
} from "@phosphor-icons/react";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";
import LandingSkyline from "../components/LandingSkyline";
import WhatsAppButton from "../components/WhatsAppButton";
import { useParallax } from "../utils/useParallax";
import "../styles/landing.css";

const FEATURES = [
  {
    icon: House,
    title: "Tenants & contracts in one place",
    body: "Every property, tenant, and lease lives under your company's own workspace — with ID verification and automatic warnings before a contract expires.",
  },
  {
    icon: CreditCard,
    title: "Payments with real receipts",
    body: "Mark rent, cleaning, and water fees as paid, and generate a TRA-styled PDF receipt on the spot. Require a photo of the payment slip if you want an extra check.",
  },
  {
    icon: BellRinging,
    title: "Reminders that send themselves",
    body: "Email and SMS reminders go out automatically for rent due dates and expiring contracts — to you and your tenant, no manual follow-up needed.",
  },
  {
    icon: ChartBar,
    title: "Reports that show real profit",
    body: "See collection rate, outstanding balances, and revenue by area — projected forward by month or by year, in whole numbers you can trust.",
  },
];

const STEPS = [
  { n: "1", title: "Register your company", body: "Start a 14-day free trial — no card required." },
  { n: "2", title: "Add your properties", body: "Organize by area, set rent, and add tenant details as you go." },
  { n: "3", title: "Track everything from day one", body: "Payments, contracts, and profit — updated the moment you record them." },
];

export default function Landing({ onGetStarted, onSignIn }) {
  const [mounted, setMounted] = useState(false);
  const heroRef = useParallax(0.4);
  const visualRef = useParallax(1.2);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`landing ${mounted ? "mounted" : ""}`}>
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-nav-logo"><BrandMark size={18} /></div>
          <span>Malachi Property Management</span>
        </div>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <button className="btn btn-ghost" onClick={onSignIn}>Sign in</button>
          <button className="btn btn-primary" onClick={onGetStarted}>Start free trial</button>
        </div>
      </header>

      <section className="landing-hero" ref={heroRef}>
        <LandingSkyline />
        <div className="landing-hero-content stagger-in" style={{ "--stagger-i": 0 }}>
          <span className="landing-eyebrow">Property management, built for landlords</span>
          <h1>Run your rentals<br />from one place.</h1>
          <p>
            Track tenants, contracts, and payments across every property you
            own — with TRA-styled receipts, automatic reminders, and reports
            that show exactly what you've collected.
          </p>
          <div className="landing-hero-actions">
            <button className="btn btn-primary" onClick={onGetStarted}>
              Start free trial <ArrowRight size={15} weight="bold" />
            </button>
            <button className="btn btn-ghost" onClick={onSignIn}>Sign in</button>
          </div>
          <div className="landing-hero-trust">
            <span><CheckCircle size={14} weight="fill" /> 14-day free trial</span>
            <span><CheckCircle size={14} weight="fill" /> No card required</span>
            <span><CheckCircle size={14} weight="fill" /> Your data stays private to your company</span>
          </div>
        </div>
        <div className="landing-hero-visual stagger-in" style={{ "--stagger-i": 1 }}>
          <div className="landing-parallax-wrap" ref={visualRef}>
            <img
              className="landing-shot landing-shot-house landing-float"
              src="/screenshots/house-preview.png"
              alt="Illustration of a house at golden hour, representing a property managed in Malachi"
            />
            <img
              className="landing-shot landing-shot-main landing-float"
              src="/screenshots/dashboard-preview.png"
              alt="Malachi dashboard showing a 75% rent collection rate, property and tenant counts, and rent by area"
            />
            <img
              className="landing-shot landing-shot-accent landing-float"
              src="/screenshots/payment-preview.png"
              alt="Payment card showing rent, cleanliness, and water fees all marked as paid"
            />
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Everything a landlord actually needs</h2>
          <p>No modules to configure, no setup calls — it works the way you already manage properties.</p>
        </div>
        <div className="landing-feature-list">
          {FEATURES.map((f, i) => (
            <div className={`landing-feature stagger-in ${i % 2 === 1 ? "reverse" : ""}`} key={f.title} style={{ "--stagger-i": i }}>
              <div className="landing-feature-icon"><f.icon size={28} weight="regular" /></div>
              <div className="landing-feature-text">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-steps">
        <div className="landing-section-header">
          <h2>Get set up in a few minutes</h2>
        </div>
        <div className="landing-steps-list">
          {STEPS.map((s, i) => (
            <div className="landing-step stagger-in" key={s.n} style={{ "--stagger-i": i }}>
              <div className="landing-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-pricing">
        <div className="landing-pricing-card">
          <div className="landing-pricing-amount" style={{ fontSize: 28 }}>Simple, fair pricing</div>
          <p>One plan per company, tailored to how many properties you manage. Start with a 14-day free trial — no payment details needed up front, and no fixed monthly billing cycle required.</p>
          <button className="btn btn-primary" onClick={onGetStarted}>Start free trial</button>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-footer-brand">
          <BrandMark size={16} /> Malachi Property Management © {new Date().getFullYear()}
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <WhatsAppButton className="landing-footer-link" message="Hi, I have a question about Malachi Property Management.">
            Chat with us
          </WhatsAppButton>
          <button className="landing-footer-link" onClick={onSignIn}>Sign in</button>
        </div>
      </footer>
    </div>
  );
}
