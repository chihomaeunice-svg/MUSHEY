// src/components/ContactForm.jsx
// Landing page "get in touch" form — the email counterpart to the WhatsApp
// button, for people who'd rather not reach out that way. Submissions are
// recorded in Firestore and emailed to Malachi (see functions/inquiries.js);
// until an email provider is configured, that email queues instead of
// sending, same as everything else that calls sendEmail() right now.

import { useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { submitInquiry } from "../firebase/inquiries";

const emptyForm = { name: "", email: "", message: "" };

export default function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await submitInquiry(form.name, form.email, form.message);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="landing-contact-thanks">
        <CheckCircle size={28} weight="fill" />
        <p>Thanks for reaching out — we're glad you're interested, and we'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form className="landing-contact-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Your name"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="How can we help?"
          rows={4}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? "Sending…" : "Send Message"}
      </button>
      {error && <div className="login-error" style={{ marginTop: 12 }}><WarningCircle size={15} weight="fill" /> {error}</div>}
    </form>
  );
}
