// pages/Billing.jsx
// Subscription status + payment history for this company (35,000 TZS/month).
// No payment gateway is wired up yet — payment is arranged directly with
// Mushey and the subscription period is extended on the account manually.

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import "../styles/billing.css";

const STATUS_LABELS = {
  trialing: { label: "Trial", className: "active" },
  active: { label: "Active", className: "active" },
  past_due: { label: "Payment Overdue", className: "expiring" },
  locked: { label: "Locked — Payment Required", className: "expired" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function Billing() {
  const { membership, company } = useCompany();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => { loadHistory(); }, [membership?.companyId]);

  const loadHistory = async () => {
    if (!membership?.companyId) return;
    setLoadingHistory(true);
    try {
      const snap = await getDocs(
        query(collection(db, "companies", membership.companyId, "subscriptionPayments"), orderBy("createdAt", "desc"))
      );
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!company) {
    return (
      <div className="billing">
        <div className="page-header"><h1>Billing</h1></div>
        <div className="empty-state"><p>Loading billing information…</p></div>
      </div>
    );
  }

  const status = STATUS_LABELS[company.subscriptionStatus] || STATUS_LABELS.trialing;
  const days = daysUntil(company.currentPeriodEnd);

  return (
    <div className="billing">
      <div className="page-header">
        <h1>Billing</h1>
        <p>Mushey subscription for {company.name}</p>
      </div>

      <div className="billing-grid">
        <div className="card">
          <h2 className="settings-card-title">Subscription Status</h2>

          <div className="billing-status-row">
            <span className={`badge ${status.className}`}>{status.label}</span>
            <span className="billing-amount">{Number(company.subscriptionAmount || 35000).toLocaleString()} TZS / month</span>
          </div>

          <div className="billing-period">
            {company.subscriptionStatus === "locked"
              ? "Payment is overdue beyond the grace period."
              : days !== null
                ? days >= 0
                  ? `${company.subscriptionStatus === "trialing" ? "Trial" : "Current period"} ends in ${days} day(s), on ${company.currentPeriodEnd}.`
                  : `Was due ${Math.abs(days)} day(s) ago, on ${company.currentPeriodEnd}.`
                : "No billing period set yet."}
          </div>

          <p className="billing-message">
            To pay, renew, or upgrade your subscription, contact Mushey directly —
            your account will be updated once payment is confirmed.
          </p>
        </div>

        <div className="card">
          <h2 className="settings-card-title">Payment History</h2>

          {loadingHistory ? (
            <p className="settings-card-sub">Loading…</p>
          ) : history.length === 0 ? (
            <p className="settings-card-sub">No payments recorded yet.</p>
          ) : (
            <div className="billing-history">
              {history.map((h) => (
                <div className="billing-history-row" key={h.id}>
                  <span className={`badge ${h.status === "paid" ? "paid" : h.status === "failed" ? "unpaid" : "expiring"}`}>
                    {h.status}
                  </span>
                  <span>{Number(h.amount || 0).toLocaleString()} TZS</span>
                  <span className="billing-history-ref">{h.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Billing;
