// pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import "../styles/dashboard.css";

const AREA_COLORS = [
  "#d4a843","#3498db","#2ecc71","#e74c3c","#9b59b6",
  "#f39c12","#1abc9c","#e67e22","#e91e63","#00bcd4",
];

function Dashboard({ setCurrentPage }) {
  const { membership, company } = useCompany();

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalTenants: 0,
    totalRent: 0,
    paidThisMonth: 0,
    vacantCount: 0,
  });

  const [areaData, setAreaData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [membership?.companyId]);

  const loadDashboard = async () => {
    if (!membership?.companyId) return;
    try {
      const snap = await getDocs(collection(db, "companies", membership.companyId, "properties"));
      const allProps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const areas = company?.areas || [...new Set(allProps.map((p) => p.area))];
      const areaStats = [];
      let totalRent = 0;
      let paidCount = 0;
      let vacantCount = 0;

      for (const area of areas) {
        const props = allProps.filter((p) => p.area === area);
        if (props.length === 0) continue;

        const occupied = props.filter((p) => p.status !== "vacant");
        const areaRent = occupied.reduce((s, p) => s + (Number(p.rent) || 0), 0);
        const areaPaid = occupied.filter((p) => p.rentPaid === true).length;
        const areaVacant = props.length - occupied.length;

        totalRent += areaRent;
        paidCount += areaPaid;
        vacantCount += areaVacant;

        areaStats.push({
          name: area,
          count: props.length,
          vacant: areaVacant,
          rent: areaRent,
          paid: areaPaid,
          unpaid: occupied.length - areaPaid,
        });
      }

      const occupiedTotal = allProps.length - vacantCount;
      setStats({
        totalProperties: allProps.length,
        totalTenants: occupiedTotal,
        totalRent,
        paidThisMonth: paidCount,
        vacantCount,
      });

      setAreaData(areaStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="icon">⏳</div>
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of all properties, tenants, and collections</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ "--card-accent": "#d4a843" }}>
          <span className="stat-icon">🏠</span>
          <div className="stat-label">Total Properties</div>
          <div className="stat-value">{stats.totalProperties}</div>
          <div className="stat-sub">Across all areas</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#3498db" }}>
          <span className="stat-icon">👥</span>
          <div className="stat-label">Active Tenants</div>
          <div className="stat-value">{stats.totalTenants}</div>
          <div className="stat-sub">Currently occupied</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#e67e22" }}>
          <span className="stat-icon">🔑</span>
          <div className="stat-label">Vacant Units</div>
          <div className="stat-value">{stats.vacantCount}</div>
          <div className="stat-sub">
            {stats.totalProperties > 0
              ? Math.round((stats.vacantCount / stats.totalProperties) * 100)
              : 0}% vacancy rate
          </div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#2ecc71" }}>
          <span className="stat-icon">💰</span>
          <div className="stat-label">Total Monthly Rent</div>
          <div className="stat-value">{Number(stats.totalRent).toLocaleString()}</div>
          <div className="stat-sub">TZS expected</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#9b59b6" }}>
          <span className="stat-icon">✅</span>
          <div className="stat-label">Rent Paid</div>
          <div className="stat-value">{stats.paidThisMonth}</div>
          <div className="stat-sub">
            {stats.totalTenants > 0
              ? Math.round((stats.paidThisMonth / stats.totalTenants) * 100)
              : 0}% collection rate
          </div>
        </div>
      </div>

      {/* Area Overview */}
      <div className="areas-section">
        <h2>Areas Overview</h2>
        {areaData.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏙️</div>
            <p>No properties yet. Add properties to see area stats.</p>
          </div>
        ) : (
          <div className="areas-grid">
            {areaData.map((area) => (
              <div className="area-card" key={area.name}>
                <div className="area-card-header">
                  <h3>{area.name}</h3>
                  <span className="area-type-tag">{area.count} units</span>
                </div>
                <div className="area-stats">
                  <div className="area-stat">
                    <span className="label">Monthly Rent</span>
                    <span className="value">{Number(area.rent).toLocaleString()}</span>
                  </div>
                  <div className="area-stat">
                    <span className="label">6-Month Total</span>
                    <span className="value">{Number(area.rent * 6).toLocaleString()}</span>
                  </div>
                  <div className="area-stat">
                    <span className="label">Paid</span>
                    <span className="value green">{area.paid}</span>
                  </div>
                  <div className="area-stat">
                    <span className="label">Unpaid</span>
                    <span className="value red">{area.unpaid}</span>
                  </div>
                  {area.vacant > 0 && (
                    <div className="area-stat">
                      <span className="label">Vacant</span>
                      <span className="value" style={{ color: "var(--orange)" }}>{area.vacant}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bottom-grid">
        <div className="section-card">
          <div className="section-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "➕ Add New Property",   page: "properties" },
              { label: "📄 Manage Contracts",   page: "contracts" },
              { label: "💳 Record Payment",     page: "payments" },
              { label: "📊 View Reports",       page: "reports" },
            ].map((q) => (
              <button
                key={q.page}
                className="btn btn-ghost"
                style={{ justifyContent: "flex-start" }}
                onClick={() => setCurrentPage(q.page)}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <h3>Areas Summary</h3>
          </div>
          <div className="activity-list">
            {areaData.slice(0, 5).map((area, i) => (
              <div className="activity-item" key={area.name}>
                <div
                  className="activity-dot"
                  style={{ background: AREA_COLORS[i % AREA_COLORS.length] }}
                />
                <div className="activity-info">
                  <div className="title">{area.name}</div>
                  <div className="sub">{area.count} properties</div>
                </div>
                <div className="activity-amount">
                  {Number(area.rent).toLocaleString()} TZS
                </div>
              </div>
            ))}
            {areaData.length === 0 && (
              <div className="activity-item">
                <div className="activity-info">
                  <div className="sub">No area data yet</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;