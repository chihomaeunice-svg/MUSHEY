// App.jsx
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { logout } from "./firebase/auth";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Contracts from "./pages/Contracts";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import SuperAdmin from "./pages/SuperAdmin";
import VerifyEmail from "./pages/VerifyEmail";
import { AuthProvider } from "./components/AuthProvider";
import { CompanyProvider, useCompany } from "./components/CompanyProvider";
import "./styles/globals.css";

function Screens() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { loading, membership, company, error, refreshCompany } = useCompany();

  if (loading) {
    return <div className="app-loading">Loading your workspace…</div>;
  }

  if (membership?.role === "superAdmin") {
    return <SuperAdmin />;
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
      <VerifyEmail
        companyId={membership.companyId}
        email={company.contactEmail}
        onVerified={refreshCompany}
      />
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
      case "billing":    return <Billing />;
      default:           return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
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
