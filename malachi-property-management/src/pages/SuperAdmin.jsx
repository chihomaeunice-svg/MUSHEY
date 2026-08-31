// pages/SuperAdmin.jsx
// Visible only to users whose users/{uid}.role === "superAdmin".
// This is the install/enrollment counter: every company that registers
// shows up here, so you can see how many are on the app, when they joined,
// and how many tenants each is managing — for billing and maintenance follow-ups.

import { useEffect, useState } from "react";
import {
  collectionGroup, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { SignOut, Buildings, CheckCircle, Users, Receipt, Check, X as XIcon, LockSimple, LockSimpleOpen, PencilSimple } from "@phosphor-icons/react";
import { logout } from "../firebase/company";
import { listAllCompanies, countCompanyProperties } from "../firebase/company";
import { db } from "../firebase/firebaseConfig";
import { auth } from "../firebase/auth";
import { addMonths, FREQUENCIES, FREQUENCY_SUFFIX } from "../utils/billing";
import BrandMark from "../components/BrandMark";
import SetRateModal from "../components/SetRateModal";
import "../styles/superadmin.css";

function extendedPeriodEnd(company) {
  const months = FREQUENCIES[company?.subscriptionFrequency] || 1;
  const today = new Date().toISOString().slice(0, 10);
  const base = company?.currentPeriodEnd && company.currentPeriodEnd > today ? company.currentPeriodEnd : today;
  return addMonths(base, months);
}

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [pendingProofs, setPendingProofs] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(true);
  const [reviewing, setReviewing] = useState(null); // paymentId currently being approved/rejected
  const [ratingCompany, setRatingCompany] = useState(null); // company currently open in SetRateModal

  useEffect(() => { load(); loadPendingProofs(); }, []);

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

  const loadPendingProofs = async () => {
    setLoadingProofs(true);
    try {
      const snap = await getDocs(
        query(collectionGroup(db, "subscriptionPayments"), where("status", "==", "pending"), orderBy("createdAt", "asc"))
      );
      setPendingProofs(snap.docs.map((d) => ({
        id: d.id,
        companyId: d.ref.parent.parent.id,
        ...d.data(),
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProofs(false);
    }
  };

  const review = async (proof, decision) => {
    setReviewing(proof.id);
    try {
      const paymentRef = doc(db, "companies", proof.companyId, "subscriptionPayments", proof.id);
      await updateDoc(paymentRef, {
        status: decision,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid || null,
      });

      if (decision === "approved") {
        const company = companies.find((c) => c.id === proof.companyId);
        await updateDoc(doc(db, "companies", proof.companyId), {
          subscriptionStatus: "active",
          currentPeriodEnd: extendedPeriodEnd(company),
        });
      }

      setPendingProofs((prev) => prev.filter((p) => p.id !== proof.id));
      load();
    } catch (e) {
      alert("Failed to update: " + e.message);
    } finally {
      setReviewing(null);
    }
  };

  const toggleLock = async (company) => {
    const locking = company.subscriptionStatus !== "locked";
    if (!window.confirm(
      locking
        ? `Lock ${company.name}? They'll lose access to everything except Billing and Settings.`
        : `Unlock ${company.name}? They'll regain full access immediately.`
    )) return;

    const today = new Date().toISOString().slice(0, 10);
    const nextStatus = locking
      ? "locked"
      : (company.currentPeriodEnd && company.currentPeriodEnd >= today ? "active" : "past_due");

    try {
      await updateDoc(doc(db, "companies", company.id), { subscriptionStatus: nextStatus });
      setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, subscriptionStatus: nextStatus } : c));
    } catch (e) {
      alert("Failed to update: " + e.message);
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
        <div className="sa-topbar-brand">
          <div className="sa-topbar-logo"><BrandMark size={22} /></div>
          <div>
            <h1>Malachi — Super Admin</h1>
            <p>Every company enrolled on the platform</p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => logout()}><SignOut size={15} /> Sign Out</button>
      </header>

      <div className="sa-stats">
        <div className="stat-card" style={{ "--card-accent": "#b5573a" }}>
          <span className="stat-icon"><Buildings size={20} weight="regular" /></span>
          <div className="stat-label">Companies Installed</div>
          <div className="stat-value">{totalCompanies}</div>
          <div className="stat-sub">Total enrollments</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#3f7d5c" }}>
          <span className="stat-icon"><CheckCircle size={20} weight="regular" /></span>
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">Currently active accounts</div>
        </div>
        <div className="stat-card" style={{ "--card-accent": "#3a6ea5" }}>
          <span className="stat-icon"><Users size={20} weight="regular" /></span>
          <div className="stat-label">Total Tenants Managed</div>
          <div className="stat-value">{totalTenants}</div>
          <div className="stat-sub">Across every company</div>
        </div>
      </div>

      <div className="properties-table-wrap" style={{ marginBottom: 24 }}>
        <div className="table-header-bar">
          <h2><Receipt size={16} weight="regular" style={{ verticalAlign: "-2px" }} /> Pending Payment Proofs</h2>
          {pendingProofs.length > 0 && <span className="count-tag">{pendingProofs.length} awaiting review</span>}
        </div>
        <div className="table-scroll">
          {loadingProofs ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : pendingProofs.length === 0 ? (
            <div className="empty-state"><p>Nothing pending — all caught up.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Submitted</th>
                  <th>Proof</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingProofs.map((p) => {
                  const company = companies.find((c) => c.id === p.companyId);
                  return (
                    <tr key={p.id}>
                      <td>{company?.name || p.companyId}</td>
                      <td>{Number(p.amount || 0).toLocaleString()} TZS</td>
                      <td style={{ maxWidth: 200 }}>{p.note || "—"}</td>
                      <td>{fmtDate(p.createdAt)}</td>
                      <td>
                        {p.proofPhotoUrl
                          ? <a href={p.proofPhotoUrl} target="_blank" rel="noreferrer">View</a>
                          : "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="action-btn"
                            title="Approve"
                            disabled={reviewing === p.id}
                            onClick={() => review(p, "approved")}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="action-btn delete"
                            title="Reject"
                            disabled={reviewing === p.id}
                            onClick={() => review(p, "rejected")}
                          >
                            <XIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
            <div className="empty-state"><div className="icon"><Buildings size={40} weight="thin" /></div><p>Loading companies…</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon"><Buildings size={40} weight="thin" /></div><p>No companies enrolled yet.</p></div>
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
                  <th>Subscription</th>
                  <th>Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = c.subscriptionStatus || "trialing";
                  const statusClass = status === "locked" ? "expired" : status === "past_due" ? "expiring" : "active";
                  const locked = status === "locked";
                  return (
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
                      <span className={`badge ${statusClass}`} style={{ textTransform: "capitalize" }}>
                        {status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {c.subscriptionAmount
                        ? `${Number(c.subscriptionAmount).toLocaleString()} TZS ${FREQUENCY_SUFFIX[c.subscriptionFrequency] || "per month"}`
                        : <span style={{ color: "var(--text-sub)" }}>Not set</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn"
                          title="Set rate"
                          onClick={() => setRatingCompany(c)}
                        >
                          <PencilSimple size={15} />
                        </button>
                        <button
                          className={`action-btn ${locked ? "" : "delete"}`}
                          title={locked ? "Unlock account" : "Lock account"}
                          onClick={() => toggleLock(c)}
                        >
                          {locked ? <LockSimpleOpen size={15} /> : <LockSimple size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {ratingCompany && (
        <SetRateModal
          company={ratingCompany}
          onClose={() => setRatingCompany(null)}
          onSaved={(updated) => {
            setCompanies((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
            setRatingCompany(null);
          }}
        />
      )}
    </div>
  );
}

export default SuperAdmin;
