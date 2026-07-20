// App.jsx
import { useState } from "react";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Contracts from "./pages/Contracts";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import SuperAdmin from "./pages/SuperAdmin";
import { AuthProvider } from "./components/AuthProvider";
import { CompanyProvider, useCompany } from "./components/CompanyProvider";
import "./styles/globals.css";

function Screens() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { loading, membership, error } = useCompany();

  if (loading) {
    return <div className="app-loading">Loading your workspace…</div>;
  }

  if (membership?.role === "superAdmin") {
    return <SuperAdmin />;
  }

  if (error || !membership) {
    return (
      <div className="app-loading">
        Your account isn't linked to a company yet. Please contact support.
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":  return <Dashboard setCurrentPage={setCurrentPage} />;
      case "properties": return <Properties />;
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
