// src/components/CompanyProvider.jsx
// Loads the signed-in user's company membership (companyId + role) and the
// company profile itself, and makes them available via useCompany().

import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { getUserRecord, getCompany } from "../firebase/company";

const CompanyContext = createContext(null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sign-up creates the auth session (which mounts this provider) before its
// own Firestore writes finish, so the very first read here can briefly race
// ahead of the users/{uid} doc being written. A few short retries absorb
// that instead of permanently showing "not linked to a company".
const MEMBERSHIP_RETRY_DELAYS_MS = [500, 1000, 2000];

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
        let membership = await getUserRecord(user.uid);
        for (const delay of MEMBERSHIP_RETRY_DELAYS_MS) {
          if (membership || cancelled) break;
          await sleep(delay);
          membership = await getUserRecord(user.uid);
        }
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

  // Manual refetch for consumers that write to companies/{companyId} and need
  // the shared `company` object to reflect it immediately (e.g. Settings
  // saving new areas) — same shape as `load` above, minus the sign-up-race
  // retry loop, which only matters for the very first load.
  const refreshCompany = async () => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const membership = await getUserRecord(user.uid);
      if (!membership) {
        setState({ loading: false, membership: null, company: null, error: "no-membership" });
        return;
      }
      const company = membership.role === "superAdmin"
        ? null
        : await getCompany(membership.companyId);
      setState({ loading: false, membership, company, error: null });
    } catch (e) {
      console.error("CompanyProvider refresh error:", e);
      setState({ loading: false, membership: null, company: null, error: e.message });
    }
  };

  return (
    <CompanyContext.Provider value={{ ...state, refreshCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

/** { loading, membership: {companyId, role, name, email}, company, error, refreshCompany } */
export function useCompany() {
  return useContext(CompanyContext);
}
