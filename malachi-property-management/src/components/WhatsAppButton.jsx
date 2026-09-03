// src/components/WhatsAppButton.jsx
// Renders nothing when WHATSAPP_NUMBER isn't configured yet — see
// src/utils/contact.js — so this is safe to drop into any page ahead of
// that number being decided.

import { WhatsappLogo } from "@phosphor-icons/react";
import { whatsappLink } from "../utils/contact";

export default function WhatsAppButton({ message, className = "btn btn-ghost", children, floating = false }) {
  const link = whatsappLink(message);
  if (!link) return null;

  if (floating) {
    return (
      <a href={link} target="_blank" rel="noreferrer" className="whatsapp-floating" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
        <WhatsappLogo size={28} weight="fill" />
      </a>
    );
  }

  return (
    <a href={link} target="_blank" rel="noreferrer" className={className}>
      <WhatsappLogo size={16} weight="fill" /> {children || "Chat on WhatsApp"}
    </a>
  );
}
