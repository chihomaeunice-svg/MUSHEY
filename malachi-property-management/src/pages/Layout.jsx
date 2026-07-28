// src/pages/Layout.jsx
import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  SquaresFour, House, FileText, CreditCard, ChartBar, Wallet, Gear,
  SignOut, List, Bell,
} from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";
import { logout } from "../firebase/auth";
import { checkAndNotify } from "../utils/Notifications";
import { useCompany } from "../components/CompanyProvider";
import BrandMark from "../components/BrandMark";
import ExpiryBanner from "../components/ExpiryBanner";
import SubscriptionBanner from "../components/SubscriptionBanner";
import NotificationPanel from "../components/Notificationpanel";
import ThemeToggle from "../components/ThemeToggle";
import PageBackdrop from "../components/PageBackdrop";
import "../styles/layout.css";
import "../styles/pageBackdrop.css";

const navItems = [
  { icon: SquaresFour, label: "Dashboard",  page: "dashboard" },
  { icon: House,       label: "Properties", page: "properties" },
  { icon: FileText,    label: "Contracts",  page: "contracts" },
  { icon: CreditCard,  label: "Payments",   page: "payments" },
  { icon: ChartBar,    label: "Reports",    page: "reports" },
  { icon: Wallet,      label: "Billing",    page: "billing" },
  { icon: Gear,        label: "Settings",   page: "settings" },
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
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const touchStart = useRef(null);

  const locked = company?.subscriptionStatus === "locked";
  const companyInitial = (company?.name || "M").trim().charAt(0).toUpperCase() || "M";

  // Pages reachable right now, in nav order — used for swipe navigation.
  const swipablePages = navItems
    .filter((item) => !(locked && !ALLOWED_WHEN_LOCKED.includes(item.page)))
    .map((item) => item.page);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const idx = swipablePages.indexOf(currentPage);
    if (idx === -1) return;
    if (dx < 0 && idx < swipablePages.length - 1) setCurrentPage(swipablePages[idx + 1]);
    if (dx > 0 && idx > 0) setCurrentPage(swipablePages[idx - 1]);
  };

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
    if (window.confirm(`Sign out of ${company?.name || "Malachi Property Management"}?`)) {
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

      {/* Mobile backdrop — tap outside the drawer to close it */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><BrandMark size={20} /></div>
          <h2>{company?.name || "Malachi"}</h2>
          <span>Property Management</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map((item) => {
            const disabled = locked && !ALLOWED_WHEN_LOCKED.includes(item.page);
            const Icon = item.icon;
            return (
            <button
              key={item.page}
              className={`nav-link ${currentPage === item.page ? "active" : ""}`}
              onClick={() => { if (!disabled) { setCurrentPage(item.page); setSidebarOpen(false); } }}
              disabled={disabled}
              style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              title={disabled ? "Locked — pay your subscription to unlock" : undefined}
            >
              <span className="nav-icon"><Icon size={17} weight="regular" /></span>
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
            <SignOut size={16} weight="regular" /> Sign Out
          </button>
          <p>Malachi Property Management © 2025</p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">
        <PageBackdrop />
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <List size={18} weight="regular" />
            </button>
            <span className="breadcrumb">
              Admin / <span>{pageLabels[currentPage]}</span>
            </span>
          </div>
          <div className="topbar-right" style={{ position: "relative" }}>

            <ThemeToggle />

            {/* Bell button — opens notification panel */}
            {expiringCount > 0 && (
              <button
                className="topbar-alert"
                onClick={() => setShowNotifPanel((v) => !v)}
                title="View expiring contracts"
              >
                <Bell size={14} weight="fill" /> <span>{expiringCount} expiring</span>
              </button>
            )}

            <span className="date-tag">{today}</span>

            <button
              className="admin-avatar"
              onClick={() => setShowProfileMenu((v) => !v)}
              aria-label="Account menu"
              aria-expanded={showProfileMenu}
            >
              {companyInitial}
            </button>

            {showProfileMenu && (
              <>
                <div className="profile-menu-overlay" onClick={() => setShowProfileMenu(false)} />
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <div className="profile-menu-name">{company?.name || "Your company"}</div>
                    <div className="profile-menu-email">{company?.contactEmail}</div>
                  </div>
                  <button
                    className="profile-menu-item"
                    onClick={() => { setCurrentPage("settings"); setShowProfileMenu(false); }}
                  >
                    <Gear size={15} weight="regular" /> Account Settings
                  </button>
                  <button className="profile-menu-item danger" onClick={handleLogout}>
                    <SignOut size={15} weight="regular" /> Sign Out
                  </button>
                </div>
              </>
            )}

            {/* Notification panel dropdown */}
            {showNotifPanel && (
              <NotificationPanel
                properties={allProperties}
                onClose={() => setShowNotifPanel(false)}
              />
            )}
          </div>
        </header>

        <main
          className="page-body"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <SubscriptionBanner
            company={company}
            onGoToBilling={() => setCurrentPage("billing")}
          />
          <ExpiryBanner
            properties={allProperties}
            onReview={() => setCurrentPage("contracts")}
          />
          <div className="page-transition" key={currentPage}>
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

export default Layout;