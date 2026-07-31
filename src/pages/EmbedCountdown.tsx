import { useState, useEffect } from "react";

const TARGET = new Date("2026-08-02T00:00:00Z").getTime();

const EmbedCountdown = () => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, TARGET - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#0a0a0f",
      color: "#e8e0d0",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "#d4a017", letterSpacing: 4, marginBottom: 8 }}>
          EU AI ACT DEADLINE
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          {[
            { val: days, label: "DAYS" },
            { val: hours, label: "HRS" },
            { val: minutes, label: "MIN" },
            { val: seconds, label: "SEC" },
          ].map(({ val, label }) => (
            <div key={label} style={{
              background: "#12121a",
              border: "1px solid #1a1a2e",
              borderRadius: 8,
              padding: "12px 16px",
              minWidth: 60,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#d4a017", lineHeight: 1 }}>
                {String(val).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
          August 2, 2026 — Full enforcement begins
        </div>
        <a
          href="https://digital-gallows.apex-infrastructure.com/assess"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #d4a017, #b8860b)",
            color: "#0a0a0f",
            padding: "8px 20px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 800,
            textDecoration: "none",
            letterSpacing: 1,
          }}
        >
          CHECK YOUR COMPLIANCE →
        </a>
        <div style={{ marginTop: 12, fontSize: 10, color: "#444" }}>
          Powered by <span style={{ color: "#d4a017" }}>APEX PSI</span>
        </div>
      </div>
    </div>
  );
};

export default EmbedCountdown;
