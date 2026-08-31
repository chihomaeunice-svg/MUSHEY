// src/utils/contact.js
// Malachi's business WhatsApp number for support/billing inquiries — set
// this once a real number is decided (DEC-6). Left blank until then, rather
// than shipping a link that goes nowhere or to a placeholder number.
//
// Format: E.164 digits only, no "+", e.g. "255712345678" for a Tanzanian
// number starting 0712... (drop the leading 0, prefix with 255).
export const WHATSAPP_NUMBER = "";

/**
 * Builds a wa.me link with an optional prefilled message.
 * Returns null when no number is configured, so callers can hide the button
 * entirely instead of rendering a dead link.
 */
export function whatsappLink(prefilledMessage = "") {
  if (!WHATSAPP_NUMBER) return null;
  const text = prefilledMessage ? `?text=${encodeURIComponent(prefilledMessage)}` : "";
  return `https://wa.me/${WHATSAPP_NUMBER}${text}`;
}
