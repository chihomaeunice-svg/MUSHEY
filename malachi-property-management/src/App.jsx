// App.jsx
import { useState, lazy, Suspense } from "react";
import { SignOut } from "@phosphor-icons/react";
import { logout } from "./firebase/auth";
import Layout from "./pages/Layout";
import { AuthProvider } from "./components/AuthProvider";
import { CompanyProvider, useCompany } from "./components/CompanyProvider";
import "./styles/globals.css";

// Split out of the initial bundle — each of these is only ever needed after
// login, and SuperAdmin's viewer never touches any of the company pages at all.
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Properties  = lazy(() => import("./pages/Properties"));
const Contracts   = lazy(() => import("./pages/Contracts"));
const Payments    = lazy(() => import("./pages/Payments"));
const Reports     = lazy(() => import("./pages/Reports"));
const Settings    = lazy(() => import("./pages/Settings"));
const Billing     = lazy(() => import("./pages/Billing"));
const SuperAdmin  = lazy(() => import("./pages/SuperAdmin"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

function Screens() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { loading, membership, company, error, refreshCompany } = useCompany();

  if (loading) {
    return <div className="app-loading">Loading your workspace…</div>;
  }

  if (membership?.role === "superAdmin") {
    return (
      <Suspense fallback={<div className="app-loading">Loading your workspace…</div>}>
        <SuperAdmin />
      </Suspense>
    );
  }

  if (error || !membership) {
    return (
      <div className="app-loading app-loading-stuck">
        <p>Your account isn't linked to a company yet. Please contact support.</p>
        <button className="btn btn-ghost" onClick={() => logout()}>
          <SignOut size={15} weight="regular" /> Sign Out
        </button>
      </div>
    );
  }

  // emailVerified is only required going forward — companies from before this
  // field existed have it as undefined, not false, and are grandfathered in
  // rather than locked out with no code ever having been sent to them.
  if (company && company.emailVerified === false) {
    return (
      <Suspense fallback={<div className="app-loading">Loading your workspace…</div>}>
        <VerifyEmail
          companyId={membership.companyId}
          email={company.contactEmail}
          onVerified={refreshCompany}
        />
      </Suspense>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":  return <Dashboard setCurrentPage={setCurrentPage} />;
      case "properties": return <Properties setCurrentPage={setCurrentPage} />;
      case "contracts":  return <Contracts />;
      case "payments":   return <Payments />;
      case "reports":    return <Reports />;
      case "settings":   return <Settings />;
      // Billing is an owner-only concern — a staff login can never reach it,
      // regardless of how currentPage got set (nav, a banner shortcut, etc.).
      case "billing":    return membership.role === "owner" ? <Billing /> : <Dashboard setCurrentPage={setCurrentPage} />;
      default:           return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      <Suspense fallback={<div className="app-loading">Loading…</div>}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <Screens />
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
