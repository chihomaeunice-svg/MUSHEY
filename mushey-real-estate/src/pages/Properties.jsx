// pages/Properties.jsx
import { useState, useEffect } from "react";
import {
  doc, setDoc, collection, getDocs, deleteDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import areas from "../data/areas";
import "../styles/properties.css";

const PROPERTY_TYPES = ["House", "Shop", "Warehouse", "Yard", "Open Space"];

const emptyForm = {
  area: "", type: "", propertyName: "", tenantName: "",
  rent: "", contractStart: "", contractEnd: "", phone: "", notes: "",
};

function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [editArea, setEditArea]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [search, setSearch]         = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [saving, setSaving]         = useState(false);

  useEffect(() => { loadProperties(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const openAdd = () => {
    setForm(emptyForm);
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({
      area: p.area, type: p.type, propertyName: p.id,
      tenantName: p.tenantName, rent: p.rent,
      contractStart: p.contractStart, contractEnd: p.contractEnd,
      phone: p.phone || "", notes: p.notes || "",
    });
    setEditMode(true);
    setEditId(p.id);
    setEditArea(p.area);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.area || !form.propertyName || !form.tenantName) {
      alert("Area, Property Name, and Tenant Name are required.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        type: form.type,
        tenantName: form.tenantName,
        rent: form.rent,
        contractStart: form.contractStart,
        contractEnd: form.contractEnd,
        phone: form.phone,
        notes: form.notes,
        status: "occupied",
        rentPaid: false,
        cleaningPaid: false,
        waterPaid: false,
      };
      await setDoc(
        doc(db, "areas", form.area, "properties", form.propertyName),
        data,
        { merge: editMode }
      );
      setShowModal(false);
      loadProperties();
    } catch (e) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete ${p.id} from ${p.area}?`)) return;
    await deleteDoc(doc(db, "areas", p.area, "properties", p.id));
    loadProperties();
  };

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.tenantName || "").toLowerCase().includes(search.toLowerCase());
    const matchArea = filterArea === "all" || p.area === filterArea;
    return matchSearch && matchArea;
  });

  const daysLeft = (end) => {
    if (!end) return null;
    const d = Math.ceil((new Date(end) - new Date()) / (1000 * 60 * 60 * 24));
    return d;
  };

  const contractStatus = (end) => {
    const d = daysLeft(end);
    if (d === null) return null;
    if (d < 0)   return <span className="badge expired">Expired</span>;
    if (d < 30)  return <span className="badge expiring">Expires in {d}d</span>;
    return <span className="badge active">Active</span>;
  };

  return (
    <div className="properties">
      <div className="page-header">
        <h1>Properties</h1>
        <p>All houses and shops across every area</p>
      </div>

      {/* Toolbar */}
      <div className="properties-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search property or tenant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
          >
            <option value="all">All Areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          ＋ Add Property
        </button>
      </div>

      {/* Table */}
      <div className="properties-table-wrap">
        <div className="table-header-bar">
          <h2>All Properties</h2>
          <span className="count-tag">{filtered.length} records</span>
        </div>
        <div className="table-scroll">
          {loading ? (
            <div className="empty-state">
              <div className="icon">⏳</div>
              <p>Loading properties…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏠</div>
              <p>No properties found. Click "Add Property" to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Tenant</th>
                  <th>Rent (TZS)</th>
                  <th>Contract End</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={`${p.area}-${p.id}`}>
                    <td>{p.area}</td>
                    <td>
                      <div className="tenant-cell">
                        <span className="name">{p.id}</span>
                      </div>
                    </td>
                    <td>{p.type || "—"}</td>
                    <td>
                      <div className="tenant-cell">
                        <span className="name">{p.tenantName || "—"}</span>
                        {p.phone && <span className="area">{p.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="rent-cell">
                        {Number(p.rent || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>{p.contractEnd || "—"}</td>
                    <td>{contractStatus(p.contractEnd)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn" onClick={() => openEdit(p)} title="Edit">✏️</button>
                        <button className="action-btn delete" onClick={() => handleDelete(p)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editMode ? "Edit Property" : "Add New Property"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Area *</label>
                  <select value={form.area} onChange={(e) => set("area", e.target.value)} disabled={editMode}>
                    <option value="">Select Area</option>
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Property Type</label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="">Select Type</option>
                    {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Property Name / Number *</label>
                <input
                  placeholder="e.g. House 1, Shop A"
                  value={form.propertyName}
                  onChange={(e) => set("propertyName", e.target.value)}
                  disabled={editMode}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tenant Name *</label>
                  <input
                    placeholder="Full name"
                    value={form.tenantName}
                    onChange={(e) => set("tenantName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    placeholder="0712 345 678"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Monthly Rent (TZS)</label>
                <input
                  type="number"
                  placeholder="e.g. 250000"
                  value={form.rent}
                  onChange={(e) => set("rent", e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contract Start</label>
                  <input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Contract End</label>
                  <input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  placeholder="Any additional notes…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editMode ? "Update Property" : "Add Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Properties;