import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Shield, ShieldCheck, Hash, Key, Clock, CheckCircle, AlertTriangle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ComplianceData {
  company_name: string;
  status: string;
  overall_score: number;
  trio_mode: string;
  updated_at: string;
  id: string;
}

interface VerificationEntry {
  article_number: string;
  article_title: string;
  status: string;
  merkle_proof_hash: string | null;
  verified_at: string | null;
}

const SubmissionKit = () => {
  const { user } = useAuth();
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [verifications, setVerifications] = useState<VerificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const [compRes, verRes] = await Promise.all([
        supabase.from("compliance_results").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("verification_history").select("*").eq("user_id", user.id).order("article_number"),
      ]);
      if (compRes.data) setCompliance(compRes.data);
      if (verRes.data) setVerifications(verRes.data);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const generateSubmissionJSON = () => {
    if (!compliance) return;
    const kit = {
      schema: "APEX-PSI-SUBMISSION-v1.0",
      generated_at: new Date().toISOString(),
      regulatory_target: "EU AI Act (Regulation 2024/1689)",
      submission_body: "CEN-CENELEC / EU AI Office",
      entity: {
        name: compliance.company_name,
        verification_id: compliance.id,
        compliance_status: compliance.status,
        overall_score: compliance.overall_score,
        verification_mode: compliance.trio_mode,
        last_verified: compliance.updated_at,
      },
      article_compliance: verifications.map((v) => ({
        article: v.article_number,
        title: v.article_title,
        status: v.status,
        merkle_proof_hash: v.merkle_proof_hash,
        verified_at: v.verified_at,
        technical_mapping: getArticleMapping(v.article_number),
      })),
      cryptographic_assurance: {
        hash_algorithm: "SHA-256",
        signature_scheme: "Ed25519",
        proof_structure: "Merkle Inclusion Proof",
        canonicalization: "RFC 8785 (JCS)",
        sequencing: "Monotonic Counter (psi_sequence_counter)",
      },
      verification_portal: "https://ai-governance-standard.com/verify",
      public_api: "https://ai-governance-standard.com/api/verify-status",
      protocol_source: "https://github.com/kawal393/APEX-PSI",
      disclaimer: "This document is cryptographically verifiable. All Merkle proof hashes can be independently validated using the APEX PSI Verification Portal without transmitting any data to Apex servers.",
    };

    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `APEX-PSI-Submission-${compliance.company_name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Submission kit downloaded");
  };

  const getArticleMapping = (article: string): string => {
    const map: Record<string, string> = {
      "Article 12": "Immutable event stream. RFC 8785 Canonicalization. Monotonic sequencing with tamper detection.",
      "Article 13": "Transparency declarations. AI content labeling. User notification protocols.",
      "Article 14": "Protocol Intervention Layer (PIL) — 5s sovereign pause. Human oversight enforcement via GALLOWS mechanism.",
      "Article 15": "Groth16-compatible ZK Integrity Proofs. Ed25519 non-repudiation signatures. Merkle inclusion verification.",
    };
    return map[article] || "Standard compliance verification applied.";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-16 sm:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <Badge variant="outline" className="border-primary/30 text-primary mb-4">
                REGULATORY SUBMISSION
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="text-chrome-gradient">CEN-CENELEC</span>{" "}
                <span className="text-gold-gradient">Submission Kit</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Auto-generate a regulatory-ready compliance package containing your cryptographic proofs,
                EU AI Act article mappings, and Merkle root attestations — ready for submission to the EU AI Office.
              </p>
            </motion.div>

            {!user ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card/60 p-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Authentication Required</h3>
                <p className="text-sm text-muted-foreground mb-6">Sign in to generate your regulatory submission package.</p>
                <Button variant="hero" asChild>
                  <a href="/auth">Sign In</a>
                </Button>
              </motion.div>
            ) : loading ? (
              <div className="text-center text-muted-foreground py-12">Loading compliance data...</div>
            ) : !compliance ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card/60 p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">No Compliance Data</h3>
                <p className="text-sm text-muted-foreground mb-6">Complete the compliance questionnaire first to generate your submission kit.</p>
                <Button variant="hero" asChild>
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card/60 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold">{compliance.company_name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">ID: {compliance.id.slice(0, 16)}...</p>
                    </div>
                    <Badge variant="outline" className={compliance.status === "compliant" ? "border-compliant/30 text-compliant" : "border-warning/30 text-warning"}>
                      {compliance.status.toUpperCase().replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
                      <p className={`text-xl font-black ${compliance.overall_score >= 90 ? "text-compliant" : compliance.overall_score >= 70 ? "text-warning" : "text-destructive"}`}>
                        {compliance.overall_score}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Overall Score</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
                      <p className="text-xl font-black text-primary">{compliance.trio_mode}</p>
                      <p className="text-[10px] text-muted-foreground">Verification Mode</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
                      <p className="text-xl font-black text-foreground">{verifications.filter((v) => v.status === "verified").length}/{verifications.length}</p>
                      <p className="text-[10px] text-muted-foreground">Articles Verified</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
                      <p className="text-xl font-black text-foreground">{verifications.filter((v) => v.merkle_proof_hash).length}</p>
                      <p className="text-[10px] text-muted-foreground">Merkle Proofs</p>
                    </div>
                  </div>

                  {/* Article Breakdown */}
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Article-by-Article Mapping
                  </h4>
                  <div className="space-y-2">
                    {verifications.map((v) => (
                      <div key={v.article_number} className="rounded-lg border border-border bg-background/40 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {v.status === "verified" ? (
                              <CheckCircle className="h-4 w-4 text-compliant" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-bold">{v.article_number}</span>
                            <span className="text-xs text-muted-foreground">— {v.article_title}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${v.status === "verified" ? "border-compliant/30 text-compliant" : "border-border text-muted-foreground"}`}>
                            {v.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{getArticleMapping(v.article_number)}</p>
                        {v.merkle_proof_hash && (
                          <p className="text-[10px] font-mono text-primary/70 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {v.merkle_proof_hash}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Package Contents */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Submission Package Contents
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {[
                      { icon: ShieldCheck, label: "Entity Compliance Status", desc: "Overall score, mode, and verification timestamp" },
                      { icon: Layers, label: "Article-by-Article Proofs", desc: "Individual Merkle hashes for Articles 12-15" },
                      { icon: Hash, label: "Cryptographic Specifications", desc: "SHA-256, Ed25519, RFC 8785 JCS details" },
                      { icon: Key, label: "Verification Portal Link", desc: "Independent local verification URL" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
                        <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="hero" className="w-full" onClick={generateSubmissionJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Regulatory Submission Kit (JSON)
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-3">
                    Format: APEX-PSI-SUBMISSION-v1.0 — Compatible with CEN-CENELEC harmonized standards framework
                  </p>
                </motion.div>

                {/* Disclaimer */}
                <div className="rounded-lg border border-border bg-card/40 p-4">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Non-Repudiation Notice:</strong> All Merkle proof hashes contained in this submission package
                    are cryptographically verifiable using the APEX PSI Verification Portal (local-only, zero data transmission).
                    The cryptographic chain of custody — from RFC 8785 canonicalization through SHA-256 commitment to Ed25519 signing —
                    ensures mathematical non-repudiation per EU AI Act Articles 12 and 15.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default SubmissionKit;
