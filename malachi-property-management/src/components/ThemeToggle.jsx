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
        aria-label="Light theme"
      >
        <Sun size={13} weight="fill" /> <span className="theme-toggle-label">Light</span>
      </button>
      <button
        type="button"
        className={theme === "dark" ? "active" : ""}
        onClick={() => choose("dark")}
        aria-pressed={theme === "dark"}
        aria-label="Dark theme"
      >
        <Moon size={13} weight="fill" /> <span className="theme-toggle-label">Dark</span>
      </button>
    </div>
  );
}
