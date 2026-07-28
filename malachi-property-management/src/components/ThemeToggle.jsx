// src/components/ThemeToggle.jsx
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { currentEffectiveTheme, setTheme } from "../theme";
import "../styles/themeToggle.css";

export default function ThemeToggle({ className = "" }) {
  const [theme, setThemeState] = useState(currentEffectiveTheme());

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => setThemeState(currentEffectiveTheme());
    mql?.addEventListener("change", onChange);
    return () => mql?.removeEventListener("change", onChange);
  }, []);

  const choose = (next) => {
    setTheme(next);
    setThemeState(next);
  };

  return (
    <div className={`theme-toggle ${className}`} role="group" aria-label="Theme">
      <button
        type="button"
        className={theme === "light" ? "active" : ""}
        onClick={() => choose("light")}
        aria-pressed={theme === "light"}
      >
        <Sun size={13} weight="fill" /> Light
      </button>
      <button
        type="button"
        className={theme === "dark" ? "active" : ""}
        onClick={() => choose("dark")}
        aria-pressed={theme === "dark"}
      >
        <Moon size={13} weight="fill" /> Dark
      </button>
    </div>
  );
}
