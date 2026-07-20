// src/components/SubscriptionBanner.jsx
// Persistent (non-dismissable) banner shown when a company's subscription is
// overdue or locked. Not dismissable on purpose — this is a billing state,
// not an informational alert.

export default function SubscriptionBanner({ company, onGoToBilling }) {
  const status = company?.subscriptionStatus;
  if (status !== "past_due" && status !== "locked") return null;

  const locked = status === "locked";

  return (
    <div
      style={{
        background: locked ? "var(--red-dim)" : "var(--orange-dim)",
        border: `1px solid ${locked ? "#e74c3c30" : "#f39c1230"}`,
        borderRadius: "var(--radius)",
        padding: "12px 16px",
        marginBottom: "20px",
        color: locked ? "var(--red)" : "var(--orange)",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
      }}
    >
      <span>
        {locked
          ? <><strong>Subscription locked.</strong> Payment is overdue past the grace period — pay now to restore full access.</>
          : <><strong>Payment overdue.</strong> Renews at {Number(company.subscriptionAmount || 35000).toLocaleString()} TZS/month — pay soon to avoid losing access.</>}
      </span>
      <button
        onClick={onGoToBilling}
        style={{
          background: "transparent",
          border: `1px solid currentColor`,
          color: "inherit",
          borderRadius: "99px",
          padding: "5px 14px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Go to Billing
      </button>
    </div>
  );
}
