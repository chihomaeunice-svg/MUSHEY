// src/components/RecordPaymentModal.jsx
// Shown when marking a fee as paid: captures the amount, an optional (or
// company-required) receipt photo, records the payment, and generates a
// TRA-styled PDF receipt.

import { useState } from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import PhotoUpload from "./PhotoUpload";
import { recordPayment } from "../firebase/receipts";
import { generateReceiptPdf } from "../utils/receiptPdf";
import "../styles/recordPaymentModal.css";

const TYPE_LABELS = { rent: "Rent", cleaning: "Cleanliness Fee", water: "Dirty Water Collection" };

export default function RecordPaymentModal({ companyId, company, property, type, onClose, onRecorded }) {
  const [amount, setAmount] = useState(type === "rent" ? property.rent || "" : "");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requirePhoto = !!company?.requireReceiptUpload;

  const handleConfirm = async () => {
    if (requirePhoto && !receiptPhotoUrl) {
      setError("This company requires a receipt photo before confirming payment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payment = await recordPayment(companyId, {
        property, type, amount, receiptPhotoUrl,
      });
      generateReceiptPdf({ company, payment });
      onRecorded(payment);
    } catch (e) {
      setError("Failed to record payment: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Record {TYPE_LABELS[type]} Payment</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="rpm-property">
            {property.tenantName || "Unknown Tenant"} · {property.propertyName} · {property.area}
          </p>

          <div className="form-group">
            <label>Amount (TZS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250000"
            />
          </div>

          <PhotoUpload
            storagePath={`companies/${companyId}/properties/${property.id}/receipts`}
            currentUrl={receiptPhotoUrl}
            label="Receipt Photo"
            required={requirePhoto}
            onUploaded={setReceiptPhotoUrl}
          />

          {error && <div className="login-error" style={{ marginTop: 12 }}><WarningCircle size={15} weight="fill" /> {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : "Confirm & Print Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
