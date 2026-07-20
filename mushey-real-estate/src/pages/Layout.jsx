// src/pages/Layout.jsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { logout } from "../firebase/auth";
import { checkAndNotify } from "../utils/Notifications";
import { useCompany } from "../components/CompanyProvider";
import ExpiryBanner from "../components/ExpiryBanner";
import SubscriptionBanner from "../components/SubscriptionBanner";
import NotificationPanel from "../components/Notificationpanel";
import "../styles/layout.css";

const navItems = [
  { icon: "⊞", label: "Dashboard",  page: "dashboard" },
  { icon: "🏠", label: "Properties", page: "properties" },
  { icon: "📄", label: "Contracts",  page: "contracts" },
  { icon: "💳", label: "Payments",   page: "payments" },
  { icon: "📊", label: "Reports",    page: "reports" },
  { icon: "💰", label: "Billing",    page: "billing" },
  { icon: "⚙️", label: "Settings",   page: "settings" },
];

// Pages still reachable once a company's subscription is locked — enough to
// pay and manage the account, nothing that manages tenants/properties.
const ALLOWED_WHEN_LOCKED = ["billing", "settings"];

const pageLabels = {
  dashboard:  "Dashboard",
  properties: "Properties",
  contracts:  "Contracts",
  payments:   "Payments",
  reports:    "Reports",
  billing:    "Billing",
  settings:   "Settings",
};

function Layout({ currentPage, setCurrentPage, children }) {
  const { membership, company } = useCompany();
  const [allProperties, setAllProperties]   = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const locked = company?.subscriptionStatus === "locked";

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  useEffect(() => {
    if (locked && !ALLOWED_WHEN_LOCKED.includes(currentPage)) {
      setCurrentPage("billing");
    }
  }, [locked, currentPage]);

  useEffect(() => {
    if (!membership?.companyId) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "companies", membership.companyId, "properties"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllProperties(list);

        // Fire email alerts for contracts within 14 days (throttled to once/week)
        await checkAndNotify(membership.companyId, list, company?.notifyEmail);
      } catch (e) {
        console.error("Layout load error:", e);
      }
    };
    load();
  }, [membership?.companyId]);

  const handleLogout = async () => {
    if (window.confirm(`Sign out of ${company?.name || "Mushey Real Estate"}?`)) {
      await logout();
    }
  };

  // Count contracts expiring within 14 days for badge
  const expiringCount = allProperties.filter((p) => {
    if (!p.contractEnd) return false;
    const d = Math.ceil((new Date(p.contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
    return d >= 0 && d <= 14;
  }).length;

  return (
    <div className="app-layout">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏢</div>
          <h2>{company?.name || "Mushey Real Estate"}</h2>
          <span>Property Management</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map((item) => {
            const disabled = locked && !ALLOWED_WHEN_LOCKED.includes(item.page);
            return (
            <button
              key={item.page}
              className={`nav-link ${currentPage === item.page ? "active" : ""}`}
              onClick={() => !disabled && setCurrentPage(item.page)}
              disabled={disabled}
              style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              title={disabled ? "Locked — pay your subscription to unlock" : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.page === "contracts" && expiringCount > 0 && (
                <span className="nav-badge">{expiringCount}</span>
              )}
            </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
          <p>Mushey Real Estate © 2025</p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb">
              Admin / <span>{pageLabels[currentPage]}</span>
            </span>
          </div>
          <div className="topbar-right" style={{ position: "relative" }}>

            {/* Bell button — opens notification panel */}
            {expiringCount > 0 && (
              <button
                className="topbar-alert"
                onClick={() => setShowNotifPanel((v) => !v)}
                title="View expiring contracts"
              >
                🔔 <span>{expiringCount} expiring</span>
              </button>
            )}

            <span className="date-tag">{today}</span>
            <div className="admin-avatar">M</div>

            {/* Notification panel dropdown */}
            {showNotifPanel && (
              <NotificationPanel
                properties={allProperties}
                onClose={() => setShowNotifPanel(false)}
              />
            )}
          </div>
        </header>

        <main className="page-body">
          <SubscriptionBanner
            company={company}
            onGoToBilling={() => setCurrentPage("billing")}
          />
          <ExpiryBanner
            properties={allProperties}
            onReview={() => setCurrentPage("contracts")}
          />
          {children}
        </main>
      </div>

    </div>
  );
}

export default Layout;