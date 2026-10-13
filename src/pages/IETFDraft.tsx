import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Download, ExternalLink, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HonestyLine from "@/components/psi/HonestyLine";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

// Registry facts, verified against the IETF datatracker API and the IETF archive
// on 1 October 2026. This page serves the FILED text, not a rewrite of it.
const DOC_NAME = "draft-singh-psi";
const FILED_FILE = "draft-singh-psi-02";
const ARCHIVE_URL = "https://www.ietf.org/archive/id/draft-singh-psi-02.txt";
const TRACKER_URL = "https://datatracker.ietf.org/doc/draft-singh-psi/";
const LOCAL_COPY = `/ietf/${FILED_FILE}.txt`;

const META = [
  { label: "Document", value: DOC_NAME },
  { label: "Revision on file", value: "02" },
  { label: "Intended status", value: "Informational" },
  { label: "Submitted", value: "13 Oct 2026" },
  { label: "Expires", value: "16 April 2027" },
  { label: "Replaces", value: "Revision 01 (29 Aug 2026)" },
];

// Filed text versus deployed code. Stated side by side because the filed text is
// what a third party will cite, and it is not improved by being described here.
const GAPS = [
  {
    filed: '"Groth16-compatible zero-knowledge commitments over BN128 fields"',
    live: "No circuit, no SNARK, no pairing check and no trusted setup exists in the deployment. The seal layer is SHA-256 over RFC 8785 canonical input, signed with Ed25519.",
    fix: "Revision 02 removes every zero-knowledge, Groth16 and BN128 claim. No proving system is part of PSI.",
  },
  {
    filed: '"3-node Multi-Party Computation (MPC) consensus mechanism with 2/3 threshold verification"',
    live: "Three verification endpoints re-run the same checks on the same input, which they receive in the clear. All three are operated by one entity.",
    fix: "Revision 02 removes the MPC claim and states that a single issuer is a central operator.",
  },
  {
    filed: '"Immutable logging" and "prove compliance with AI regulations"',
    live: "Records are append-only and alteration is detectable. Verification reports integrity only, never compliance.",
    fix: "Revision 02 states that PSI shows integrity, origin and ordering only, not truth, legality or compliance.",
  },
  {
    filed: "Merkle construction with leaf duplication for odd counts, sorted sibling pairs, and inclusion proofs",
    live: "New receipts use the RFC 6962 profile: chronological leaves, 0x00/0x01 prefixes, no duplication.",
    fix: "Revision 02 specifies the RFC 6962 profile and the merkle_profile field, and no longer claims inclusion proofs.",
  },
];

const IETFDraft = () => {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(LOCAL_COPY)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => { if (alive) setText(t); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const copyDraft = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Filed draft copied to clipboard");
  };

  const downloadDraft = () => {
    if (!text) return;
    // IETF datatracker requires proper plain-text with CRLF line endings
    const crlfText = text.replace(/\r?\n/g, "\r\n");
    const blob = new Blob([crlfText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${FILED_FILE}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>IETF draft-singh-psi (rev 02) — Proof of Stateful Integrity — Apex PSI — Universal Verification Protocol</title>
        <meta name="description" content="The filed IETF Internet-Draft draft-singh-psi revision 02, verbatim, and the claims of revision 01 it withdrew." />
        <link rel="canonical" href="https://ai-governance-standard.com/draft" />
        <meta property="og:title" content="IETF draft-singh-psi revision 02 — as filed" />
        <meta property="og:description" content="Verbatim copy of the filed Internet-Draft, with the gap between filed text and deployed code stated plainly." />
        <meta property="og:url" content="https://ai-governance-standard.com/draft" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Hero */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4">
                IETF INTERNET-DRAFT — REVISION 02 AS FILED
              </Badge>
              <h1 className="text-2xl sm:text-4xl font-black mb-4">
                <span className="text-chrome-gradient">{DOC_NAME}</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm mb-6">
                Proof of Stateful Integrity (PSI): Signed, Merkle-Committed Receipts for Digital Records.
                Individual Informational Internet-Draft; not an IETF standard; not adopted by a working group.
                The text below is the filed revision. The claims revision 01 made and revision 02 withdrew are
                listed underneath.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="sm" onClick={copyDraft} disabled={!text}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Filed Text
                </Button>
                <Button variant="heroOutline" size="sm" onClick={downloadDraft} disabled={!text}>
                  <Download className="h-4 w-4 mr-2" /> Download {FILED_FILE}.txt
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href={TRACKER_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Datatracker Record
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Metadata */}
        <section className="px-4 mb-8">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {META.map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-card/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{m.label}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{m.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-3 text-center">
              A separate registry document is literally named <code className="text-primary">draft-singh-psi-01</code>
              {" "}(2 pages, filed 19 July 2026, previously titled &quot;PSI-01: Zero-Knowledge Method for Ventilation
              Air Methane&quot;). It is not this specification, and the similarity is a naming collision, not a
              revision of it. Cite by document name and revision together.
            </p>
          </div>
        </section>

        {/* Filed text versus deployed code */}
        <section className="px-4 mb-10">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                  What revision 01 claimed and revision 02 withdrew
                </h2>
              </div>
              <div className="space-y-5">
                {GAPS.map((g) => (
                  <div key={g.filed} className="text-sm">
                    <p className="text-foreground font-medium mb-1">Revision 01: {g.filed}</p>
                    <p className="text-muted-foreground mb-1">Deployed: {g.live}</p>
                    <p className="text-muted-foreground/80">Now: {g.fix}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-5">
                Revision 02 was filed on 13 October 2026. Revision 01 remains in the IETF archive as a
                historical record; cite revision 02.
              </p>
            </div>
          </div>
        </section>

        {/* Filed text */}
        <section className="px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {FILED_FILE}.txt — AS PUBLISHED BY THE IETF ARCHIVE
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyDraft} disabled={!text} className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40" title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={downloadDraft} disabled={!text} className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40" title="Download">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <pre className="p-6 text-xs sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[80vh] overflow-y-auto">
                {failed
                  ? "The archived text could not be loaded. The authoritative copy is at " + ARCHIVE_URL
                  : text ?? "Loading the archived text…"}
              </pre>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-3">
              Authoritative source: <a className="text-primary underline" href={ARCHIVE_URL} target="_blank" rel="noopener noreferrer">{ARCHIVE_URL}</a>
            </p>
          </div>
        </section>
      </div>
      <div className="container mx-auto max-w-4xl px-4 pb-10">
        <HonestyLine />
      </div>
      <Footer />
    </div>
  </>
  );
};

export default IETFDraft;
