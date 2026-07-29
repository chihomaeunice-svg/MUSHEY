// src/utils/invoicePdf.js
// Generates a pre-payment invoice PDF a landlord can send to a tenant over
// WhatsApp/email — rent plus any cleaning/water fees that are billed
// separately (fees folded into rent are called out as included, not billed
// again as their own line).

import jsPDF from "jspdf";

function invoiceNumber(property, period) {
  const periodTag = period.replace("-", "");
  const propertyTag = (property.id || "").slice(-5).toUpperCase();
  return `INV-${periodTag}-${propertyTag}`;
}

function formatPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function generateInvoicePdf({ company, property, period, dueDate }) {
  const pdf = new jsPDF({ unit: "mm", format: [148, 210] }); // A5
  const pageWidth = 148;
  const marginX = 12;
  let y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(company?.name || "Company Invoice", pageWidth / 2, y, { align: "center" });

  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  if (company?.tin) { pdf.text(`TIN: ${company.tin}`, pageWidth / 2, y, { align: "center" }); y += 4.5; }
  if (company?.phone) { pdf.text(`Tel: ${company.phone}`, pageWidth / 2, y, { align: "center" }); y += 4.5; }

  y += 4;
  pdf.setLineWidth(0.3);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("INVOICE", pageWidth / 2, y, { align: "center" });
  y += 9;

  pdf.setFontSize(10);
  const row = (label, value) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(value ?? "—"), marginX + 42, y);
    y += 7;
  };

  row("Invoice No:", invoiceNumber(property, period));
  row("Billing Period:", formatPeriod(period));
  row("Due Date:", new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  row("Tenant:", property.tenantName || "—");
  row("Property:", `${property.propertyName} — ${property.area}`);

  y += 3;
  pdf.setLineWidth(0.2);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Description", marginX, y);
  pdf.text("Amount (TZS)", pageWidth - marginX, y, { align: "right" });
  y += 6;
  pdf.setLineWidth(0.15);
  pdf.line(marginX, y - 3, pageWidth - marginX, y - 3);

  pdf.setFont("helvetica", "normal");
  let total = 0;

  const lineItem = (label, amount) => {
    pdf.text(label, marginX, y);
    pdf.text(Number(amount).toLocaleString(), pageWidth - marginX, y, { align: "right" });
    y += 7;
    total += Number(amount) || 0;
  };

  const includedNote = (label) => {
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(120, 120, 120);
    pdf.text(`${label} — included in rent`, marginX, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    y += 7;
  };

  lineItem("Rent", property.rent || 0);
  if (property.cleaningIncluded) includedNote("Cleanliness Fee");
  else if (property.cleaningFee) lineItem("Cleanliness Fee", property.cleaningFee);
  if (property.waterIncluded) includedNote("Dirty Water Collection");
  else if (property.waterFee) lineItem("Dirty Water Collection", property.waterFee);

  y += 2;
  pdf.setLineWidth(0.2);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Total Due:", marginX, y);
  pdf.text(`${total.toLocaleString()} TZS`, pageWidth - marginX, y, { align: "right" });
  y += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    company?.phone
      ? `Please arrange payment with ${company.name || "your landlord"} (${company.phone}) by the due date above.`
      : "Please arrange payment with your landlord by the due date above.",
    pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 }
  );
  y += 4;
  pdf.text(
    "This is a computer-generated invoice, not a payment receipt.",
    pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 }
  );

  pdf.save(`${invoiceNumber(property, period)}.pdf`);
}
