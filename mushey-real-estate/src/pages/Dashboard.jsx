// pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  House, Users, Key, Wallet, Buildings,
  Plus, FileText, CreditCard, ChartBar, WarningCircle,
} from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import { useCountUp } from "../utils/useCountUp";
import "../styles/dashboard.css";

const AREA_COLORS = [
  "#b5573a","#3a6ea5","#3f7d5c","#c1443a","#8e6ba8",
  "#c98a34","#3f9a8f","#c9793a","#b5457a","#3a95a5",
];

function CollectionRing({ percent, size = 132, stroke = 12 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;

  return (
    <svg width={size} height={size} className="collection-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="collection-ring-fill"
      />
    </svg>
  );
}

function StatTile({ icon, accent, label, value, sub }) {
  const Icon = icon;
  return (
    <div className="stat-tile" style={{ "--card-accent": accent }}>
      <span className="stat-tile-icon"><Icon size={18} weight="regular" /></span>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-sub">{sub}</div>
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [membership?.companyId]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, [loading]);

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

      setAreaData(areaStats.sort((a, b) => b.rent - a.rent));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const collectionRate = stats.totalTenants > 0
    ? Math.round((stats.paidThisMonth / stats.totalTenants) * 100)
    : 0;
  const vacancyRate = stats.totalProperties > 0
    ? Math.round((stats.vacantCount / stats.totalProperties) * 100)
    : 0;
  const unpaidCount = stats.totalTenants - stats.paidThisMonth;
  const maxAreaRent = Math.max(...areaData.map((a) => a.rent), 1);

  const animatedRent = useCountUp(stats.totalRent);
  const animatedCollected = useCountUp(collectionRate);
  const animatedProperties = useCountUp(stats.totalProperties);
  const animatedTenants = useCountUp(stats.totalTenants);
  const animatedVacant = useCountUp(stats.vacantCount);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="icon"><Buildings size={40} weight="thin" /></div>
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard ${mounted ? "is-mounted" : ""}`}>
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of all properties, tenants, and collections</p>
      </div>

      {/* Hero row: collection rate + supporting tiles */}
      <div className="dash-hero-grid">
        <div className="dash-hero-card dash-stagger" style={{ "--stagger-i": 0 }}>
          <div className="dash-hero-ring">
            <CollectionRing percent={collectionRate} />
            <div className="dash-hero-ring-label">
              <span className="value">{animatedCollected}%</span>
              <span className="sub">collected</span>
            </div>
          </div>
          <div className="dash-hero-info">
            <div className="dash-hero-title">Rent Collection — This Month</div>
            <div className="dash-hero-amount">{Number(animatedRent).toLocaleString()} <span>TZS expected</span></div>
            <div className="dash-hero-split">
              <span className="green">{stats.paidThisMonth} paid</span>
              {unpaidCount > 0 && <span className="red">{unpaidCount} unpaid</span>}
            </div>
          </div>
        </div>

        <div className="dash-tile-grid">
          <div className="dash-stagger" style={{ "--stagger-i": 1 }}>
            <StatTile icon={House} accent="#b5573a" label="Properties" value={animatedProperties} sub="Across all areas" />
          </div>
          <div className="dash-stagger" style={{ "--stagger-i": 2 }}>
            <StatTile icon={Users} accent="#3a6ea5" label="Active Tenants" value={animatedTenants} sub="Currently occupied" />
          </div>
          <div className="dash-stagger" style={{ "--stagger-i": 3 }}>
            <StatTile icon={Key} accent="#c9793a" label="Vacant Units" value={animatedVacant} sub={`${vacancyRate}% vacancy`} />
          </div>
        </div>
      </div>

      {/* Areas ranked by rent */}
      <div className="areas-section">
        <h2>Areas Overview</h2>
        {areaData.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Buildings size={40} weight="thin" /></div>
            <p>No properties yet. Add properties to see area stats.</p>
          </div>
        ) : (
          <div className="areas-rank">
            {areaData.map((area, i) => (
              <div className="areas-rank-row dash-stagger" key={area.name} style={{ "--stagger-i": i + 4 }}>
                <div className="areas-rank-info">
                  <span className="areas-rank-name">{area.name}</span>
                  <span className="areas-rank-meta">
                    {area.count} unit{area.count !== 1 ? "s" : ""}
                    {area.vacant > 0 ? ` · ${area.vacant} vacant` : ""}
                  </span>
                </div>
                <div className="areas-rank-bar-track">
                  <div
                    className="areas-rank-bar-fill"
                    style={{
                      width: mounted ? `${(area.rent / maxAreaRent) * 100}%` : "0%",
                      background: AREA_COLORS[i % AREA_COLORS.length],
                    }}
                  />
                </div>
                <div className="areas-rank-value">{Number(area.rent).toLocaleString()} TZS</div>
                <div className="areas-rank-collect">
                  <span className="green">{area.paid} paid</span>
                  {area.unpaid > 0 && <span className="red">{area.unpaid} unpaid</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links + Needs Attention */}
      <div className="bottom-grid">
        <div className="section-card">
          <div className="section-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions-list">
            {[
              { label: "Add New Property", icon: Plus,       page: "properties" },
              { label: "Manage Contracts", icon: FileText,   page: "contracts" },
              { label: "Record Payment",   icon: CreditCard, page: "payments" },
              { label: "View Reports",     icon: ChartBar,   page: "reports" },
            ].map((q) => (
              <button
                key={q.page}
                className="btn btn-ghost quick-action-btn"
                onClick={() => setCurrentPage(q.page)}
              >
                <q.icon size={16} weight="regular" /> {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <h3>Needs Attention</h3>
          </div>
          {stats.vacantCount === 0 && unpaidCount === 0 ? (
            <div className="attention-empty">Nothing needs attention right now.</div>
          ) : (
            <div className="attention-list">
              {stats.vacantCount > 0 && (
                <button className="attention-row" onClick={() => setCurrentPage("properties")}>
                  <span className="attention-icon vacant"><Key size={15} weight="regular" /></span>
                  <span className="attention-text">
                    <strong>{stats.vacantCount}</strong> vacant unit{stats.vacantCount !== 1 ? "s" : ""} sitting empty
                  </span>
                </button>
              )}
              {unpaidCount > 0 && (
                <button className="attention-row" onClick={() => setCurrentPage("payments")}>
                  <span className="attention-icon unpaid"><WarningCircle size={15} weight="regular" /></span>
                  <span className="attention-text">
                    <strong>{unpaidCount}</strong> tenant{unpaidCount !== 1 ? "s" : ""} yet to pay this month
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
