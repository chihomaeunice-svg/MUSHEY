// src/utils/receiptPdf.js
// Generates a professional, TRA-styled payment receipt (sequential number,
// company TIN, itemized amount). This is a company-issued receipt, not an
// official TRA/EFD fiscal document — that requires TRA-issued device
// certification that only the landlord/company itself can obtain.

import jsPDF from "jspdf";

const TYPE_LABELS = {
  rent: "Rent",
  cleaning: "Cleanliness Fee",
  water: "Dirty Water Collection",
};

export function generateReceiptPdf({ company, payment }) {
  const pdf = new jsPDF({ unit: "mm", format: [148, 210] }); // A5
  const pageWidth = 148;
  const marginX = 12;
  let y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(company?.name || "Company Receipt", pageWidth / 2, y, { align: "center" });

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
  pdf.text("PAYMENT RECEIPT", pageWidth / 2, y, { align: "center" });
  y += 9;

  pdf.setFontSize(10);
  const paidDate = payment.paidAt instanceof Date ? payment.paidAt : new Date();

  const row = (label, value) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(value ?? "—"), marginX + 42, y);
    y += 7;
  };

  row("Receipt No:", payment.receiptNumber);
  row("Date:", paidDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  row("Tenant:", payment.tenantName || "—");
  row("Property:", `${payment.propertyName} — ${payment.area}`);
  row("Payment For:", TYPE_LABELS[payment.type] || payment.type);

  y += 3;
  pdf.setLineWidth(0.2);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Amount Paid:", marginX, y);
  pdf.text(`${Number(payment.amount || 0).toLocaleString()} TZS`, pageWidth - marginX, y, { align: "right" });
  y += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    "This is a computer-generated receipt issued by the company above.",
    pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 }
  );
  y += 4;
  pdf.text(
    "It is not an official TRA/EFD fiscal tax receipt.",
    pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 }
  );

  pdf.save(`${payment.receiptNumber}.pdf`);
}
