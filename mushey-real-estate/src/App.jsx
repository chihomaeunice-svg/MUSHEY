// App.jsx
import { useState } from "react";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Contracts from "./pages/Contracts";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import { AuthProvider } from "./components/AuthProvider";
import "./styles/globals.css";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":  return <Dashboard setCurrentPage={setCurrentPage} />;
      case "properties": return <Properties />;
      case "contracts":  return <Contracts />;
      case "payments":   return <Payments />;
      case "reports":    return <Reports />;
      default:           return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <AuthProvider>
      <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {renderPage()}
      </Layout>
    </AuthProvider>
  );
}

export default App;