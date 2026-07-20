// pages/Payments.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import areas from "../data/areas";
import "../styles/payments.css";

function Payments() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      let list = [];
      for (const area of areas) {
        const snap = await getDocs(collection(db, "areas", area, "properties"));
        snap.forEach((d) => list.push({ id: d.id, area, ...d.data() }));
      }
      setProperties(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (p, field) => {
    const newVal = !p[field];
    await updateDoc(doc(db, "areas", p.area, "properties", p.id), {
      [field]: newVal,
    });
    setProperties((prev) =>
      prev.map((item) =>
        item.id === p.id && item.area === p.area
          ? { ...item, [field]: newVal }
          : item
      )
    );
  };

  const payStatus = (p) => {
    if (p.rentPaid && p.cleaningPaid && p.waterPaid) return "paid";
    if (!p.rentPaid && !p.cleaningPaid && !p.waterPaid) return "unpaid";
    return "partial";
  };

  const filtered = properties.filter((p) => {
    const areaOk   = filterArea === "all" || p.area === filterArea;
    const statusOk = filterStatus === "all" || payStatus(p) === filterStatus;
    return areaOk && statusOk;
  });

  // Summary
  const totalRent  = filtered.reduce((s, p) => s + Number(p.rent || 0), 0);
  const paidRent   = filtered.filter((p) => p.rentPaid).reduce((s, p) => s + Number(p.rent || 0), 0);
  const unpaidRent = totalRent - paidRent;
  const fullyPaid  = filtered.filter((p) => payStatus(p) === "paid").length;
  const unpaidCount = filtered.filter((p) => payStatus(p) === "unpaid").length;

  return (
    <div className="payments">
      <div className="page-header">
        <h1>Payments</h1>
        <p>Track rent, cleaning, and water collection per tenant</p>
      </div>

      {/* Summary chips */}
      <div className="payments-summary">
        <div className="summary-chip">
          <span className="chip-label">Total Expected</span>
          <span className="chip-value gold">{Number(totalRent).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip">
          <span className="chip-label">Collected (Rent)</span>
          <span className="chip-value green">{Number(paidRent).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip">
          <span className="chip-label">Pending (Rent)</span>
          <span className="chip-value red">{Number(unpaidRent).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip">
          <span className="chip-label">Fully Cleared</span>
          <span className="chip-value green">{fullyPaid}</span>
        </div>
        <div className="summary-chip">
          <span className="chip-label">Unpaid</span>
          <span className="chip-value red">{unpaidCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="payments-filters">
        {[
          { k: "all", label: "All" },
          { k: "paid", label: "✅ Fully Paid" },
          { k: "partial", label: "⚠️ Partial" },
          { k: "unpaid", label: "❌ Unpaid" },
        ].map((f) => (
          <button
            key={f.k}
            className={`filter-tab ${filterStatus === f.k ? "active" : ""}`}
            onClick={() => setFilterStatus(f.k)}
          >
            {f.label}
          </button>
        ))}

        <select
          className="filter-select"
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          style={{
            marginLeft: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            color: "var(--text)",
            padding: "7px 14px",
            borderRadius: "var(--radius)",
            outline: "none",
          }}
        >
          <option value="all">All Areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="icon">⏳</div>
          <p>Loading payments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">💳</div>
          <p>No payment records found.</p>
        </div>
      ) : (
        <div className="payments-grid">
          {filtered.map((p) => {
            const status = payStatus(p);
            return (
              <div className="payment-card" key={`${p.area}-${p.id}`}>
                <div className="payment-card-header">
                  <div className="tenant-info">
                    <div className="tenant-name">{p.tenantName || "Unknown"}</div>
                    <div className="property-tag">
                      {p.id} · {p.area}
                    </div>
                  </div>
                  <span className={`badge ${status}`}>
                    {status === "paid" ? "✅ Paid" : status === "partial" ? "⚠️ Partial" : "❌ Unpaid"}
                  </span>
                </div>

                <div className="payment-card-body">
                  {/* Rent */}
                  <div className="check-item">
                    <div className="check-left">
                      <button
                        className={`check-toggle ${p.rentPaid ? "checked" : ""}`}
                        onClick={() => toggle(p, "rentPaid")}
                        title="Toggle Rent Paid"
                      >
                        {p.rentPaid ? "✓" : ""}
                      </button>
                      <span className="check-label">🏠 Rent</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 13,
                      color: p.rentPaid ? "var(--green)" : "var(--red)",
                    }}>
                      {Number(p.rent || 0).toLocaleString()} TZS
                    </span>
                  </div>

                  {/* Cleaning */}
                  <div className="check-item">
                    <div className="check-left">
                      <button
                        className={`check-toggle ${p.cleaningPaid ? "checked" : ""}`}
                        onClick={() => toggle(p, "cleaningPaid")}
                        title="Toggle Cleaning Paid"
                      >
                        {p.cleaningPaid ? "✓" : ""}
                      </button>
                      <span className="check-label">🧹 Cleanliness</span>
                    </div>
                    <span className="badge" style={{
                      background: p.cleaningPaid ? "var(--green-dim)" : "var(--red-dim)",
                      color: p.cleaningPaid ? "var(--green)" : "var(--red)",
                    }}>
                      {p.cleaningPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  {/* Water */}
                  <div className="check-item">
                    <div className="check-left">
                      <button
                        className={`check-toggle ${p.waterPaid ? "checked" : ""}`}
                        onClick={() => toggle(p, "waterPaid")}
                        title="Toggle Water Paid"
                      >
                        {p.waterPaid ? "✓" : ""}
                      </button>
                      <span className="check-label">💧 Dirty Water Collection</span>
                    </div>
                    <span className="badge" style={{
                      background: p.waterPaid ? "var(--green-dim)" : "var(--red-dim)",
                      color: p.waterPaid ? "var(--green)" : "var(--red)",
                    }}>
                      {p.waterPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>

                <div className="payment-card-footer">
                  <span className="total-label">Monthly Rent</span>
                  <span className="total-value">{Number(p.rent || 0).toLocaleString()} TZS</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Payments;