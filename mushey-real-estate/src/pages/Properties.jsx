// pages/Properties.jsx
import { useState, useEffect } from "react";
import {
  doc, addDoc, updateDoc, collection, getDocs, deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useCompany } from "../components/CompanyProvider";
import PhotoUpload from "../components/PhotoUpload";
import "../styles/properties.css";

const PROPERTY_TYPES = ["House", "Shop", "Warehouse", "Yard", "Open Space"];
const ID_TYPES = ["National ID", "Passport", "Voter ID", "Driving License"];

const emptyForm = {
  area: "", type: "", propertyName: "", tenantName: "",
  rent: "", contractStart: "", contractEnd: "", phone: "", notes: "",
  idType: "", idNumber: "", idPhotoUrl: "",
};

function Properties() {
  const { membership, company } = useCompany();
  const areas = company?.areas || [];

  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [search, setSearch]         = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [saving, setSaving]         = useState(false);

  useEffect(() => { loadProperties(); }, [membership?.companyId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const propertiesRef = () => collection(db, "companies", membership.companyId, "properties");

  const loadProperties = async () => {
    if (!membership?.companyId) return;
    setLoading(true);
    try {
      const snap = await getDocs(propertiesRef());
      setProperties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      area: p.area, type: p.type, propertyName: p.propertyName,
      tenantName: p.tenantName, rent: p.rent,
      contractStart: p.contractStart, contractEnd: p.contractEnd,
      phone: p.phone || "", notes: p.notes || "",
      idType: p.idType || "", idNumber: p.idNumber || "", idPhotoUrl: p.idPhotoUrl || "",
    });
    setEditMode(true);
    setEditId(p.id);
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
        area: form.area,
        type: form.type,
        propertyName: form.propertyName,
        tenantName: form.tenantName,
        rent: form.rent,
        contractStart: form.contractStart,
        contractEnd: form.contractEnd,
        phone: form.phone,
        notes: form.notes,
        idType: form.idType,
        idNumber: form.idNumber,
        idPhotoUrl: form.idPhotoUrl,
      };

      if (editMode) {
        await updateDoc(doc(db, "companies", membership.companyId, "properties", editId), data);
      } else {
        await addDoc(propertiesRef(), {
          ...data,
          status: "occupied",
          rentPaid: false,
          cleaningPaid: false,
          waterPaid: false,
          idVerified: false,
        });
      }
      setShowModal(false);
      loadProperties();
    } catch (e) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete ${p.propertyName}?`)) return;
    await deleteDoc(doc(db, "companies", membership.companyId, "properties", p.id));
    loadProperties();
  };

  const toggleVerified = async (p) => {
    await updateDoc(doc(db, "companies", membership.companyId, "properties", p.id), {
      idVerified: !p.idVerified,
    });
    setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, idVerified: !p.idVerified } : x));
  };

  const filtered = properties.filter((p) => {
    const matchSearch =
      (p.propertyName || "").toLowerCase().includes(search.toLowerCase()) ||
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
                  <th>ID</th>
                  <th>Rent (TZS)</th>
                  <th>Contract End</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.area}</td>
                    <td>
                      <div className="tenant-cell">
                        <span className="name">{p.propertyName}</span>
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
                      {p.idNumber ? (
                        <button
                          className={`badge ${p.idVerified ? "active" : "expiring"}`}
                          style={{ cursor: "pointer", border: "none" }}
                          onClick={() => toggleVerified(p)}
                          title="Click to toggle verified"
                        >
                          {p.idVerified ? "✓ Verified" : "Unverified"}
                        </button>
                      ) : "—"}
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
                  <select value={form.area} onChange={(e) => set("area", e.target.value)}>
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

              <div className="form-row">
                <div className="form-group">
                  <label>Tenant ID Type</label>
                  <select value={form.idType} onChange={(e) => set("idType", e.target.value)}>
                    <option value="">Select ID Type</option>
                    {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tenant ID Number</label>
                  <input
                    placeholder="ID number"
                    value={form.idNumber}
                    onChange={(e) => set("idNumber", e.target.value)}
                  />
                </div>
              </div>

              {editMode ? (
                <PhotoUpload
                  storagePath={`companies/${membership.companyId}/properties/${editId}/id-photo`}
                  currentUrl={form.idPhotoUrl}
                  label="Tenant ID Photo"
                  onUploaded={(url) => set("idPhotoUrl", url)}
                />
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Save the property first, then reopen it here to attach an ID photo.
                </p>
              )}

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
