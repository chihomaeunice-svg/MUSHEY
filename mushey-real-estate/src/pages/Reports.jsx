// pages/Reports.jsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import {
  contractTotalRevenue,
  contractMonths,
  revenueForPeriod,
  revenueForYear,
  daysUntilExpiry,
  contractStatus,
  fmtTZS,
} from "../utils/Revenuecalc";
import "../styles/reports.css";

const COLORS = [
  "#d4a843","#3498db","#2ecc71","#e74c3c","#9b59b6",
  "#f39c12","#1abc9c","#e67e22","#e91e63","#00bcd4",
];

function Reports() {
  const { membership, company } = useCompany();

  const [areaReports, setAreaReports] = useState([]);
  const [allProps,    setAllProps]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [period,      setPeriod]      = useState(6);

  useEffect(() => { loadReports(); }, [membership?.companyId]);

  const loadReports = async () => {
    if (!membership?.companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "companies", membership.companyId, "properties"));
      const allList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const areas = company?.areas || [...new Set(allList.map((p) => p.area))];

      const results = [];

      for (const area of areas) {
        const props = allList.filter((p) => p.area === area);
        if (props.length === 0) continue;

        // Total contract value = rent × whole months in contract
        const totalContractValue = props.reduce((s, p) =>
          s + contractTotalRevenue(p.rent, p.contractStart, p.contractEnd), 0);

        // Cash actually collected = sum of rent for properties marked rentPaid
        const cashCollected = props
          .filter((p) => p.rentPaid)
          .reduce((s, p) => s + Number(p.rent || 0), 0);

        // Outstanding = monthly base - collected this month
        const monthlyBase = props.reduce((s, p) => s + Number(p.rent || 0), 0);
        const outstanding = props
          .filter((p) => !p.rentPaid)
          .reduce((s, p) => s + Number(p.rent || 0), 0);

        const paidCount = props.filter((p) => p.rentPaid).length;

        results.push({
          area,
          properties: props.length,
          monthlyBase,
          totalContractValue,
          cashCollected,
          outstanding,
          paidCount,
          collectionRate: Math.round((paidCount / props.length) * 100),
          props,
        });
      }

      setAllProps(allList);
      setAreaReports(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Forward-looking period revenue (whole months only)
  const periodRevenue    = allProps.reduce((s, p) =>
    s + revenueForPeriod(p.rent, p.contractStart, p.contractEnd, period), 0);
  const currentYear      = new Date().getFullYear();
  const yearRevenue      = allProps.reduce((s, p) =>
    s + revenueForYear(p.rent, p.contractStart, p.contractEnd, currentYear), 0);
  const totalCollected   = areaReports.reduce((s, r) => s + r.cashCollected, 0);
  const totalOutstanding = areaReports.reduce((s, r) => s + r.outstanding, 0);
  const totalMonthly     = areaReports.reduce((s, r) => s + r.monthlyBase, 0);
  const totalProps       = areaReports.reduce((s, r) => s + r.properties, 0);
  const maxMonthly       = Math.max(...areaReports.map((r) => r.monthlyBase), 1);

  return (
    <div className="reports">
      <div className="reports-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Reports & Profit</h1>
          <p>Revenue calculated in whole months — no daily fractions</p>
        </div>
        <div className="period-selector">
          {[1, 3, 6, 12].map((m) => (
            <button
              key={m}
              className={`period-btn ${period === m ? "active" : ""}`}
              onClick={() => setPeriod(m)}
            >
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* Top metrics */}
      <div className="profit-overview">

        <div className="profit-metric" data-icon="✅">
          <div className="metric-label">Collected This Month</div>
          <div className="metric-value green">{fmtTZS(totalCollected)}</div>
          <div className="metric-change">
            Tenants marked as paid in Payments page
          </div>
        </div>

        <div className="profit-metric" data-icon="⚠️">
          <div className="metric-label">Still Owed This Month</div>
          <div className="metric-value red">{fmtTZS(totalOutstanding)}</div>
          <div className="metric-change">
            Tenants not yet marked as paid
          </div>
        </div>

        <div className="profit-metric" data-icon="🏠">
          <div className="metric-label">Total Monthly Rent</div>
          <div className="metric-value">{fmtTZS(totalMonthly)}</div>
          <div className="metric-change">
            If all {totalProps} tenants pay this month
          </div>
        </div>

        <div className="profit-metric" data-icon="📅">
          <div className="metric-label">Next {period} Months (if full)</div>
          <div className="metric-value gold">{fmtTZS(periodRevenue)}</div>
          <div className="metric-change">
            Based on active contracts × {period} months
          </div>
        </div>

        <div className="profit-metric" data-icon="📈">
          <div className="metric-label">Full Year {new Date().getFullYear()} Income</div>
          <div className="metric-value gold">{fmtTZS(yearRevenue)}</div>
          <div className="metric-change">
            Jan – Dec {new Date().getFullYear()} across all contracts
          </div>
        </div>

      </div>

      {/* Area breakdown */}
      <div className="area-breakdown">
        <div className="breakdown-header">
          <h2>Area Breakdown — {period}-Month Forward Revenue</h2>
        </div>

        <div className="breakdown-row thead">
          <span>Area</span>
          <span>Units</span>
          <span>Monthly</span>
          <span>{period}M Revenue</span>
          <span>Collected</span>
          <span>Outstanding</span>
          <span>Rate</span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="icon">⏳</div><p>Loading…</p></div>
        ) : areaReports.length === 0 ? (
          <div className="empty-state"><div className="icon">📊</div><p>No data yet.</p></div>
        ) : (
          areaReports.map((r, i) => {
            const fwdRevenue = r.props.reduce((s, p) =>
              s + revenueForPeriod(p.rent, p.contractStart, p.contractEnd, period), 0);
            return (
              <div className="breakdown-row" key={r.area}>
                <div className="area-name-cell">
                  <div className="area-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  {r.area}
                </div>
                <span>{r.properties}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                  {Number(r.monthlyBase).toLocaleString()}
                </span>
                <span className="profit-cell positive" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                  {Number(fwdRevenue).toLocaleString()}
                </span>
                <span style={{ color: "var(--green)", fontWeight: 600 }}>
                  {Number(r.cashCollected).toLocaleString()}
                </span>
                <span style={{ color: "var(--red)", fontWeight: 600 }}>
                  {Number(r.outstanding).toLocaleString()}
                </span>
                <span>
                  <span style={{
                    background: r.collectionRate >= 80 ? "var(--green-dim)" : r.collectionRate >= 50 ? "var(--orange-dim)" : "var(--red-dim)",
                    color:      r.collectionRate >= 80 ? "var(--green)"     : r.collectionRate >= 50 ? "var(--orange)"     : "var(--red)",
                    padding: "3px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 700,
                  }}>
                    {r.collectionRate}%
                  </span>
                </span>
              </div>
            );
          })
        )}

        {/* Totals row */}
        {!loading && areaReports.length > 0 && (
          <div className="breakdown-row" style={{ background: "var(--surface2)", fontWeight: 700, borderTop: "1px solid var(--border-soft)" }}>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}>TOTAL</span>
            <span>{totalProps}</span>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--gold)", fontWeight: 800 }}>
              {Number(totalMonthly).toLocaleString()}
            </span>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--gold)", fontWeight: 800 }}>
              {Number(periodRevenue).toLocaleString()}
            </span>
            <span style={{ color: "var(--green)", fontWeight: 700 }}>{Number(totalCollected).toLocaleString()}</span>
            <span style={{ color: "var(--red)",   fontWeight: 700 }}>{Number(totalOutstanding).toLocaleString()}</span>
            <span />
          </div>
        )}
      </div>

      {/* Per-contract detail */}
      {!loading && areaReports.length > 0 && (
        <div className="area-breakdown" style={{ marginTop: 20 }}>
          <div className="breakdown-header">
            <h2>Per-Contract Detail</h2>
          </div>
          <div className="breakdown-row thead" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 0.6fr 1fr 0.7fr" }}>
            <span>Tenant / Property</span>
            <span>Area</span>
            <span>Rent/mo</span>
            <span>Contract</span>
            <span>Months</span>
            <span>Total Value</span>
            <span>Status</span>
          </div>

          {areaReports.flatMap((r) =>
            r.props.map((p) => {
              const months     = contractMonths(p.contractStart, p.contractEnd);
              const totalValue = contractTotalRevenue(p.rent, p.contractStart, p.contractEnd);
              const days       = daysUntilExpiry(p.contractEnd);
              const status     = contractStatus(p.contractEnd);

              const statusEl =
                status === "expired"  ? <span style={{ color:"var(--red)",    fontWeight:700, fontSize:11 }}>Expired</span>   :
                status === "critical" ? <span style={{ color:"var(--red)",    fontWeight:700, fontSize:11 }}>⚠️ {days}d</span> :
                status === "expiring" ? <span style={{ color:"var(--orange)", fontWeight:700, fontSize:11 }}>{days}d left</span> :
                                        <span style={{ color:"var(--green)",  fontWeight:700, fontSize:11 }}>Active</span>;

              return (
                <div
                  className="breakdown-row"
                  key={`${r.area}-${p.id}`}
                  style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 0.6fr 1fr 0.7fr" }}
                >
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{p.tenantName || "—"}</div>
                    <div style={{ color:"var(--text-muted)", fontSize:11 }}>{p.propertyName}</div>
                  </div>
                  <span style={{ fontSize:12, color:"var(--text-sub)" }}>{r.area}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--gold)" }}>
                    {Number(p.rent || 0).toLocaleString()}
                  </span>
                  <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.6 }}>
                    <div>{p.contractStart || "—"}</div>
                    <div>{p.contractEnd   || "—"}</div>
                  </div>
                  <span style={{ fontWeight:700 }}>
                    {months > 0 ? `${months}mo` : <span style={{ color:"var(--text-muted)" }}>—</span>}
                  </span>
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:700 }}>
                    {months > 0 ? Number(totalValue).toLocaleString() : <span style={{ color:"var(--text-muted)" }}>—</span>}
                  </span>
                  <span>{statusEl}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bar chart */}
      {!loading && areaReports.length > 0 && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:20, marginTop:20 }}>
          <h2 style={{ fontSize:14, fontWeight:700, marginBottom:20 }}>Monthly Rent by Area</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[...areaReports].sort((a,b) => b.monthlyBase - a.monthlyBase).map((r, i) => (
              <div key={r.area}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-sub)", marginBottom:5 }}>
                  <span>{r.area}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--text)" }}>
                    {fmtTZS(r.monthlyBase)}
                  </span>
                </div>
                <div style={{ height:8, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${(r.monthlyBase / maxMonthly) * 100}%`,
                    background: COLORS[i % COLORS.length],
                    borderRadius:99,
                    transition:"width 0.4s ease",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;