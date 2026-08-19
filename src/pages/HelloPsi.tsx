import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ChevronDown, Copy, Download, ExternalLink, Hash, Terminal } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import VerifyTheVerifier from "@/components/psi/VerifyTheVerifier";
import HonestyLine from "@/components/psi/HonestyLine";
import {
  buildHelloPsiSeal,
  renderEnvelope,
  schemaDigestFrom,
  HELLO_PSI_FIELD_ORDER,
  HELLO_PSI_SCHEMA_ID,
  HELLO_PSI_VERIFIER_VERSION,
  type HelloPsiSeal,
} from "@/lib/hello-psi";
import { SITE_URL } from "@/lib/site";

interface Vector {
  id: string;
  input: string;
  size_bytes: number;
  hash: string;
  merkle_leaf: string;
  seal_hash: string;
}

const CodeBlock = ({ title, file, lang }: { title: string; file: string; lang: string }) => {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!open || src) return;
    fetch(`/hello-psi/${file}`)
      .then((r) => r.text())
      .then(setSrc)
      .catch(() => setSrc("// Unavailable — download the raw file instead."));
  }, [open, src, file]);

  return (
    <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left bg-transparent border-none cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          <Terminal className="h-4 w-4 text-gold shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground truncate">{file}</span>
            <span className="block text-xs text-muted-foreground">{title}</span>
          </span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <a
            href={`/hello-psi/${file}`}
            download
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-mono uppercase tracking-widest text-gold hover:underline inline-flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Raw
          </a>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-5 py-2 bg-muted/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{lang}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(src); toast.success(`${file} copied`); }}
              className="text-[10px] font-mono uppercase tracking-widest text-gold hover:underline bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground p-5 overflow-x-auto max-h-[420px]">
            {src || "Loading…"}
          </pre>
        </div>
      )}
    </div>
  );
};

const HelloPsi = () => {
  const [input, setInput] = useState("Hello, PSI.");
  const [schemaDigest, setSchemaDigest] = useState<string | null>(null);
  const [seal, setSeal] = useState<HelloPsiSeal | null>(null);
  const [vectors, setVectors] = useState<Vector[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/.well-known/psi-schema.json")
      .then((r) => r.json())
      .then((json) => schemaDigestFrom(json))
      .then(setSchemaDigest)
      .catch(() => setSchemaDigest(null));

    fetch("/hello-psi/vectors.json")
      .then((r) => r.json())
      .then((d) => setVectors(d.vectors ?? []))
      .catch(() => setVectors([]));
  }, []);

  const sealIt = useCallback(async () => {
    if (!schemaDigest) {
      toast.error("Live schema unavailable — cannot compute schema_digest honestly.");
      return;
    }
    setBusy(true);
    try {
      setSeal(await buildHelloPsiSeal({ text: input, schemaDigest }));
    } finally {
      setBusy(false);
    }
  }, [input, schemaDigest]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <>
      <Helmet>
        <title>Hello PSI — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="Prove it in 60 seconds. Compute a PSI-SEAL/1.0.0 seal in your own browser, then recompute the identical bytes with the Python or Node reference implementation. Free forever (MIT)."
        />
        <link rel="canonical" href={`${SITE_URL}/hello-psi`} />
        <meta property="og:title" content="Hello PSI — Apex PSI — Universal Verification Layer" />
        <meta property="og:description" content="A seal is deterministic math. Recompute it yourself — no account, no permission." />
        <meta property="og:url" content={`${SITE_URL}/hello-psi`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <main className="container mx-auto max-w-4xl px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
              Schema {HELLO_PSI_SCHEMA_ID} · Verifier {HELLO_PSI_VERIFIER_VERSION}
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-5">
              <span className="text-chrome-gradient">Hello PSI:</span>{" "}
              <span className="text-gold-gradient">prove it in 60 seconds.</span>
            </h1>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-3xl">
              A seal is deterministic math. Anyone, anywhere, recomputes the same bytes and gets the
              same digest. Do it yourself right now — no account, no permission.
            </p>
          </motion.div>

          <div className="mt-8">
            <VerifyTheVerifier />
          </div>

          {/* ── Interactive seal widget ────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="text-xl font-black tracking-tight mb-4">Seal any bytes, in this browser</h2>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="Paste any text or JSON…"
              className="font-mono text-sm bg-card/40"
            />
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Button variant="hero" onClick={sealIt} disabled={busy}>
                <Hash className="mr-2 h-4 w-4" /> {busy ? "Computing…" : "SEAL IT"}
              </Button>
              <span className="text-[11px] font-mono text-muted-foreground">
                {schemaDigest
                  ? `schema_digest ${schemaDigest.slice(0, 16)}… — computed live from /.well-known/psi-schema.json`
                  : "schema_digest unavailable"}
              </span>
            </div>

            {seal && (
              <div className="mt-6 rounded-lg border border-border bg-card/40 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/20">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Envelope — field order {HELLO_PSI_FIELD_ORDER.join(", ")}
                  </span>
                  <span className="flex items-center gap-4">
                    <button
                      onClick={() => copy(renderEnvelope(seal.envelope), "Seal JSON")}
                      className="text-[10px] font-mono uppercase tracking-widest text-gold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Copy seal JSON
                    </button>
                    <button
                      onClick={() => copy(seal.seal_hash, "seal_hash")}
                      className="text-[10px] font-mono uppercase tracking-widest text-gold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Copy seal_hash
                    </button>
                  </span>
                </div>
                <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground p-5 overflow-x-auto">
                  {renderEnvelope(seal.envelope)}
                </pre>
                <div className="px-5 py-3 border-t border-border">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gold mb-1">seal_hash</p>
                  <p className="text-xs font-mono break-all text-foreground">{seal.seal_hash}</p>
                </div>
                <p className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                  The Python reference implementation emits these identical bytes. Run it and compare.
                  That is the whole protocol.
                </p>
              </div>
            )}
          </section>

          {/* ── Reference implementations ──────────────────────────────── */}
          <section className="mt-14">
            <h2 className="text-xl font-black tracking-tight mb-2">Reference implementations</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Zero dependencies. Rules R1–R10. Both pin <code className="font-mono">sealed_at</code> to a
              fixed vector timestamp, so identical input produces byte-identical digests in either language.
            </p>
            <div className="space-y-3">
              <CodeBlock file="hello_psi.py" title="Python 3 — hashlib, json, unicodedata only" lang="python" />
              <CodeBlock file="hello-psi.js" title="Node 18+ — zero dependencies" lang="javascript" />
            </div>
            <a
              href="/hello-psi/vectors.json"
              download
              className="inline-flex items-center gap-1 mt-4 text-xs font-mono text-gold hover:underline"
            >
              <Download className="h-3 w-3" /> vectors.json
            </a>
          </section>

          {/* ── Test vectors ───────────────────────────────────────────── */}
          <section className="mt-14">
            <h2 className="text-xl font-black tracking-tight mb-2">Test vectors</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Computed by executing the reference logic in CI — never hand-typed. Reproduce them with{" "}
              <code className="font-mono">python3 hello_psi.py &quot;Hello, PSI.&quot;</code>
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase tracking-widest">
                    <th className="text-left px-3 py-2 font-normal">Input</th>
                    <th className="text-left px-3 py-2 font-normal">hash</th>
                    <th className="text-left px-3 py-2 font-normal">merkle.leaf</th>
                    <th className="text-left px-3 py-2 font-normal">seal_hash</th>
                  </tr>
                </thead>
                <tbody>
                  {vectors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                        Vectors unavailable — download vectors.json directly.
                      </td>
                    </tr>
                  )}
                  {vectors.map((v) => (
                    <tr key={v.id} className="border-b border-border/60 align-top">
                      <td className="px-3 py-2 max-w-[180px]">
                        <span className="block text-gold">{v.id}</span>
                        <span className="block break-all text-foreground/80">
                          {v.input === "" ? "(empty string)" : v.input}
                        </span>
                      </td>
                      <td className="px-3 py-2 break-all text-muted-foreground">{v.hash}</td>
                      <td className="px-3 py-2 break-all text-muted-foreground">{v.merkle_leaf}</td>
                      <td className="px-3 py-2 break-all text-muted-foreground">{v.seal_hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <a
              href="/.well-known/psi-schema.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono text-gold hover:underline"
            >
              Normative rules R1–R12 — /.well-known/psi-schema.json <ExternalLink className="h-3 w-3" />
            </a>
            <HonestyLine />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HelloPsi;
