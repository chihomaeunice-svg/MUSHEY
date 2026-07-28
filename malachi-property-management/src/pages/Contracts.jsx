// pages/Contracts.jsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { WarningCircle, FileText, Buildings } from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import ContractModal from "../components/Contractmodal";
import "../styles/contracts.css";

function Contracts() {
  const { membership, company } = useCompany();
  const areas = company?.areas || [];

  const [contracts,     setContracts]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterArea,    setFilterArea]    = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [selected,      setSelected]      = useState(null);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => { loadContracts(); }, [membership?.companyId]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, [loading]);

  const loadContracts = async () => {
    if (!membership?.companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "companies", membership.companyId, "properties"));
      setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = (end) => {
    if (!end) return 9999;
    return Math.ceil((new Date(end) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const progressPct = (start, end) => {
    if (!start || !end) return 0;
    const total   = new Date(end)   - new Date(start);
    const elapsed = new Date()      - new Date(start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const statusBadge = (end) => {
    const d = daysLeft(end);
    if (!end)   return <span className="badge">No Date</span>;
    if (d < 0)  return <span className="badge expired">Expired</span>;
    if (d < 14) return <span className="badge expiring"><WarningCircle size={11} weight="fill" /> {d}d left</span>;
    if (d < 30) return <span className="badge expiring">Expiring ({d}d)</span>;
    return <span className="badge active">Active</span>;
  };

  const contractStatus = (end) => {
    const d = daysLeft(end);
    if (!end)   return "none";
    if (d < 0)  return "expired";
    if (d < 30) return "expiring";
    return "active";
  };

  const initials = (name) =>
    (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const filtered = contracts.filter((c) => {
    if (c.status === "vacant") return false; // no lease to show on an empty unit
    const areaOk   = filterArea   === "all" || c.area === filterArea;
    const statusOk = filterStatus === "all" || contractStatus(c.contractEnd) === filterStatus;
    return areaOk && statusOk;
  });

  const grouped = areas.reduce((acc, area) => {
    const items = filtered.filter((c) => c.area === area);
    if (items.length > 0) acc[area] = items;
    return acc;
  }, {});

  const expiringSoon = contracts.filter(
    (c) => contractStatus(c.contractEnd) === "expiring"
  ).length;

  let cardIndex = 0;

  return (
    <div className={`contracts ${mounted ? "mounted" : ""}`}>
      <div className="page-header">
        <h1>Contracts</h1>
        <p>Click any contract to view full details</p>
      </div>

      {expiringSoon > 0 && (
        <div style={{
          background: "var(--orange-dim)", border: "1px solid #c98a3430",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: "20px",
          color: "var(--orange)", fontSize: "13px", display: "flex",
          alignItems: "center", gap: "10px",
        }}>
          <WarningCircle size={16} weight="fill" /> <strong>{expiringSoon} contract{expiringSoon > 1 ? "s" : ""}</strong> expiring within 30 days. Please review and renew.
        </div>
      )}

      {/* Filters */}
      <div className="contracts-toolbar">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["all", "active", "expiring", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "7px 16px", borderRadius: "99px", fontSize: "12px",
                fontWeight: 600, cursor: "pointer",
                border: "1px solid var(--border-soft)",
                background: filterStatus === s ? "var(--accent-dim)" : "var(--surface)",
                color: filterStatus === s ? "var(--accent)" : "var(--text-sub)",
                transition: "all 0.15s",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          style={{
            background: "var(--surface)", border: "1px solid var(--border-soft)",
            color: "var(--text)", padding: "9px 14px",
            borderRadius: "var(--radius)",
          }}
        >
          <option value="all">All Areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><div className="icon"><Buildings size={40} weight="thin" /></div><p>Loading contracts…</p></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state"><div className="icon"><FileText size={40} weight="thin" /></div><p>No contracts found.</p></div>
      ) : (
        Object.entries(grouped).map(([area, items]) => (
          <div className="area-group" key={area}>
            <div className="area-group-header">
              <h2>{area}</h2>
              <div className="divider" />
              <span className="area-count">{items.length}</span>
            </div>

            {items.map((c) => {
              const pct  = progressPct(c.contractStart, c.contractEnd);
              const days = daysLeft(c.contractEnd);
              const progressClass = days < 0 ? "danger" : days < 30 ? "warning" : "";
              const i = cardIndex++;

              return (
                <div
                  className="contract-card stagger-in"
                  key={`${c.area}-${c.id}`}
                  onClick={() => setSelected(c)}
                  style={{ cursor: "pointer", "--stagger-i": i }}
                >
                  <div className="contract-card-main">
                    {/* Tenant */}
                    <div className="contract-tenant">
                      <div className="contract-avatar">{initials(c.tenantName)}</div>
                      <div className="contract-tenant-info">
                        <div className="name">{c.tenantName || "Unknown Tenant"}</div>
                        <div className="meta">{c.propertyName} · {c.type || "Property"} · {c.area}</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="contract-dates">
                      <div className="date-row">
                        <span>Start</span>{c.contractStart || "N/A"}
                      </div>
                      <div className="date-row">
                        <span>End</span>{c.contractEnd || "N/A"}
                      </div>
                    </div>

                    {/* Rent */}
                    <div className="contract-rent">
                      {Number(c.rent || 0).toLocaleString()} TZS
                      <small>per month</small>
                    </div>

                    {/* Status + click hint */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      {statusBadge(c.contractEnd)}
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Click to view →</span>
                    </div>
                  </div>

                  {/* Expiry warning */}
                  {days >= 0 && days < 14 && (
                    <div className="expiry-bar">
                      <span className="icon"><WarningCircle size={14} weight="fill" /></span>
                      Contract expires in {days} days — emails being sent automatically
                    </div>
                  )}

                  {/* Progress bar */}
                  {c.contractStart && c.contractEnd && (
                    <div className="contract-progress">
                      <div className="progress-label">
                        <span>Contract Progress</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${progressClass}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Contract detail modal */}
      {selected && (
        <ContractModal
          contract={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default Contracts;