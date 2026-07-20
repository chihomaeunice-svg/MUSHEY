// src/components/CompanyProvider.jsx
// Loads the signed-in user's company membership (companyId + role) and the
// company profile itself, and makes them available via useCompany().

import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { getUserRecord, getCompany } from "../firebase/company";

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const user = useContext(AuthContext);
  const [state, setState] = useState({ loading: true, membership: null, company: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setState({ loading: false, membership: null, company: null, error: null });
        return;
      }
      setState((s) => ({ ...s, loading: true }));
      try {
        const membership = await getUserRecord(user.uid);
        if (!membership) {
          if (!cancelled) setState({ loading: false, membership: null, company: null, error: "no-membership" });
          return;
        }
        const company = membership.role === "superAdmin"
          ? null
          : await getCompany(membership.companyId);
        if (!cancelled) setState({ loading: false, membership, company, error: null });
      } catch (e) {
        console.error("CompanyProvider load error:", e);
        if (!cancelled) setState({ loading: false, membership: null, company: null, error: e.message });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <CompanyContext.Provider value={state}>
      {children}
    </CompanyContext.Provider>
  );
}

/** { loading, membership: {companyId, role, name, email}, company, error } */
export function useCompany() {
  return useContext(CompanyContext);
}
