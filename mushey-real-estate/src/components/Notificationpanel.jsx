// src/components/NotificationPanel.jsx
import { Bell, X, CheckCircle } from "@phosphor-icons/react";
import { daysUntilExpiry } from "../utils/Revenuecalc";
import "../styles/notificationPanel.css";

export default function NotificationPanel({ properties, onClose, onSelectContract }) {

  const notifications = properties
    .filter(p => {
      if (!p.contractEnd) return false;
      const d = daysUntilExpiry(p.contractEnd);
      return d !== null && d >= -7 && d <= 30;
    })
    .sort((a, b) => daysUntilExpiry(a.contractEnd) - daysUntilExpiry(b.contractEnd));

  const urgency = (days) => {
    if (days < 0)   return { color: "var(--red)",    label: "Expired",       dot: "red" };
    if (days <= 1)  return { color: "var(--red)",    label: "Tomorrow!",     dot: "red" };
    if (days <= 7)  return { color: "var(--red)",    label: `${days}d left`, dot: "red" };
    if (days <= 14) return { color: "var(--orange)", label: `${days}d left`, dot: "orange" };
    return              { color: "var(--text-sub)", label: `${days}d left`, dot: "gray" };
  };

  return (
    <div className="np-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="np-panel">

        <div className="np-header">
          <div className="np-header-left">
            <span className="np-icon"><Bell size={16} weight="fill" /></span>
            <h2>Notifications</h2>
            {notifications.length > 0 && (
              <span className="np-count">{notifications.length}</span>
            )}
          </div>
          <button className="np-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <div className="np-body">
          {notifications.length === 0 ? (
            <div className="np-empty">
              <div className="np-empty-icon"><CheckCircle size={32} weight="thin" /></div>
              <p>No contracts expiring in the next 30 days</p>
            </div>
          ) : (
            notifications.map(p => {
              const days = daysUntilExpiry(p.contractEnd);
              const u    = urgency(days);
              return (
                <div
                  className="np-item"
                  key={`${p.area}-${p.id}`}
                  onClick={() => { onSelectContract(p); onClose(); }}
                >
                  <div className={`np-dot ${u.dot}`} />
                  <div className="np-item-body">
                    <div className="np-item-name">{p.tenantName || "Unknown"}</div>
                    <div className="np-item-meta">{p.propertyName} · {p.area}</div>
                    <div className="np-item-date">
                      Contract ends: <strong>{p.contractEnd}</strong>
                    </div>
                  </div>
                  <div className="np-item-days" style={{ color: u.color }}>
                    {u.label}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="np-footer">
          <p>
            Emails sent at <strong>14 days</strong>, <strong>7 days</strong>,
            and <strong>1 day</strong> before — once each, stored in Firebase.
          </p>
        </div>

      </div>
    </div>
  );
}