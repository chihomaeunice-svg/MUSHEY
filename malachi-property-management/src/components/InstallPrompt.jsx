// src/components/InstallPrompt.jsx
// Nudges visitors to install the PWA. Android/desktop Chrome support a real
// programmatic install prompt (beforeinstallprompt); iOS has no such API for
// any browser (they're all Safari's engine under the hood) — the only path
// there is the user manually doing Share → Add to Home Screen, so we just
// show them how.

import { useEffect, useState } from "react";
import { DownloadSimple, X, ShareNetwork } from "@phosphor-icons/react";
import "../styles/installPrompt.css";

const DISMISSED_KEY = "malachi-install-dismissed";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !isIOS()) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
    } else if (isIOS()) {
      setShowIOSHint(true);
    }
  };

  return (
    <div className="install-banner">
      {showIOSHint ? (
        <div className="install-banner-row">
          <span className="install-banner-text">
            Tap <ShareNetwork size={14} weight="bold" style={{ verticalAlign: "-2px" }} /> Share, then "Add to Home Screen".
          </span>
          <button className="install-banner-close" onClick={dismiss} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ) : (
        <div className="install-banner-row">
          <span className="install-banner-text">Install Malachi on your device for quick, offline-ready access.</span>
          <button className="install-banner-btn" onClick={handleInstall}>
            <DownloadSimple size={14} weight="bold" /> Install
          </button>
          <button className="install-banner-close" onClick={dismiss} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
