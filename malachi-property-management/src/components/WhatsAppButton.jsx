// src/components/WhatsAppButton.jsx
// Renders nothing when WHATSAPP_NUMBER isn't configured yet — see
// src/utils/contact.js — so this is safe to drop into any page ahead of
// that number being decided.

import { WhatsappLogo } from "@phosphor-icons/react";
import { whatsappLink } from "../utils/contact";

export default function WhatsAppButton({ message, className = "btn btn-ghost", children }) {
  const link = whatsappLink(message);
  if (!link) return null;

  return (
    <a href={link} target="_blank" rel="noreferrer" className={className}>
      <WhatsappLogo size={16} weight="fill" /> {children || "Chat on WhatsApp"}
    </a>
  );
}
