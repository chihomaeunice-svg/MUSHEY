// pages/SuperAdmin.jsx
// Visible only to users whose users/{uid}.role === "superAdmin".
// This is the install/enrollment counter: every company that registers
// shows up here, so you can see how many are on the app, when they joined,
// and how many tenants each is managing — for billing and maintenance follow-ups.

import { useEffect, useState } from "react";
import { logout } from "../firebase/company";
import { listAllCompanies, countCompanyProperties } from "../firebase/company";
import "../styles/superadmin.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listAllCompanies();
      const withCounts = await Promise.all(
        list.map(async (c) => ({ ...c, tenantCount: await countCompanyProperties(c.id) }))
      );
      setCompanies(withCounts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = companies.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contactEmail || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCompanies = companies.length;
  const totalTenants   = companies.reduce((s, c) => s + (c.tenantCount || 0), 0);
  const activeCount    = companies.filter((c) => c.active).length;

  return (
    <div className="superadmin">
      <header className="sa-topbar">
        <div>
          <h1>Mushey — Super Admin</h1>
          <p>Every company enrolled on the platform</p>
        </div>
        <button className="btn btn-ghost" onClick={() => logout()}>🚪 Sign Out</button>
      </header>

      <div className="sa-stats">
        <div className="stat-card" style={{ "--card-accent": "#d4a843" }}>
          <span className="stat-icon">🏢</span>
          <div className="stat-label">Companies Installed</div>
          <div className="stat-value">{totalCompanies}</div>
          <div className="stat-sub">Total enrollments</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#2ecc71" }}>
          <span className="stat-icon">✅</span>
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">Currently active accounts</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#3498db" }}>
          <span className="stat-icon">👥</span>
          <div className="stat-label">Total Tenants Managed</div>
          <div className="stat-value">{totalTenants}</div>
          <div className="stat-sub">Across every company</div>
        </div>
      </div>

      <div className="sa-toolbar">
        <input
          placeholder="Search company or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="properties-table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="empty-state"><div className="icon">⏳</div><p>Loading companies…</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon">🏢</div><p>No companies enrolled yet.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>TIN</th>
                  <th>Plan</th>
                  <th>Tenants</th>
                  <th>Enrolled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name || "—"}</td>
                    <td>
                      <div className="tenant-cell">
                        <span className="name">{c.contactEmail || "—"}</span>
                        {c.phone && <span className="area">{c.phone}</span>}
                      </div>
                    </td>
                    <td>{c.tin || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.plan || "—"}</td>
                    <td>{c.tenantCount}</td>
                    <td>{fmtDate(c.createdAt)}</td>
                    <td>
                      <span className={`badge ${c.active ? "active" : "expired"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdmin;
