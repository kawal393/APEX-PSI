import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const EmbedPulse = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    company_name: string;
    overall_score: number;
    status: string;
    trio_mode: string;
    updated_at: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    // Use the secure compliance_pulse view (no user_id exposed)
    supabase
      .from("compliance_pulse" as any)
      .select("company_name, overall_score, status, trio_mode, updated_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setData(data as any));
  }, [id]);

  if (!data) {
    return (
      <div style={{ fontFamily: "system-ui", background: "#0a0a0f", color: "#666", padding: 16, textAlign: "center", fontSize: 12 }}>
        Loading...
      </div>
    );
  }

  const score = data.overall_score;
  let dotColor = "#ef4444";
  if (score >= 90) dotColor = "#22c55e";
  else if (score >= 70) dotColor = "#d4a017";
  else if (score >= 50) dotColor = "#f59e0b";

  const lastVerified = new Date(data.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#0a0a0f",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <a
        href="https://digital-gallows.apex-infrastructure.com/verify"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: "none",
          display: "block",
          background: "#12121a",
          border: "1px solid #1a1a2e",
          borderRadius: 10,
          padding: "16px 20px",
          maxWidth: 300,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: dotColor,
            boxShadow: `0 0 8px ${dotColor}80`,
            animation: "pulse 2s infinite",
          }} />
          <span style={{ color: "#e8e0d0", fontSize: 14, fontWeight: 700 }}>{data.company_name || "Verified"}</span>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: dotColor, lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 9, color: "#666", letterSpacing: 1 }}>SCORE</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#d4a017", lineHeight: 1.6 }}>{data.trio_mode}</div>
            <div style={{ fontSize: 9, color: "#666", letterSpacing: 1 }}>TRIO MODE</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#555" }}>Last verified: {lastVerified}</span>
          <span style={{ fontSize: 9, color: "#d4a017", fontWeight: 700 }}>APEX ✓</span>
        </div>
      </a>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
};

export default EmbedPulse;
