import { createContext, useEffect, useState } from "react";
import { auth } from "../firebase/auth";
import AuthGate from "./AuthGate";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  if (!ready) return <div>Loading…</div>;
  return (
    <AuthContext.Provider value={user}>
      {user ? children : <AuthGate />}
    </AuthContext.Provider>
  );
}