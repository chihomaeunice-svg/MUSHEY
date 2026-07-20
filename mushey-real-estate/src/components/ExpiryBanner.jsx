// src/components/ExpiryBanner.jsx
// Shows a dismissable in-app alert for contracts expiring within 14 days.

import { useState } from "react";
import { daysUntilExpiry } from "../utils/Revenuecalc";
import "../styles/expiryBanner.css";

export default function ExpiryBanner({ properties, onReview }) {
  const [dismissed, setDismissed] = useState([]);

  const critical = properties.filter((p) => {
    if (dismissed.includes(`${p.area}_${p.id}`)) return false;
    const d = daysUntilExpiry(p.contractEnd);
    return d !== null && d >= 0 && d <= 14;
  });

  if (critical.length === 0) return null;

  return (
    <div className="expiry-banner-wrap">
      {critical.map((p) => {
        const days = daysUntilExpiry(p.contractEnd);
        const key  = `${p.area}_${p.id}`;
        return (
          <div
            className={`expiry-alert ${days <= 3 ? "danger" : "warning"}`}
            key={key}
          >
            <span className="expiry-alert-icon">
              {days <= 3 ? "🔴" : "🟡"}
            </span>
            <div className="expiry-alert-body">
              <strong>{p.tenantName || "Unknown Tenant"}</strong>
              {" — "}
              {p.id}, {p.area}
              <span className="expiry-alert-date">
                Contract expires <b>{p.contractEnd}</b>
                {" "}({days === 0 ? "today!" : `in ${days} day${days !== 1 ? "s" : ""}`})
              </span>
            </div>

            <div className="expiry-alert-actions">
              <button
                type="button"
                className="expiry-alert-review"
                onClick={() => onReview ? onReview(p) : null}
                title="Review contract"
              >
                Review
              </button>
              <button
                className="expiry-alert-close"
                onClick={() => setDismissed((d) => [...d, key])}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}