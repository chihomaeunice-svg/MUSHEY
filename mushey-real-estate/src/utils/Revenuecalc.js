// src/utils/revenueCalc.js

/**
 * Count how many WHOLE months a contract covers.
 * e.g. Jan 1 → Jun 30 = 6 months
 * e.g. Mar 17 → Mar 20 = 0 whole months (less than 1 month)
 */
export function contractMonths(contractStart, contractEnd) {
  if (!contractStart || !contractEnd) return 0;
  const cs = new Date(contractStart);
  const ce = new Date(contractEnd);
  if (ce <= cs) return 0;

  let months =
    (ce.getFullYear() - cs.getFullYear()) * 12 +
    (ce.getMonth() - cs.getMonth());

  // If end day is before start day, it's not a full month yet
  if (ce.getDate() < cs.getDate()) months -= 1;

  return Math.max(0, months);
}

/**
 * Total value of a contract = rent × whole months.
 * A 3-day contract = 0 months = 0 TZS (no fractional days).
 */
export function contractTotalRevenue(rent, contractStart, contractEnd) {
  if (!rent) return 0;
  return Number(rent) * contractMonths(contractStart, contractEnd);
}

/**
 * How many whole months have passed since contract started (up to today or end).
 * This is what SHOULD have been collected — whole months only.
 */
export function monthsElapsed(contractStart, contractEnd) {
  if (!contractStart) return 0;
  const cs    = new Date(contractStart);
  const today = new Date();
  const cap   = contractEnd && new Date(contractEnd) < today
    ? new Date(contractEnd)
    : today;

  if (cap <= cs) return 0;

  let months =
    (cap.getFullYear() - cs.getFullYear()) * 12 +
    (cap.getMonth() - cs.getMonth());

  if (cap.getDate() < cs.getDate()) months -= 1;

  return Math.max(0, months);
}

/**
 * Revenue expected = rent × whole months remaining from today within contract.
 * Used for forward projections (1M, 3M, 6M, 12M buttons).
 */
export function revenueForPeriod(rent, contractStart, contractEnd, periodMonths) {
  if (!rent) return 0;
  const today   = new Date();
  const cs      = contractStart ? new Date(contractStart) : today;
  const ce      = contractEnd   ? new Date(contractEnd)   : null;

  // Window: today → today + periodMonths
  const windowEnd = new Date(today);
  windowEnd.setMonth(windowEnd.getMonth() + periodMonths);

  // Contract must still be active
  if (ce && ce <= today) return 0;

  // End of overlap = min(contractEnd, windowEnd)
  const overlapEnd = ce && ce < windowEnd ? ce : windowEnd;

  // Start of overlap = max(contractStart, today)
  const overlapStart = cs > today ? cs : today;

  if (overlapEnd <= overlapStart) return 0;

  // Count whole months in overlap
  let months =
    (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
    (overlapEnd.getMonth() - overlapStart.getMonth());

  if (overlapEnd.getDate() < overlapStart.getDate()) months -= 1;

  return Number(rent) * Math.max(0, months);
}

/**
 * How many days until contract expires. Negative = already expired.
 */
export function daysUntilExpiry(contractEnd) {
  if (!contractEnd) return null;
  return Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
}

/**
 * Contract status string
 */
export function contractStatus(contractEnd) {
  const d = daysUntilExpiry(contractEnd);
  if (d === null) return "no-date";
  if (d < 0)      return "expired";
  if (d <= 14)    return "critical";
  if (d <= 30)    return "expiring";
  return "active";
}

/**
 * Format TZS amount — whole numbers only, no decimals
 */
export function fmtTZS(amount) {
  return Math.round(Number(amount || 0)).toLocaleString("en-TZ") + " TZS";
}

/**
 * Revenue a contract generates within a fixed calendar year (Jan 1 → Dec 31).
 * Counts whole months where the contract overlaps with that year.
 * e.g. contract Mar→Aug in year 2026 = 5 months (Mar, Apr, May, Jun, Jul)
 */
export function revenueForYear(rent, contractStart, contractEnd, year) {
  if (!rent) return 0;

  const yearStart = new Date(year, 0, 1);   // Jan 1
  const yearEnd   = new Date(year, 11, 31); // Dec 31

  const cs = contractStart ? new Date(contractStart) : yearStart;
  const ce = contractEnd   ? new Date(contractEnd)   : yearEnd;

  // No overlap at all
  if (ce < yearStart || cs > yearEnd) return 0;

  // Clamp to the year window
  const overlapStart = cs > yearStart ? cs : yearStart;
  const overlapEnd   = ce < yearEnd   ? ce : yearEnd;

  if (overlapEnd <= overlapStart) return 0;

  // Count whole months in the overlap
  let months =
    (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
    (overlapEnd.getMonth()    - overlapStart.getMonth());

  if (overlapEnd.getDate() < overlapStart.getDate()) months -= 1;

  return Number(rent) * Math.max(0, months);
}