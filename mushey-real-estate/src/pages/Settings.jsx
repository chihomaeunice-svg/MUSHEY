// pages/Settings.jsx
// Per-company configuration: profile, where alert emails go, whether tenants
// must upload a payment receipt, and the list of areas/neighborhoods.

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import "../styles/settings.css";

function Settings() {
  const { membership, company } = useCompany();
  const [form, setForm] = useState({
    name: company?.name || "",
    tin: company?.tin || "",
    phone: company?.phone || "",
    notifyEmail: company?.notifyEmail || "",
    requireReceiptUpload: !!company?.requireReceiptUpload,
    receiptPrefix: company?.receiptPrefix || "MSH",
  });
  const [areas, setAreas] = useState(company?.areas || []);
  const [newArea, setNewArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!company) {
    return (
      <div className="settings">
        <div className="page-header"><h1>Settings</h1></div>
        <div className="empty-state"><p>Loading company settings…</p></div>
      </div>
    );
  }

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const addArea = () => {
    const name = newArea.trim();
    if (!name || areas.includes(name)) return;
    setAreas((a) => [...a, name]);
    setNewArea("");
    setSaved(false);
  };

  const removeArea = (name) => {
    setAreas((a) => a.filter((x) => x !== name));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "companies", membership.companyId), {
        name: form.name,
        tin: form.tin,
        phone: form.phone,
        notifyEmail: form.notifyEmail,
        requireReceiptUpload: form.requireReceiptUpload,
        receiptPrefix: form.receiptPrefix,
        areas,
      });
      setSaved(true);
    } catch (e) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Company profile, notifications, and areas</p>
      </div>

      <div className="settings-grid">
        {/* Company profile */}
        <div className="card">
          <h2 className="settings-card-title">Company Profile</h2>

          <div className="form-group">
            <label>Company / Landlord Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label>TIN</label>
            <input value={form.tin} onChange={(e) => set("tin", e.target.value)} placeholder="e.g. 123-456-789" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Receipt Number Prefix</label>
            <input
              value={form.receiptPrefix}
              onChange={(e) => set("receiptPrefix", e.target.value.toUpperCase())}
              placeholder="e.g. MSH"
              maxLength={6}
            />
          </div>
        </div>

        {/* Notifications & receipts */}
        <div className="card">
          <h2 className="settings-card-title">Notifications & Receipts</h2>

          <div className="form-group">
            <label>Alert Email Address</label>
            <input
              type="email"
              value={form.notifyEmail}
              onChange={(e) => set("notifyEmail", e.target.value)}
              placeholder="where rent/expiry alerts are sent"
            />
          </div>

          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={form.requireReceiptUpload}
              onChange={(e) => set("requireReceiptUpload", e.target.checked)}
            />
            <div>
              <div className="settings-toggle-label">Require receipt photo after payment</div>
              <div className="settings-toggle-sub">
                When on, tenants/staff must attach a photo of the payment slip.
                When off, uploading a receipt photo stays optional.
              </div>
            </div>
          </label>
        </div>

        {/* Areas */}
        <div className="card settings-areas">
          <h2 className="settings-card-title">Areas</h2>
          <p className="settings-card-sub">Neighborhoods/zones used across Properties, Contracts, and Reports.</p>

          <div className="settings-area-add">
            <input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea())}
              placeholder="Add a new area…"
            />
            <button type="button" className="btn btn-ghost" onClick={addArea}>Add</button>
          </div>

          <div className="settings-area-chips">
            {areas.length === 0 && <span className="settings-card-sub">No areas yet — add one above.</span>}
            {areas.map((a) => (
              <span className="settings-area-chip" key={a}>
                {a}
                <button type="button" onClick={() => removeArea(a)} title="Remove">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-footer">
        {saved && <span className="settings-saved">✓ Saved</span>}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

export default Settings;
