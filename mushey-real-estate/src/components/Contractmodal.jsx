// src/components/ContractModal.jsx
import { daysUntilExpiry, contractMonths, contractTotalRevenue, fmtTZS } from "../utils/Revenuecalc";
import "../styles/contractModal.css";

export default function ContractModal({ contract, onClose }) {
  if (!contract) return null;

  const days        = daysUntilExpiry(contract.contractEnd);
  const months      = contractMonths(contract.contractStart, contract.contractEnd);
  const totalValue  = contractTotalRevenue(contract.rent, contract.contractStart, contract.contractEnd);
  const initials    = (contract.tenantName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const statusColor =
    days === null      ? "var(--text-muted)" :
    days < 0           ? "var(--red)"        :
    days <= 14         ? "var(--red)"        :
    days <= 30         ? "var(--orange)"     :
                         "var(--green)";

  const statusLabel =
    days === null ? "No date set"        :
    days < 0      ? "Expired"            :
    days <= 14    ? `⚠️ Expires in ${days} days` :
    days <= 30    ? `Expires in ${days} days`    :
                    "Active";

  const progress = (() => {
    if (!contract.contractStart || !contract.contractEnd) return 0;
    const total   = new Date(contract.contractEnd) - new Date(contract.contractStart);
    const elapsed = new Date() - new Date(contract.contractStart);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  return (
    <div className="cm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal">

        {/* Header */}
        <div className="cm-header">
          <div className="cm-avatar">{initials}</div>
          <div className="cm-header-info">
            <h2>{contract.tenantName || "Unknown Tenant"}</h2>
            <p>{contract.propertyName} &nbsp;·&nbsp; {contract.area} &nbsp;·&nbsp; {contract.type || "Property"}</p>
          </div>
          <button className="cm-close" onClick={onClose}>✕</button>
        </div>

        {/* Status bar */}
        <div className="cm-status-bar" style={{ borderColor: statusColor }}>
          <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
          {contract.phone && <span className="cm-phone">📞 {contract.phone}</span>}
        </div>

        {/* Body */}
        <div className="cm-body">

          {/* Contract dates */}
          <div className="cm-section">
            <div className="cm-section-title">Contract Details</div>
            <div className="cm-grid">
              <div className="cm-field">
                <span className="cm-field-label">Start Date</span>
                <span className="cm-field-value">{contract.contractStart || "—"}</span>
              </div>
              <div className="cm-field">
                <span className="cm-field-label">End Date</span>
                <span className="cm-field-value">{contract.contractEnd || "—"}</span>
              </div>
              <div className="cm-field">
                <span className="cm-field-label">Duration</span>
                <span className="cm-field-value">{months > 0 ? `${months} months` : "—"}</span>
              </div>
              <div className="cm-field">
                <span className="cm-field-label">Days Remaining</span>
                <span className="cm-field-value" style={{ color: statusColor }}>
                  {days === null ? "—" : days < 0 ? "Expired" : `${days} days`}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            {contract.contractStart && contract.contractEnd && (
              <div className="cm-progress-wrap">
                <div className="cm-progress-labels">
                  <span>{contract.contractStart}</span>
                  <span>{Math.round(progress)}% elapsed</span>
                  <span>{contract.contractEnd}</span>
                </div>
                <div className="cm-progress-bar">
                  <div
                    className="cm-progress-fill"
                    style={{
                      width: `${progress}%`,
                      background: progress > 85 ? "var(--red)" : progress > 65 ? "var(--orange)" : "var(--gold)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial */}
          <div className="cm-section">
            <div className="cm-section-title">Financial</div>
            <div className="cm-grid">
              <div className="cm-field">
                <span className="cm-field-label">Monthly Rent</span>
                <span className="cm-field-value gold">{fmtTZS(contract.rent)}</span>
              </div>
              <div className="cm-field">
                <span className="cm-field-label">Total Contract Value</span>
                <span className="cm-field-value gold">{months > 0 ? fmtTZS(totalValue) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          <div className="cm-section">
            <div className="cm-section-title">Payment Status</div>
            <div className="cm-payment-checks">
              {[
                { label: "🏠 Rent",                   paid: contract.rentPaid },
                { label: "🧹 Cleanliness",            paid: contract.cleaningPaid },
                { label: "💧 Dirty Water Collection", paid: contract.waterPaid },
              ].map(item => (
                <div className="cm-check-row" key={item.label}>
                  <span className="cm-check-label">{item.label}</span>
                  <span className={`badge ${item.paid ? "paid" : "unpaid"}`}>
                    {item.paid ? "✓ Paid" : "✗ Unpaid"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ID Verification */}
          {contract.idNumber && (
            <div className="cm-section">
              <div className="cm-section-title">Tenant ID Verification</div>
              <div className="cm-grid">
                <div className="cm-field">
                  <span className="cm-field-label">ID Type</span>
                  <span className="cm-field-value">{contract.idType || "—"}</span>
                </div>
                <div className="cm-field">
                  <span className="cm-field-label">ID Number</span>
                  <span className="cm-field-value">{contract.idNumber}</span>
                </div>
                <div className="cm-field">
                  <span className="cm-field-label">Status</span>
                  <span className={`badge ${contract.idVerified ? "active" : "expiring"}`}>
                    {contract.idVerified ? "✓ Verified" : "Unverified"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="cm-section">
              <div className="cm-section-title">Notes</div>
              <p className="cm-notes">{contract.notes}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="cm-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}