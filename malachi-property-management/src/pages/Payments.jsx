// pages/Payments.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import {
  CheckCircle, WarningCircle, XCircle, Buildings, CreditCard,
  House, Broom, Drop, Check, Receipt,
} from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import RecordPaymentModal from "../components/RecordPaymentModal";
import InvoiceModal from "../components/InvoiceModal";
import PaymentHistoryPanel from "../components/PaymentHistoryPanel";
import { useCountUp } from "../utils/useCountUp";
import { isRentCurrent, nextPaidThrough, FREQUENCY_LABELS } from "../utils/billing";
import "../styles/payments.css";

const FIELD_TYPE = { rentPaid: "rent", cleaningPaid: "cleaning", waterPaid: "water" };

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Payments() {
  const { membership, company } = useCompany();
  const areas = company?.areas || [];

  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [paymentModal, setPaymentModal] = useState(null); // { property, field, type }
  const [invoiceProperty, setInvoiceProperty] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState("status"); // "status" | "history"

  useEffect(() => { loadProperties(); }, [membership?.companyId]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, [loading]);

  const loadProperties = async () => {
    if (!membership?.companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "companies", membership.companyId, "properties"));
      setProperties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (p, field) => {
    const current = field === "rentPaid" ? isRentCurrent(p) : p[field];

    // Marking as paid opens the payment/receipt modal instead of writing directly.
    if (!current) {
      setPaymentModal({ property: p, field, type: FIELD_TYPE[field] });
      return;
    }

    // Undo — no receipt needed to un-mark a mistaken entry.
    const resetData = field === "rentPaid" ? { rentPaid: false, rentPaidThrough: null } : { [field]: false };
    await updateDoc(doc(db, "companies", membership.companyId, "properties", p.id), resetData);
    setProperties((prev) => prev.map((item) => item.id === p.id ? { ...item, ...resetData } : item));
  };

  const handleRecorded = async () => {
    const { property, field } = paymentModal;
    const data = field === "rentPaid"
      ? { rentPaidThrough: nextPaidThrough(property) }
      : { [field]: true };
    await updateDoc(doc(db, "companies", membership.companyId, "properties", property.id), data);
    setProperties((prev) => prev.map((item) => item.id === property.id ? { ...item, ...data } : item));
    setPaymentModal(null);
  };

  // A fee that's included in rent is only ever as "paid" as the rent itself is.
  const cleaningOk = (p) => p.cleaningIncluded ? isRentCurrent(p) : p.cleaningPaid;
  const waterOk = (p) => p.waterIncluded ? isRentCurrent(p) : p.waterPaid;

  const payStatus = (p) => {
    const parts = [isRentCurrent(p), cleaningOk(p), waterOk(p)];
    if (parts.every(Boolean)) return "paid";
    if (parts.every((v) => !v)) return "unpaid";
    return "partial";
  };

  const filtered = properties.filter((p) => {
    if (p.status === "vacant") return false; // nothing to collect on an empty unit
    const areaOk   = filterArea === "all" || p.area === filterArea;
    const statusOk = filterStatus === "all" || payStatus(p) === filterStatus;
    return areaOk && statusOk;
  });

  // Summary
  const totalRent  = filtered.reduce((s, p) => s + Number(p.rent || 0), 0);
  const paidRent   = filtered.filter((p) => isRentCurrent(p)).reduce((s, p) => s + Number(p.rent || 0), 0);
  const unpaidRent = totalRent - paidRent;
  const fullyPaid  = filtered.filter((p) => payStatus(p) === "paid").length;
  const unpaidCount = filtered.filter((p) => payStatus(p) === "unpaid").length;

  const animatedTotal  = useCountUp(totalRent);
  const animatedPaid   = useCountUp(paidRent);
  const animatedUnpaid = useCountUp(unpaidRent);

  return (
    <div className={`payments ${mounted ? "mounted" : ""}`}>
      <div className="page-header">
        <h1>Payments</h1>
        <p>Track rent, cleaning, and water collection per tenant</p>
      </div>

      <div className="payments-filters" style={{ marginBottom: 20 }}>
        <button className={`filter-tab ${view === "status" ? "active" : ""}`} onClick={() => setView("status")}>
          Current Status
        </button>
        <button className={`filter-tab ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>
          Payment History
        </button>
      </div>

      {view === "history" ? (
        <PaymentHistoryPanel companyId={membership.companyId} />
      ) : (
        <>
      {/* Summary chips */}
      <div className="payments-summary">
        <div className="summary-chip stagger-in" style={{ "--stagger-i": 0 }}>
          <span className="chip-label">Total Expected</span>
          <span className="chip-value gold">{Number(animatedTotal).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip stagger-in" style={{ "--stagger-i": 1 }}>
          <span className="chip-label">Collected (Rent)</span>
          <span className="chip-value green">{Number(animatedPaid).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip stagger-in" style={{ "--stagger-i": 2 }}>
          <span className="chip-label">Pending (Rent)</span>
          <span className="chip-value red">{Number(animatedUnpaid).toLocaleString()} TZS</span>
        </div>
        <div className="summary-chip stagger-in" style={{ "--stagger-i": 3 }}>
          <span className="chip-label">Fully Cleared</span>
          <span className="chip-value green">{fullyPaid}</span>
        </div>
        <div className="summary-chip stagger-in" style={{ "--stagger-i": 4 }}>
          <span className="chip-label">Unpaid</span>
          <span className="chip-value red">{unpaidCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="payments-filters">
        {[
          { k: "all", label: "All" },
          { k: "paid", label: "Fully Paid", icon: CheckCircle },
          { k: "partial", label: "Partial", icon: WarningCircle },
          { k: "unpaid", label: "Unpaid", icon: XCircle },
        ].map((f) => (
          <button
            key={f.k}
            className={`filter-tab ${filterStatus === f.k ? "active" : ""}`}
            onClick={() => setFilterStatus(f.k)}
          >
            {f.icon && <f.icon size={13} weight="fill" />} {f.label}
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
          }}
        >
          <option value="all">All Areas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="icon"><Buildings size={40} weight="thin" /></div>
          <p>Loading payments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><CreditCard size={40} weight="thin" /></div>
          <p>No payment records found.</p>
        </div>
      ) : (
        <div className="payments-grid">
          {filtered.map((p, i) => {
            const status = payStatus(p);
            return (
              <div className="payment-card stagger-in" key={p.id} style={{ "--stagger-i": i }}>
                <div className="payment-card-header">
                  <div className="tenant-info">
                    <div className="tenant-name">{p.tenantName || "Unknown"}</div>
                    <div className="property-tag">
                      {p.propertyName} · {p.area}
                    </div>
                  </div>
                  <span className={`badge ${status}`}>
                    {status === "paid"
                      ? <><CheckCircle size={11} weight="fill" /> Paid</>
                      : status === "partial"
                        ? <><WarningCircle size={11} weight="fill" /> Partial</>
                        : <><XCircle size={11} weight="fill" /> Unpaid</>}
                  </span>
                </div>

                <div className="payment-card-body">
                  {/* Rent */}
                  <div className="check-item">
                    <div className="check-left">
                      <button
                        className={`check-toggle ${isRentCurrent(p) ? "checked" : ""}`}
                        onClick={() => toggle(p, "rentPaid")}
                        title="Toggle Rent Paid"
                        aria-label="Toggle rent paid"
                      >
                        {isRentCurrent(p) ? <Check size={12} weight="bold" /> : ""}
                      </button>
                      <span className="check-label">
                        <House size={14} weight="regular" />
                        {" Rent"}
                        {p.rentFrequency && p.rentFrequency !== "monthly" && (
                          <em style={{ color: "var(--text-muted)", fontStyle: "normal", fontSize: 11 }}>
                            {" "}({FREQUENCY_LABELS[p.rentFrequency]?.split(" ")[0]})
                          </em>
                        )}
                        {(p.cleaningIncluded || p.waterIncluded) && (
                          <em style={{ color: "var(--text-muted)", fontStyle: "normal", fontSize: 11 }}>
                            {" "}(incl. {[p.cleaningIncluded && "cleaning", p.waterIncluded && "water"].filter(Boolean).join(" & ")})
                          </em>
                        )}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: isRentCurrent(p) ? "var(--green)" : "var(--red)",
                      }}>
                        {Number(p.rent || 0).toLocaleString()} TZS
                      </div>
                      {p.rentPaidThrough && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {isRentCurrent(p) ? "paid through " : "was due "}{formatDate(p.rentPaidThrough)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cleaning — only billed separately if not folded into rent */}
                  {!p.cleaningIncluded && (
                    <div className="check-item">
                      <div className="check-left">
                        <button
                          className={`check-toggle ${p.cleaningPaid ? "checked" : ""}`}
                          onClick={() => toggle(p, "cleaningPaid")}
                          title="Toggle Cleaning Paid"
                          aria-label="Toggle cleaning paid"
                        >
                          {p.cleaningPaid ? <Check size={12} weight="bold" /> : ""}
                        </button>
                        <span className="check-label"><Broom size={14} weight="regular" /> Cleanliness</span>
                      </div>
                      <span className="badge" style={{
                        background: p.cleaningPaid ? "var(--green-dim)" : "var(--red-dim)",
                        color: p.cleaningPaid ? "var(--green)" : "var(--red)",
                      }}>
                        {p.cleaningPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  )}

                  {/* Water — only billed separately if not folded into rent */}
                  {!p.waterIncluded && (
                    <div className="check-item">
                      <div className="check-left">
                        <button
                          className={`check-toggle ${p.waterPaid ? "checked" : ""}`}
                          onClick={() => toggle(p, "waterPaid")}
                          title="Toggle Water Paid"
                          aria-label="Toggle water paid"
                        >
                          {p.waterPaid ? <Check size={12} weight="bold" /> : ""}
                        </button>
                        <span className="check-label"><Drop size={14} weight="regular" /> Dirty Water Collection</span>
                      </div>
                      <span className="badge" style={{
                        background: p.waterPaid ? "var(--green-dim)" : "var(--red-dim)",
                        color: p.waterPaid ? "var(--green)" : "var(--red)",
                      }}>
                        {p.waterPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="payment-card-footer">
                  <div className="footer-total">
                    <span className="total-label">Monthly Rent</span>
                    <span className="total-value">{Number(p.rent || 0).toLocaleString()} TZS</span>
                  </div>
                  <button className="btn btn-ghost invoice-btn" onClick={() => setInvoiceProperty(p)}>
                    <Receipt size={14} /> Invoice
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {paymentModal && (
        <RecordPaymentModal
          companyId={membership.companyId}
          company={company}
          property={paymentModal.property}
          type={paymentModal.type}
          onClose={() => setPaymentModal(null)}
          onRecorded={handleRecorded}
        />
      )}

      {invoiceProperty && (
        <InvoiceModal
          company={company}
          property={invoiceProperty}
          onClose={() => setInvoiceProperty(null)}
        />
      )}
    </div>
  );
}

export default Payments;