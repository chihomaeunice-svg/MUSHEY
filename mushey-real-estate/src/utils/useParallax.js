// src/utils/useParallax.js
// Tracks cursor position over an element and exposes it as --px/--py CSS
// custom properties (range roughly -strength/2..strength/2), so descendant
// elements can read them in a transform without triggering React re-renders
// on every mousemove. Disabled under prefers-reduced-motion.

import { useEffect, useRef } from "react";

export function useParallax(strength = 1) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--px", (x * strength).toFixed(3));
      el.style.setProperty("--py", (y * strength).toFixed(3));
    };
    const handleLeave = () => {
      el.style.setProperty("--px", 0);
      el.style.setProperty("--py", 0);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [strength]);

  return ref;
}
