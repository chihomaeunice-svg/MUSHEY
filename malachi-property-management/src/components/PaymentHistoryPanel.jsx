// src/components/PaymentHistoryPanel.jsx
// Every payment recorded (rent/cleaning/water) with its proof photo, most
// recent first — so a landlord can actually go back and verify that "Paid"
// reflects a real payment, not just check the current status.

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Receipt } from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";

const TYPE_LABELS = { rent: "Rent", cleaning: "Cleanliness Fee", water: "Dirty Water Collection" };

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PaymentHistoryPanel({ companyId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [companyId]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "companies", companyId, "payments"), orderBy("paidAt", "desc"))
      );
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter((p) =>
    (p.tenantName || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.propertyName || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.receiptNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="properties-table-wrap">
      <div className="table-header-bar">
        <h2>Payment History</h2>
        <span className="count-tag">{filtered.length} records</span>
      </div>
      <div className="payments-filters" style={{ padding: "0 20px 16px" }}>
        <input
          className="search-input-wrap"
          style={{ background: "var(--surface2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", padding: "8px 14px", color: "var(--text)", width: 260 }}
          placeholder="Search tenant, property, or receipt no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-scroll">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="icon"><Receipt size={40} weight="thin" /></div><p>No payments recorded yet.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant / Property</th>
                <th>Type</th>
                <th>Receipt No.</th>
                <th>Amount</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td>
                    <div className="tenant-cell">
                      <span className="name">{p.tenantName || "—"}</span>
                      <span className="area">{p.propertyName} · {p.area}</span>
                    </div>
                  </td>
                  <td>{TYPE_LABELS[p.type] || p.type}</td>
                  <td>{p.receiptNumber || "—"}</td>
                  <td className="rent-cell">{Number(p.amount || 0).toLocaleString()} TZS</td>
                  <td>
                    {p.receiptPhotoUrl ? (
                      <a href={p.receiptPhotoUrl} target="_blank" rel="noreferrer">View proof</a>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>No photo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
