import './i18n';
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Founding Member referral capture: first-touch, kept 90 days.
try {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref && /^[a-z0-9]{6,16}$/i.test(ref) && !localStorage.getItem("apex_ref")) {
    localStorage.setItem("apex_ref", JSON.stringify({ code: ref.toLowerCase(), at: Date.now() }));
  }
} catch { /* storage unavailable */ }
