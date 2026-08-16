// src/utils/billing.js
// Rent doesn't have to be collected monthly — many landlords collect
// quarterly, every 6 months, or annually. Instead of a single eternal
// "rentPaid" checkbox, a property tracks the date rent is paid through;
// "current" just means that date hasn't passed yet. Frequency only matters
// for how far a new payment pushes that date out.

export const FREQUENCIES = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

export const FREQUENCY_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly (3 months)",
  semiannual: "Every 6 months",
  annual: "Annually",
};

export const FREQUENCY_SUFFIX = {
  monthly: "per month",
  quarterly: "per quarter",
  semiannual: "every 6 months",
  annual: "per year",
};

function toDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function todayStr(today = new Date()) {
  return today.toISOString().slice(0, 10);
}

export function addMonths(dateStr, months) {
  const d = toDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Is rent currently settled? Falls back to the legacy boolean for
 * properties that predate period tracking (no rentPaidThrough on file). */
export function isRentCurrent(property, today = new Date()) {
  if (property.rentPaidThrough) {
    return toDate(property.rentPaidThrough) >= toDate(todayStr(today));
  }
  return !!property.rentPaid;
}

/** Rent is entered as the amount due per billing cycle (e.g. 750,000 every
 * quarter), not always per month — so anything projecting monthly/forward
 * revenue needs this, not the raw rent field, or a quarterly property would
 * be counted as if that amount recurred every single month. */
export function monthlyEquivalent(property) {
  const months = FREQUENCIES[property.rentFrequency] || 1;
  return Number(property.rent || 0) / months;
}

/** Where rentPaidThrough should land after recording a new rent payment —
 * extends from whichever is later: today, or the existing paid-through date
 * (so paying early doesn't shorten a period already paid for). */
export function nextPaidThrough(property, today = new Date()) {
  const months = FREQUENCIES[property.rentFrequency] || 1;
  const base =
    property.rentPaidThrough && toDate(property.rentPaidThrough) > today
      ? property.rentPaidThrough
      : todayStr(today);
  return addMonths(base, months);
}
