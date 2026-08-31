// src/components/SetRateModal.jsx
// SuperAdmin-only: set or change a company's subscription rate and billing
// frequency directly, instead of it only ever being inferred through the
// proof-approval flow (or set by hand in the Firebase console).

import { useState } from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FREQUENCY_LABELS } from "../utils/billing";

export default function SetRateModal({ company, onClose, onSaved }) {
  const [amount, setAmount] = useState(company.subscriptionAmount || "");
  const [frequency, setFrequency] = useState(company.subscriptionFrequency || "monthly");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Enter a rate greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "companies", company.id), {
        subscriptionAmount: Number(amount),
        subscriptionFrequency: frequency,
      });
      onSaved({ ...company, subscriptionAmount: Number(amount), subscriptionFrequency: frequency });
    } catch (e) {
      setError("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Set Subscription Rate</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="rpm-property">{company.name}</p>

          <div className="form-group">
            <label>Rate (TZS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 35000"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Billing Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4 }}>
            This is what the company owes each billing period going forward — it doesn't change their current period end
            date or subscription status. Use the lock/unlock action for access control.
          </p>

          {error && <div className="login-error" style={{ marginTop: 12 }}><WarningCircle size={15} weight="fill" /> {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Rate"}
          </button>
        </div>
      </div>
    </div>
  );
}
