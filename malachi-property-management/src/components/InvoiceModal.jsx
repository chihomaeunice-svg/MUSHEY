// src/components/InvoiceModal.jsx
// Pick a billing period and due date, then generate a downloadable invoice
// PDF for a single property — for the landlord to send to their tenant
// directly (WhatsApp, email, etc.), no in-app delivery involved.

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { generateInvoicePdf } from "../utils/invoicePdf";
import "../styles/recordPaymentModal.css";

function defaultPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultDueDate() {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), 5);
  if (due < now) due.setMonth(due.getMonth() + 1);
  return due.toISOString().slice(0, 10);
}

export default function InvoiceModal({ company, property, onClose }) {
  const [period, setPeriod] = useState(defaultPeriod());
  const [dueDate, setDueDate] = useState(defaultDueDate());

  const total =
    Number(property.rent || 0) +
    (property.cleaningIncluded ? 0 : Number(property.cleaningFee || 0)) +
    (property.waterIncluded ? 0 : Number(property.waterFee || 0));

  const handleGenerate = () => {
    generateInvoicePdf({ company, property, period, dueDate });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Generate Invoice</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="rpm-property">
            {property.tenantName || "Unknown Tenant"} · {property.propertyName} · {property.area}
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Billing Period</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Line Items</label>
            <div style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.8 }}>
              <div>Rent — {Number(property.rent || 0).toLocaleString()} TZS</div>
              <div>
                Cleanliness Fee — {property.cleaningIncluded
                  ? "included in rent"
                  : `${Number(property.cleaningFee || 0).toLocaleString()} TZS`}
              </div>
              <div>
                Dirty Water Collection — {property.waterIncluded
                  ? "included in rent"
                  : `${Number(property.waterFee || 0).toLocaleString()} TZS`}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Total Due</label>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--accent)" }}>
              {total.toLocaleString()} TZS
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleGenerate}>Generate & Download</button>
        </div>
      </div>
    </div>
  );
}
