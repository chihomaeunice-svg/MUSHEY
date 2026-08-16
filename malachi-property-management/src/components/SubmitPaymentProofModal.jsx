// src/components/SubmitPaymentProofModal.jsx
// A company submits proof they've paid their Malachi subscription (M-Pesa
// screenshot, bank slip, etc.) — this does NOT unlock the account by itself
// (firestore.rules blocks clients from touching subscription fields). It
// just creates a record a superAdmin reviews and approves.

import { useState } from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import PhotoUpload from "./PhotoUpload";

export default function SubmitPaymentProofModal({ companyId, onClose, onSubmitted }) {
  const [amount, setAmount] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Enter the amount you actually paid — it must be greater than 0.");
      return;
    }
    if (!proofPhotoUrl) {
      setError("Attach a photo of your payment confirmation (M-Pesa message, bank slip, etc.).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "companies", companyId, "subscriptionPayments"), {
        amount: Number(amount),
        proofPhotoUrl,
        note,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      onSubmitted();
    } catch (e) {
      setError("Failed to submit: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Submit Proof of Payment</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="settings-card-sub">
            Paid your subscription directly with Malachi? Attach proof here — a superAdmin
            reviews it and updates your account once confirmed. This doesn't unlock anything
            automatically.
          </p>

          <div className="form-group">
            <label>Amount Paid (TZS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 35000"
            />
          </div>

          <PhotoUpload
            storagePath={`companies/${companyId}/subscriptionPayments/proofs`}
            currentUrl={proofPhotoUrl}
            label="Payment Proof Photo"
            required
            onUploaded={setProofPhotoUrl}
          />

          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. M-Pesa ref, which period this covers"
            />
          </div>

          {error && <div className="login-error" style={{ marginTop: 12 }}><WarningCircle size={15} weight="fill" /> {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
