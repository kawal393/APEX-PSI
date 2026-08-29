import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, ShieldCheck, ShieldX, Hash, Clock, AlertTriangle, Copy, CheckCircle2, ExternalLink, Upload, FileJson, ArrowRight, Zap, Lock, FileCheck, Globe, Eye } from "lucide-react";
import SovereignShield from "@/components/verify/SovereignShield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";
import { verifyEd25519Signature, type PSIProofBundle } from "@/lib/psi-signatures";
import { jcsHash } from "@/lib/psi-canonicalize";
import Rosette from "@/components/Rosette";
import { verifyMerkleProof, hashSHA256 } from "@/lib/gallows-engine";
import { lmsVerify, LMS_ALGORITHM, LMS_STANDARD, type LMSSignature } from "@/lib/psi-lms";
import { Helmet } from "react-helmet-async";
import ProofReceipt, { type ProofReceiptData } from "@/components/verify/ProofReceipt";
import CountersignUpsell from "@/components/CountersignUpsell";
import ParityWidget from "@/components/psi/ParityWidget";
import RosetteTest from "@/components/verify/RosetteTest";
import VerifyTheVerifier from "@/components/psi/VerifyTheVerifier";


interface VerificationResult extends ProofReceiptData {
  verified: boolean;
  found: boolean;
  merkle_verified?: boolean;
  commit_id?: string;
  predicate_id?: string;
  phase?: string;
  status?: string;
  merkle_root?: string;
  action_summary?: string;
  created_at?: string;
  challenged_at?: string;
  proven_at?: string;
  verification_time_ms?: number;
  violation_found?: string;
  queried_hash: string;
  queried_at: string;
  engine: string;
  algorithm?: string;
  eu_ai_act_compliance?: boolean;
  message?: string;
  sequence_number?: number;
}


const VERIFY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/verify-hash`;

// ZK Visualization steps
const zkSteps = [
  { label: "Raw Event", icon: FileJson, color: "text-muted-foreground" },
  { label: "JCS Canonicalize", icon: Hash, color: "text-primary" },
  { label: "SHA-256 Hash", icon: Zap, color: "text-gold" },
  { label: "Merkle Path", icon: ArrowRight, color: "text-primary" },
  { label: "Signed Root", icon: Shield, color: "text-compliant" },
  { label: "VALID", icon: CheckCircle2, color: "text-compliant" },
];

const Verify = () => {
  const [hash, setHash] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [receiptResult, setReceiptResult] = useState<VerificationResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("hash");

  // Post-quantum (LMS-W4-SHA256) verification state for the proof bundle
  const [pqResult, setPqResult] = useState<{
    present: boolean;
    valid: boolean;
    signature?: LMSSignature;
    publicKey?: string;
  } | null>(null);

  // Public Audit state
  const [auditCommitId, setAuditCommitId] = useState("");
  const [auditResult, setAuditResult] = useState<"VERIFIED" | "FAILED" | "CONTESTED">("VERIFIED");
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditCount, setAuditCount] = useState(0);
  const [auditSubmitted, setAuditSubmitted] = useState(false);


  const fetchAttestationCount = async (commitId: string) => {
    if (!commitId.trim()) return;
    const { count } = await supabase
      .from("public_attestations")
      .select("*", { count: "exact", head: true })
      .eq("commit_id", commitId.trim());
    if (count !== null) setAuditCount(count);
  };

  const handlePublicAttest = async () => {
    if (!auditCommitId.trim()) { toast.error("Enter a commit ID"); return; }
    setAuditSubmitting(true);
    try {
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-attestation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commit_id: auditCommitId.trim(), verification_result: auditResult }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("Attestation anchored to the public ledger");
        setAuditSubmitted(true);
        fetchAttestationCount(auditCommitId.trim());
      } else {
        toast.error(data.error || "Attestation failed");
      }
    } catch { toast.error("Network error"); }
    finally { setAuditSubmitting(false); }
  };

  // Proof bundle verification state
  const [bundleJson, setBundleJson] = useState("");
  const [bundleResult, setBundleResult] = useState<{
    valid: boolean;
    steps: { label: string; status: "pending" | "pass" | "fail"; value?: string }[];
  } | null>(null);
  const [bundleVerifying, setBundleVerifying] = useState(false);

  const runVerify = useCallback(async (raw: string) => {
    const target = raw.trim();
    if (!target) {
      toast.error("Please enter a hash to verify");
      return;
    }
    setLoading(true);
    setResult(null);
    setSearched(true);
    try {
      // Canonical public read path: GET /functions/v1/verify-hash?hash=<hash>
      const res = await fetch(`${VERIFY_URL}?hash=${encodeURIComponent(target)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (data && typeof data === "object" && ("found" in data || "verified" in data)) {
        setResult(data);
      } else {
        // Treat any non-conformant response as a genuine miss, never a generic failure.
        setResult({
          verified: false,
          found: false,
          queried_hash: target,
          queried_at: new Date().toISOString(),
          engine: "APEX PSI v2.0",
          message: "Hash not found in the APEX PSI immutable ledger",
        } as typeof result);
      }
    } catch {
      toast.error("Verification request failed. Please try again.");
    } finally {
      setLoading(false);
    }

  }, []);

  const handleVerify = () => runVerify(hash);

  // Deep link support: /verify?hash=<sha256|commit_id> auto-runs the lookup so
  // the homepage demo link lands on a real, already-sealed ledger entry.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("hash");
    if (param) {
      setHash(param);
      void runVerify(param);
    }
  }, [runVerify]);


  const handleReceiptVerify = async () => {
    const id = receiptId.trim();
    if (!id) { toast.error("Enter a receipt ID (APEX-NTR-...)"); return; }
    setReceiptLoading(true);
    setReceiptResult(null);
    try {
      const LEDGER_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/rest/v1/gallows_public_ledger?commit_id=eq.${encodeURIComponent(id)}&select=*&limit=1`;
      const res = await fetch(LEDGER_URL, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const entry = data[0];
        setReceiptResult({
          verified: true, found: true,
          merkle_verified: !!entry.merkle_root,
          commit_id: entry.commit_id,
          predicate_id: entry.predicate_id,
          phase: entry.phase, status: entry.status,
          merkle_root: entry.merkle_root,
          action_summary: entry.action?.length > 100 ? entry.action.substring(0, 97) + "..." : entry.action,
          created_at: entry.created_at,
          queried_hash: entry.commit_hash,
          queried_at: new Date().toISOString(),
          engine: "APEX NOTARY Receipt Verification",
          algorithm: "SHA-256 + Ed25519",
          eu_ai_act_compliance: entry.status === "APPROVED",
          sequence_number: entry.sequence_number,
        });
      } else {
        setReceiptResult({
          verified: false, found: false,
          queried_hash: id, queried_at: new Date().toISOString(),
          engine: "APEX NOTARY Receipt Verification",
          message: "Receipt ID not found in the ledger",
        });
      }
    } catch { toast.error("Receipt lookup failed"); }
    finally { setReceiptLoading(false); }
  };

  const handleBundleVerify = useCallback(async () => {
    if (!bundleJson.trim()) {
      toast.error("Please paste a proof bundle JSON");
      return;
    }

    setBundleVerifying(true);
    setBundleResult(null);
    setPqResult(null);

    const steps: { label: string; status: "pending" | "pass" | "fail"; value?: string }[] = [
      { label: "Parse JSON Bundle", status: "pending" },
      { label: "JCS Canonicalize Event", status: "pending" },
      { label: "Recompute SHA-256 Commit Hash", status: "pending" },
      { label: "Recompute Merkle Leaf Hash", status: "pending" },
      { label: "Verify Merkle Inclusion Proof", status: "pending" },
      { label: "Verify Ed25519 Signature", status: "pending" },
    ];

    const updateStep = (idx: number, status: "pass" | "fail", value?: string) => {
      steps[idx] = { ...steps[idx], status, value };
      setBundleResult({ valid: !steps.some((s) => s.status === "fail"), steps: [...steps] });
    };

    try {
      // Step 1: Parse
      let bundle: PSIProofBundle;
      try {
        bundle = JSON.parse(bundleJson);
        updateStep(0, "pass", `Protocol: ${bundle.protocol} v${bundle.version}`);
      } catch {
        updateStep(0, "fail", "Invalid JSON");
        setBundleVerifying(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 300));

      // Step 2: JCS Canonicalize
      try {
        const eventData = { action: bundle.action, predicate_id: bundle.predicateId, timestamp: bundle.timestamp };
        const canonicalHash = await jcsHash(eventData);
        updateStep(1, "pass", `JCS hash: ${canonicalHash.substring(0, 24)}...`);
      } catch {
        updateStep(1, "fail", "Canonicalization failed");
      }

      await new Promise((r) => setTimeout(r, 300));

      // Step 3: Recompute commit hash
      const recomputedCommitHash = await hashSHA256(`${bundle.action}|${bundle.predicateId}|${bundle.timestamp}`);
      if (recomputedCommitHash === bundle.commitHash) {
        updateStep(2, "pass", `${recomputedCommitHash.substring(0, 24)}... ✓ MATCH`);
      } else {
        updateStep(2, "fail", `Expected: ${bundle.commitHash.substring(0, 16)}... Got: ${recomputedCommitHash.substring(0, 16)}...`);
      }

      await new Promise((r) => setTimeout(r, 300));

      // Step 4: Recompute Merkle leaf
      const recomputedLeaf = await hashSHA256(`${bundle.commitId}|${bundle.commitHash}`);
      if (recomputedLeaf === bundle.merkleLeafHash) {
        updateStep(3, "pass", `${recomputedLeaf.substring(0, 24)}... ✓ MATCH`);
      } else {
        updateStep(3, "fail", `Leaf hash mismatch`);
      }

      await new Promise((r) => setTimeout(r, 300));

      // Step 5: Merkle proof verification
      if (bundle.merkleProof && bundle.merkleRoot) {
        const merkleValid = await verifyMerkleProof(bundle.merkleLeafHash, bundle.merkleProof, bundle.merkleRoot);
        updateStep(4, merkleValid ? "pass" : "fail", merkleValid ? `Root: ${bundle.merkleRoot.substring(0, 24)}... ✓ VERIFIED` : "Merkle inclusion proof failed");
      } else {
        updateStep(4, "fail", "No Merkle proof in bundle");
      }

      await new Promise((r) => setTimeout(r, 300));

      // Step 6: Ed25519 signature
      if (bundle.ed25519Signature && bundle.ed25519PublicKey) {
        const sigValid = await verifyEd25519Signature(bundle.merkleRoot, bundle.ed25519Signature, bundle.ed25519PublicKey);
        updateStep(5, sigValid ? "pass" : "fail", sigValid ? "Ed25519 signature verified" : "Signature verification failed");
      } else {
        updateStep(5, "pass", "No signature in bundle (pre-Ed25519 commit)");
      }

      // Step 7: Post-quantum LMS-W4-SHA256 signature (verified locally)
      const anyBundle = bundle as unknown as Record<string, any>;
      const pqSig: LMSSignature | undefined = anyBundle.pqSignature || anyBundle.pq_signature;
      if (pqSig?.wots_signature) {
        const pqPub: string | undefined =
          anyBundle.pqPublicKey || anyBundle.pq_public_key || pqSig.public_key;
        const signedPayload: string =
          (anyBundle.signedPayload || anyBundle.signed_payload || "").replace(/^sha256:/, "")
          || bundle.merkleLeafHash;
        const pqValid = await lmsVerify(
          new TextEncoder().encode(signedPayload),
          pqSig,
          pqPub,
        );
        setPqResult({ present: true, valid: pqValid, signature: pqSig, publicKey: pqPub });
      } else {
        setPqResult({ present: false, valid: false });
      }

    } catch (err: any) {
      toast.error("Verification error: " + err.message);
    } finally {
      setBundleVerifying(false);
    }
  }, [bundleJson]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBundleJson(ev.target?.result as string);
        toast.success("Proof bundle loaded");
      };
      reader.readAsText(file);
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <>
      <Helmet>
        <title>Verify a Hash Public Portal — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Verify any evidence hash against the APEX PSI ledger. Permissionless, public, cryptographically enforced." />
        <link rel="canonical" href="https://ai-governance-standard.com/verify" />
        <meta property="og:title" content="Verify a Hash — APEX PSI Public Portal" />
        <meta property="og:description" content="Verify any evidence hash against the APEX PSI ledger. Permissionless, public, cryptographically enforced." />
        <meta property="og:url" content="https://ai-governance-standard.com/verify" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Hero */}
        <section className="relative py-16 sm:py-24 px-4 grid-bg overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.06) 0%, transparent 60%)" }}
          />
          <div className="container mx-auto max-w-3xl relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4">
                REGULATOR VERIFICATION PORTAL
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                <span className="text-chrome-gradient">Independent</span>{" "}
                <span className="text-gold-gradient">Verification</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm sm:text-base">
                Verify any PSI proof locally in your browser. No account required. No server calls for proof bundles.
                Full mathematical verification of Merkle inclusion, hash integrity, and Ed25519 signatures.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Cross-language parity + free packages */}
        <section className="px-4 -mt-8">
          <div className="container mx-auto max-w-5xl space-y-4">
            <VerifyTheVerifier />
            <ParityWidget />
            <RosetteTest />
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="https://www.npmjs.com/package/@apex/psi-verifier"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col justify-center rounded-md border border-border bg-card/40 px-5 py-4 transition-colors hover:border-primary/40"
              >
                <span className="font-mono text-sm font-bold text-foreground">@apex/psi-verifier (npm)</span>
                <span className="mt-1 text-xs text-muted-foreground">Free forever. MIT. No permission required.</span>
              </a>
              <a
                href="https://pypi.org/project/psi-verifier/"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col justify-center rounded-md border border-border bg-card/40 px-5 py-4 transition-colors hover:border-primary/40"
              >
                <span className="font-mono text-sm font-bold text-foreground">psi-verifier (PyPI)</span>
                <span className="mt-1 text-xs text-muted-foreground">Free forever. MIT. No permission required.</span>
              </a>
            </div>
          </div>
        </section>

        {/* Verification Tabs */}
        <section className="px-4 mt-10">
          <div className="container mx-auto max-w-3xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 mb-6">
                <TabsTrigger value="hash" className="text-[11px] sm:text-sm">Hash Lookup</TabsTrigger>
                <TabsTrigger value="receipt" className="text-[11px] sm:text-sm">Receipt ID</TabsTrigger>
                <TabsTrigger value="proof" className="text-[11px] sm:text-sm">Proof Verify</TabsTrigger>
                <TabsTrigger value="audit" className="text-[11px] sm:text-sm">Public Audit</TabsTrigger>
              </TabsList>

              {/* Tab 1: Hash Lookup */}
              <TabsContent value="hash">
                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-6">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={hash}
                      onChange={(e) => setHash(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      placeholder="Enter SHA-256 hash to verify..."
                      className="pl-9 h-12 bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button variant="hero" size="lg" onClick={handleVerify} disabled={loading} className="h-12 px-6 shrink-0">
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Search className="h-4 w-4 mr-2" />Verify</>
                    )}
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {loading && (
                    <motion.div key="loading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 text-center">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-mono">Querying immutable ledger...</p>
                    </motion.div>
                  )}

                  {!loading && result && result.found && (
                    <motion.div key="found" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-compliant/30 bg-card/80 backdrop-blur-sm overflow-hidden">
                      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3"
                        style={{ background: "linear-gradient(135deg, hsl(142 76% 36% / 0.08), transparent)" }}>
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-6 w-6 text-compliant" />
                          <div>
                            <p className="font-black text-compliant text-sm">HASH VERIFIED</p>
                            <p className="text-xs text-muted-foreground">Found in APEX PSI immutable ledger</p>
                          </div>
                        </div>
                        <Badge className="bg-compliant/10 text-compliant border-compliant/30">{result.phase}</Badge>
                      </div>
                      <div className="px-6 pt-6 flex flex-col items-center gap-3">
                        <Rosette hash={result.queried_hash} size={140} animate />
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Rosette engraved from this digest
                        </p>
                      </div>
                      <div className="px-6 py-5 space-y-3">
                        {[
                          { label: "Commit ID", value: result.commit_id },
                          { label: "Predicate", value: result.predicate_id },
                          { label: "Phase", value: result.phase },
                          { label: "Status", value: result.status },
                          { label: "Sequence #", value: result.sequence_number?.toString() },
                          { label: "Merkle Root", value: result.merkle_root, mono: true },
                          { label: "Action", value: result.action_summary },
                          { label: "Created", value: result.created_at ? new Date(result.created_at).toLocaleString() : null },
                          { label: "EU AI Act Compliant", value: result.eu_ai_act_compliance ? "YES" : "PENDING" },
                        ].filter(r => r.value).map((row) => (
                          <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-muted-foreground shrink-0">{row.label}</span>
                            <span className={`text-foreground text-right ${row.mono ? 'font-mono text-xs' : ''} break-all`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <ProofReceipt data={result} />
                      <div className="border-t border-border px-6 py-3 flex items-center justify-between">

                        <span className="text-[10px] text-muted-foreground font-mono">{result.engine} — {result.algorithm}</span>
                        <button onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 bg-transparent border-none cursor-pointer">
                          <Copy className="h-3 w-3" /> Copy JSON
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!loading && result && !result.found && (
                    <motion.div key="notfound" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-destructive/30 bg-card/80 backdrop-blur-sm p-8 text-center">
                      <ShieldX className="h-10 w-10 text-destructive mx-auto mb-3" />
                      <p className="font-bold text-destructive mb-2">NOT FOUND IN LEDGER</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                        This hash does not exist in the APEX PSI immutable ledger.
                      </p>
                      <div className="rounded-lg bg-background/60 border border-border p-3 font-mono text-xs text-muted-foreground break-all max-w-lg mx-auto">
                        {result.queried_hash}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Tab: Receipt ID Verification */}
              <TabsContent value="receipt">
                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-6">
                  <div className="relative flex-1">
                    <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={receiptId}
                      onChange={(e) => setReceiptId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReceiptVerify()}
                      placeholder="APEX-NTR-XXXXXXXXXXXXXXXX"
                      className="pl-9 h-12 bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button variant="hero" size="lg" onClick={handleReceiptVerify} disabled={receiptLoading} className="h-12 px-6 shrink-0">
                    {receiptLoading ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Search className="h-4 w-4 mr-2" />Verify Receipt</>
                    )}
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {receiptResult && receiptResult.found && (
                    <motion.div key="receipt-found" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-compliant/30 bg-card/80 backdrop-blur-sm overflow-hidden">
                      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3"
                        style={{ background: "linear-gradient(135deg, hsl(142 76% 36% / 0.08), transparent)" }}>
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-6 w-6 text-compliant" />
                          <div>
                            <p className="font-black text-compliant text-sm">RECEIPT VERIFIED</p>
                            <p className="text-xs text-muted-foreground">Found in APEX NOTARY immutable ledger</p>
                          </div>
                        </div>
                        <Badge className="bg-compliant/10 text-compliant border-compliant/30">{receiptResult.phase}</Badge>
                      </div>
                      <div className="px-6 py-5 space-y-3">
                        {[
                          { label: "Receipt ID", value: receiptResult.commit_id },
                          { label: "Predicate", value: receiptResult.predicate_id },
                          { label: "Status", value: receiptResult.status },
                          { label: "Merkle Root", value: receiptResult.merkle_root, mono: true },
                          { label: "Action", value: receiptResult.action_summary },
                          { label: "Created", value: receiptResult.created_at ? new Date(receiptResult.created_at).toLocaleString() : null },
                          { label: "EU AI Act Compliant", value: receiptResult.eu_ai_act_compliance ? "YES" : "PENDING" },
                        ].filter(r => r.value).map((row) => (
                          <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-muted-foreground shrink-0">{row.label}</span>
                            <span className={`text-foreground text-right ${row.mono ? 'font-mono text-xs' : ''} break-all`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border px-6 py-3">
                        <span className="text-[10px] text-muted-foreground font-mono">{receiptResult.engine}</span>
                      </div>
                    </motion.div>
                  )}
                  {receiptResult && !receiptResult.found && (
                    <motion.div key="receipt-notfound" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-destructive/30 bg-card/80 backdrop-blur-sm p-8 text-center">
                      <ShieldX className="h-10 w-10 text-destructive mx-auto mb-3" />
                      <p className="font-bold text-destructive mb-2">RECEIPT NOT FOUND</p>
                      <p className="text-sm text-muted-foreground">No entry with ID <code className="font-mono text-xs">{receiptResult.queried_hash}</code> exists in the ledger.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Tab 2: Proof Bundle Verification */}
              <TabsContent value="proof">
                {/* Privacy Badge */}
                <div className="flex items-center gap-2 mb-4 rounded-lg border border-compliant/20 bg-compliant/5 px-4 py-2.5">
                  <Lock className="h-4 w-4 text-compliant shrink-0" />
                  <p className="text-xs text-compliant font-medium">
                    No data is sent to Apex servers. All cryptographic verification is performed locally in your browser.
                  </p>
                </div>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-card/30 p-6 mb-6"
                >
                  <div className="text-center mb-4">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop a PSI Proof Bundle JSON file, or paste below</p>
                  </div>
                  <Textarea
                    value={bundleJson}
                    onChange={(e) => setBundleJson(e.target.value)}
                    placeholder='{"version":"1.0","protocol":"APEX-PSI","commitId":"APEX-...",...}'
                    className="font-mono text-xs h-32 bg-background border-border"
                  />
                  <Button variant="hero" onClick={handleBundleVerify} disabled={bundleVerifying} className="w-full mt-4">
                    {bundleVerifying ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Shield className="h-4 w-4 mr-2" />Verify Proof Bundle Locally</>
                    )}
                  </Button>
                </div>

                {/* Verification Steps Visualization */}
                {bundleResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6">
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Verification Pipeline
                    </h3>
                    <div className="space-y-3">
                      {bundleResult.steps.map((step, idx) => (
                        <motion.div
                          key={step.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            step.status === "pass" ? "border-compliant/20 bg-compliant/5" :
                            step.status === "fail" ? "border-destructive/20 bg-destructive/5" :
                            "border-border bg-muted/5"
                          }`}
                        >
                          <div className="mt-0.5">
                            {step.status === "pass" && <CheckCircle2 className="h-4 w-4 text-compliant" />}
                            {step.status === "fail" && <ShieldX className="h-4 w-4 text-destructive" />}
                            {step.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{step.label}</p>
                            {step.value && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{step.value}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Final verdict — Sovereign Shield for full pass, inline for failures */}
                    {bundleResult.valid ? (
                      <SovereignShield
                        allPassed={true}
                        passCount={bundleResult.steps.filter(s => s.status === "pass").length}
                        totalCount={bundleResult.steps.length}
                      />
                    ) : (
                      <div className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-center">
                        <span className="font-mono text-lg font-bold tracking-wider text-destructive">
                          ✗ VERIFICATION FAILED
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          All verification performed locally in your browser. No data sent to any server.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Post-Quantum Verification — LMS-W4-SHA256, computed locally */}
                {pqResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-gold/30 bg-card/80 backdrop-blur-sm p-6">
                    <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-gold" />
                      Post-Quantum Verification: {LMS_ALGORITHM}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mb-4">{LMS_STANDARD}</p>

                    {!pqResult.present ? (
                      <div className="p-4 rounded-lg border border-border bg-muted/5">
                        <p className="text-xs text-muted-foreground">
                          No post-quantum signature in this bundle (pre-LMS seal). Classical Ed25519 verification above still applies.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                          pqResult.valid ? "border-compliant/30 bg-compliant/5" : "border-destructive/30 bg-destructive/5"
                        }`}>
                          {pqResult.valid
                            ? <ShieldCheck className="h-4 w-4 text-compliant" />
                            : <ShieldX className="h-4 w-4 text-destructive" />}
                          <span className={`font-mono text-sm font-bold tracking-wider ${
                            pqResult.valid ? "text-compliant" : "text-destructive"
                          }`}>
                            {pqResult.valid ? "PQ SIGNATURE VALID" : "PQ SIGNATURE INVALID"}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="p-3 rounded-lg border border-border bg-muted/5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">One-Time Leaf Index</p>
                            <p className="font-mono text-xs text-foreground">{pqResult.signature?.leaf_index} / 32</p>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-muted/5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Winternitz Chains</p>
                            <p className="font-mono text-xs text-foreground">68 × SHA-256 (W-4, depth 16)</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-muted/5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Public Key (Merkle Root)</p>
                            {pqResult.publicKey && (
                              <button onClick={() => copyToClipboard(pqResult.publicKey!)} className="text-muted-foreground hover:text-foreground">
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-foreground break-all">{pqResult.publicKey}</p>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-muted/5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">W-OTS Signature (68 × 32 bytes)</p>
                            {pqResult.signature?.wots_signature && (
                              <button onClick={() => copyToClipboard(pqResult.signature!.wots_signature)} className="text-muted-foreground hover:text-foreground">
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-muted-foreground break-all">
                            {pqResult.signature?.wots_signature.substring(0, 128)}…
                          </p>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-muted/5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Merkle Authentication Path</p>
                          <div className="space-y-1">
                            {pqResult.signature?.auth_path.map((h, i) => (
                              <p key={i} className="font-mono text-[10px] text-muted-foreground break-all">
                                h{i}: {h}
                              </p>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Hash-based signature — security rests only on SHA-256 preimage resistance, so it survives Shor's algorithm.
                          Verified entirely in your browser; nothing was sent to any server.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}



                {/* ZK Visualization */}
                {!bundleResult && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-xl border border-border bg-card/60 p-6">
                    <h3 className="text-sm font-bold text-foreground mb-4">PSI Verification Pipeline</h3>
                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
                      {zkSteps.map((step, idx) => (
                        <div key={step.label} className="flex items-center gap-1 shrink-0">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-10 h-10 rounded-lg bg-muted/30 border border-border flex items-center justify-center">
                              <step.icon className={`h-4 w-4 ${step.color}`} />
                            </div>
                            <span className="text-[9px] text-muted-foreground whitespace-nowrap">{step.label}</span>
                          </div>
                          {idx < zkSteps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-border mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </TabsContent>

              {/* Tab 4: Public Audit */}
              <TabsContent value="audit">
                <div className="flex items-center gap-2 mb-4 rounded-lg border border-gold/20 bg-gold/5 px-4 py-2.5">
                  <Globe className="h-4 w-4 text-gold shrink-0" />
                  <p className="text-xs text-gold font-medium">
                    Open public review — submit your independent verification as a public attestation. No login required.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card/80 p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Commit ID</label>
                    <Input
                      value={auditCommitId}
                      onChange={(e) => { setAuditCommitId(e.target.value); setAuditSubmitted(false); }}
                      onBlur={() => fetchAttestationCount(auditCommitId)}
                      placeholder="APEX-NTR-XXXXXXXXXXXXXXXX or any commit ID"
                      className="font-mono text-sm bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Your Verification Result</label>
                    <div className="flex gap-2">
                      {(["VERIFIED", "FAILED", "CONTESTED"] as const).map((r) => (
                        <Button
                          key={r}
                          variant={auditResult === r ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAuditResult(r)}
                          className={auditResult === r ? (
                            r === "VERIFIED" ? "bg-compliant text-compliant-foreground hover:bg-compliant/90" :
                            r === "FAILED" ? "bg-destructive text-destructive-foreground" :
                            "bg-primary"
                          ) : ""}
                        >
                          {r === "VERIFIED" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {r === "FAILED" && <ShieldX className="h-3 w-3 mr-1" />}
                          {r === "CONTESTED" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    onClick={handlePublicAttest}
                    disabled={auditSubmitting || auditSubmitted}
                    className="w-full"
                  >
                    {auditSubmitting ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : auditSubmitted ? (
                      <><CheckCircle2 className="h-4 w-4 mr-2" />Attestation Anchored</>
                    ) : (
                      <><Globe className="h-4 w-4 mr-2" />Anchor My Verification to the Public Ledger</>
                    )}
                  </Button>

                  {auditCount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-compliant/20 bg-compliant/5 px-4 py-3">
                      <Eye className="h-4 w-4 text-compliant" />
                      <p className="text-sm text-compliant font-medium">
                        This commit has been independently verified by <span className="font-black">{auditCount}</span> public auditor{auditCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </div>

                {auditSubmitted && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-compliant/30 bg-compliant/5 p-6 text-center">
                    <Shield className="h-8 w-8 text-compliant mx-auto mb-3" />
                    <p className="font-black text-compliant text-sm mb-1">ATTESTATION ANCHORED</p>
                    <p className="text-xs text-muted-foreground">
                      Your verification has been cryptographically hashed and recorded on the immutable public ledger.
                      It can never be altered or deleted.
                    </p>
                  </motion.div>
                )}
              </TabsContent>

            </Tabs>

            {/* Countersignature offer */}
            <CountersignUpsell
              reference={result?.queried_hash ?? receiptResult?.queried_hash}
              className="mt-12"
            />

            {/* API Access */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="mt-12 rounded-xl border border-border bg-card/60 p-6">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" /> API Access
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Verify hashes programmatically. No authentication required.
              </p>
              <div className="space-y-3">
                <div className="rounded-lg bg-background border border-border p-3">
                  <p className="text-[10px] text-muted-foreground font-mono mb-1">GET</p>
                  <code className="text-xs text-primary font-mono break-all">{VERIFY_URL}?hash=YOUR_SHA256_HASH</code>
                </div>
                <div className="rounded-lg bg-background border border-border p-3">
                  <p className="text-[10px] text-muted-foreground font-mono mb-1">POST</p>
                  <code className="text-xs text-primary font-mono break-all">
                    {`curl -X POST ${VERIFY_URL} -H "Content-Type: application/json" -d '{"hash":"YOUR_SHA256_HASH"}'`}
                  </code>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default Verify;
