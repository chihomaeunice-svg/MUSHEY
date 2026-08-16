// src/components/ImportPropertiesModal.jsx
// Bulk-add properties from a CSV file (the format Excel/Google Sheets both
// export with one click), so a landlord with 100+ properties doesn't have to
// type each one in through the Add Property modal.

import { useState } from "react";
import { collection, doc, updateDoc, writeBatch } from "firebase/firestore";
import { X, UploadSimple, DownloadSimple } from "@phosphor-icons/react";
import { db } from "../firebase/firebaseConfig";
import { parseCsv, downloadCsv } from "../utils/csv";
import { FREQUENCIES } from "../utils/billing";

const TEMPLATE_HEADERS = [
  "Area", "Type", "Property Name", "Status", "Tenant Name", "Phone",
  "Rent", "Rent Frequency", "Contract Start", "Contract End", "ID Type", "ID Number", "Notes",
];

const TEMPLATE_EXAMPLE = [
  "Kinondoni", "House", "House 12", "occupied", "Amina Juma", "0712345678",
  "250000", "monthly", "2026-01-01", "2026-12-31", "National ID", "1990-1-2-345678", "",
];

const FIELD_BY_HEADER = {
  area: "area",
  district: "area",
  type: "type",
  propertytype: "type",
  propertyname: "propertyName",
  property: "propertyName",
  propertynamenumber: "propertyName",
  status: "status",
  occupancystatus: "status",
  tenantname: "tenantName",
  tenant: "tenantName",
  phone: "phone",
  phonenumber: "phone",
  rent: "rent",
  monthlyrent: "rent",
  rentfrequency: "rentFrequency",
  frequency: "rentFrequency",
  collected: "rentFrequency",
  contractstart: "contractStart",
  contractend: "contractEnd",
  idtype: "idType",
  idnumber: "idNumber",
  notes: "notes",
};

const normalizeHeader = (h) => String(h ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const CHUNK_SIZE = 400; // Firestore batches cap at 500 writes; leave headroom

// Upsert key: same Area + Property Name is treated as "this row updates that
// existing property" rather than creating a duplicate — so re-uploading a
// corrected sheet fixes rent/fees in place instead of piling up copies.
const matchKey = (area, propertyName) => `${area.trim().toLowerCase()}|||${propertyName.trim().toLowerCase()}`;

function parseRows(text) {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], unknownHeaders: [] };

  const headerCells = table[0];
  const fields = headerCells.map((h) => FIELD_BY_HEADER[normalizeHeader(h)] || null);
  const unknownHeaders = headerCells.filter((_, i) => !fields[i]);

  const rows = table.slice(1).map((cells, i) => {
    const raw = {};
    fields.forEach((field, colIdx) => {
      if (field) raw[field] = (cells[colIdx] ?? "").trim();
    });

    const errors = [];
    if (!raw.area) errors.push("missing Area");
    if (!raw.propertyName) errors.push("missing Property Name");
    const status = (raw.status || "occupied").toLowerCase() === "vacant" ? "vacant" : "occupied";
    if (status === "occupied" && !raw.tenantName) errors.push("missing Tenant Name (or set Status to vacant)");
    if (!raw.rent) errors.push("missing Rent");
    else if (Number(raw.rent) <= 0) errors.push("Rent must be greater than 0");

    // Left blank, this column is simply not part of the row — for an update
    // that means "leave whatever frequency the property already has alone"
    // rather than silently resetting it to monthly.
    const freqRaw = raw.rentFrequency ? raw.rentFrequency.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const freqMatch = !freqRaw ? undefined : (
      Object.keys(FREQUENCIES).find((k) => k === freqRaw)
      || (freqRaw.startsWith("quarter") ? "quarterly"
        : freqRaw.startsWith("month") ? "monthly"
        : freqRaw.startsWith("annual") || freqRaw.startsWith("year") ? "annual"
        : freqRaw.includes("6") || freqRaw.startsWith("semi") || freqRaw.startsWith("bian") ? "semiannual"
        : null)
    );
    if (raw.rentFrequency && !freqMatch) errors.push(`unrecognized Rent Frequency "${raw.rentFrequency}"`);

    return {
      line: i + 2,
      valid: errors.length === 0,
      errors,
      data: {
        area: raw.area || "",
        type: raw.type || "",
        propertyName: raw.propertyName || "",
        status,
        tenantName: status === "vacant" ? "" : (raw.tenantName || ""),
        rent: raw.rent || "",
        rentFrequency: freqMatch, // undefined when not in the CSV — see handleImport
        contractStart: status === "vacant" ? "" : (raw.contractStart || ""),
        contractEnd: status === "vacant" ? "" : (raw.contractEnd || ""),
        phone: status === "vacant" ? "" : (raw.phone || ""),
        notes: raw.notes || "",
        idType: raw.idType || "",
        idNumber: raw.idNumber || "",
        idPhotoUrl: "",
      },
    };
  });

  return { rows, unknownHeaders };
}

export default function ImportPropertiesModal({ companyId, existingAreas, existingProperties, onClose, onImported, refreshCompany }) {
  const [rows, setRows] = useState(null);
  const [unknownHeaders, setUnknownHeaders] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [parseError, setParseError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError("");
    try {
      const text = await file.text();
      const { rows: parsed, unknownHeaders: unknown } = parseRows(text);
      if (parsed.length === 0) {
        setParseError("Couldn't find any data rows — make sure the first row is a header row matching the template.");
        setRows(null);
        return;
      }
      setRows(parsed);
      setUnknownHeaders(unknown);
    } catch (err) {
      setParseError("Couldn't read that file: " + err.message);
      setRows(null);
    }
  };

  const existingByKey = new Map(
    (existingProperties || []).map((p) => [matchKey(p.area || "", p.propertyName || ""), p.id])
  );

  const invalidRows = (rows || []).filter((r) => !r.valid);
  const validRows = (rows || [])
    .filter((r) => r.valid)
    .map((r) => ({ ...r, existingId: existingByKey.get(matchKey(r.data.area, r.data.propertyName)) || null }));
  const newCount = validRows.filter((r) => !r.existingId).length;
  const updateCount = validRows.filter((r) => r.existingId).length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const propertiesCol = collection(db, "companies", companyId, "properties");
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        for (const row of validRows.slice(i, i + CHUNK_SIZE)) {
          if (row.existingId) {
            // Update in place — leaves rentPaid/cleaningPaid/waterPaid/idVerified
            // untouched, since the CSV doesn't represent this month's paid state.
            // rentFrequency only gets touched if the CSV actually specified it,
            // so an unrelated correction doesn't quietly reset it to monthly.
            const updateData = { ...row.data };
            if (updateData.rentFrequency === undefined) delete updateData.rentFrequency;
            batch.update(doc(propertiesCol, row.existingId), updateData);
          } else {
            batch.set(doc(propertiesCol), {
              ...row.data,
              rentFrequency: row.data.rentFrequency || "monthly",
              rentPaid: false,
              cleaningPaid: false,
              waterPaid: false,
              idVerified: false,
            });
          }
        }
        await batch.commit();
      }

      const newAreas = [...new Set(validRows.map((r) => r.data.area))]
        .filter((a) => !existingAreas.includes(a));
      if (newAreas.length > 0) {
        await updateDoc(doc(db, "companies", companyId), {
          areas: [...existingAreas, ...newAreas],
        });
        await refreshCompany?.();
      }

      setResult({ created: newCount, updated: updateCount, skipped: invalidRows.length });
      onImported?.();
    } catch (err) {
      setParseError("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal import-modal">
        <div className="modal-header">
          <h2>Import Properties from CSV</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="modal-body">
          {result ? (
            <div className="empty-state">
              <p>
                Added <strong>{result.created}</strong> new {result.created === 1 ? "property" : "properties"}
                {result.updated > 0 && <> and updated <strong>{result.updated}</strong> existing {result.updated === 1 ? "property" : "properties"}</>}.
                {result.skipped > 0 && ` ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped — see details before closing.`}
              </p>
            </div>
          ) : (
            <>
              <p className="settings-card-sub">
                Upload a CSV with one row per property. Each landlord's spreadsheet can use any
                of these column names (any order): Area, Type, Property Name, Status
                (occupied/vacant), Tenant Name, Phone, Rent, Rent Frequency
                (monthly/quarterly/semiannual/annual — defaults to monthly), Contract Start,
                Contract End, ID Type, ID Number, Notes. Area, Property Name, and Rent are
                required. A row whose Area + Property Name matches an existing property updates
                it in place instead of creating a duplicate — paid/verified status is left
                untouched either way.
              </p>

              <div className="import-actions-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadCsv("malachi-properties-template.csv", [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE])}
                >
                  <DownloadSimple size={15} /> Download template
                </button>
                <label className="btn btn-primary import-file-label">
                  <UploadSimple size={15} /> Choose CSV file
                  <input type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
                </label>
                {fileName && <span className="settings-card-sub">{fileName}</span>}
              </div>

              {parseError && <p className="import-error-banner">{parseError}</p>}

              {rows && (
                <>
                  <div className="import-summary">
                    {newCount > 0 && <span className="badge active">{newCount} new</span>}
                    {updateCount > 0 && <span className="badge expiring">{updateCount} update existing</span>}
                    {invalidRows.length > 0 && (
                      <span className="badge expired">{invalidRows.length} skipped (missing required fields)</span>
                    )}
                    {unknownHeaders.length > 0 && (
                      <span className="badge expiring">Unrecognized column(s): {unknownHeaders.join(", ")}</span>
                    )}
                  </div>

                  {invalidRows.length > 0 && (
                    <div className="import-table-wrap">
                      <table>
                        <thead><tr><th>Row</th><th>Property</th><th>Problem</th></tr></thead>
                        <tbody>
                          {invalidRows.slice(0, 30).map((r) => (
                            <tr key={r.line}>
                              <td>{r.line}</td>
                              <td>{r.data.propertyName || "—"}</td>
                              <td>{r.errors.join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {invalidRows.length > 30 && (
                        <p className="settings-card-sub">…and {invalidRows.length - 30} more.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{result ? "Close" : "Cancel"}</button>
          {!result && (
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!rows || validRows.length === 0 || importing}
            >
              {importing
                ? "Importing…"
                : `Import ${validRows.length || ""} ${validRows.length === 1 ? "Property" : "Properties"}`
                  + (updateCount > 0 ? ` (${updateCount} update${updateCount === 1 ? "" : "s"})` : "")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
