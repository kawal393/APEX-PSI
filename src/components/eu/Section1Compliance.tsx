import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileSignature, Lock, Globe, BookMarked, PlayCircle, Stamp } from "lucide-react";
import InBandTool from "@/components/eu/InBandTool";

const IN_BAND = [
  {
    format: "JPEG",
    mech: "APP11 marker segment carrying a JUMBF superbox (C2PA UUID). Multi-segment for manifests over 64 KB. Ed25519 + ML-DSA-65 signed.",
  },
  {
    format: "PNG",
    mech: "caBX ancillary chunk inserted before IEND, CRC32 protected. Plus invisible RGB-LSB watermark. Ed25519 + ML-DSA-65 signed.",
  },
  {
    format: "MP4 / ISO BMFF",
    mech: "Top-level uuid box with the C2PA UUID d8fec3d6-1b0e-483c-9297-5828877ec481. Ed25519 + ML-DSA-65 signed.",
  },
  {
    format: "WAV / RIFF Audio",
    mech: "Dedicated C2PA RIFF chunk appended, RIFF size field repaired. Ed25519 + ML-DSA-65 signed.",
  },
  {
    format: "PDF & any other format",
    mech: "Trailing signed block after %%EOF, delimited by %%APEX-PSI-C2PA markers. Ed25519 + ML-DSA-65 signed.",
  },
  {
    format: "HTTP AI Responses",
    mech: "Compliance-Receipt header (IETF draft-singh-psi-http-01). Signed Ed25519.",
  },
];


const CRYPTO_STACK = [
  { name: "Ed25519", spec: "RFC 8032", note: "Fast, deterministic signatures" },
  { name: "ML-DSA-65", spec: "NIST FIPS 204", note: "Post-quantum lattice signatures" },
  { name: "SHA-256", spec: "FIPS 180-4", note: "Hash chaining" },
  { name: "Hybrid mode", spec: "Ed25519 + ML-DSA-65", note: "Dual-signature quantum-resilient provenance" },
  { name: "JCS", spec: "RFC 8785", note: "Deterministic JSON canonicalization" },
  { name: "OpenTimestamps", spec: "Bitcoin anchor", note: "Independent temporal proof" },
];

const STANDARDS = [
  { id: "draft-singh-psi-00", label: "IETF Internet-Draft — PSI Protocol", href: "/draft" },
  { id: "draft-singh-psi-http-01", label: "IETF Internet-Draft — Compliance-Receipt HTTP Header", href: "/standard" },
  { id: "C2PA 2.1", label: "C2PA Specification 2.1 (Content Credentials)", href: "https://c2pa.org/specifications/specifications/2.1/index.html" },
  { id: "FIPS 204", label: "NIST FIPS 204 (ML-DSA)", href: "https://csrc.nist.gov/pubs/fips/204/final" },
  { id: "RFC 8032", label: "Ed25519 Signature Algorithm", href: "https://www.rfc-editor.org/rfc/rfc8032" },
  { id: "RFC 8785", label: "JSON Canonicalization Scheme", href: "https://www.rfc-editor.org/rfc/rfc8785" },
  { id: "FIPS 180-4", label: "SHA-256 Secure Hash Standard", href: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
];

const ARTICLE_MAP = [
  { art: "Article 12", title: "Record-Keeping", impl: "SHA-256 hash-chained audit trail, monotonic sequence counter, Merkle inclusion proofs." },
  { art: "Article 14", title: "Human Oversight", impl: "5-second Sovereign Pause, Open Global Tribunal, 3-of-5 ratification." },
  { art: "Article 15", title: "Accuracy & Robustness", impl: "MPC 3-node consensus, Ed25519 signatures, ZK privacy commitments." },
  { art: "Article 50", title: "Transparency", impl: "In-band signed metadata + C2PA Content Credentials for all synthetic content." },
  { art: "Article 52", title: "Transparency for AI Systems", impl: "Compliance-Receipt HTTP header on every AI response." },
];

const PUBLIC_KEY_HEX = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";

const SectionShell = ({
  letter,
  title,
  icon: Icon,
  children,
}: {
  letter: string;
  title: string;
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="rounded-xl border border-border bg-card/60 p-5 sm:p-7"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
        <Icon className="h-4.5 w-4.5 text-gold" />
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Section {letter}</p>
        <h3 className="text-lg sm:text-xl font-black text-foreground">{title}</h3>
      </div>
    </div>
    {children}
  </motion.div>
);

const Section1Compliance = () => (
  <section id="section-1-compliance" className="mb-16 scroll-mt-24">
    <div className="text-center mb-8">
      <Badge variant="outline" className="border-gold/40 text-gold mb-4 py-1.5 px-3 text-[10px] sm:text-xs tracking-widest">
        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
        EU CODE OF PRACTICE ON TRANSPARENCY OF AI-GENERATED CONTENT — SECTION 1 COMPLIANT
      </Badge>
      <h2 className="text-2xl sm:text-4xl font-black">
        <span className="text-chrome-gradient">EU AI Act Code of Practice</span>{" "}
        <span className="text-gold-gradient">— Section 1 Compliance</span>
      </h2>
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
        Public technical documentation of the mandatory marking and detection measures under Section 1:
        in-band signed tamperproof metadata and watermarking of artificially generated or manipulated content.
      </p>
    </div>

    <div className="space-y-5">
      <SectionShell letter="A" title="In-Band Signed Tamperproof Metadata" icon={FileSignature}>
        <p className="text-sm text-foreground/80 mb-4">
          APEX PSI embeds cryptographically signed metadata directly inside content files. The signature travels
          <span className="text-gold font-semibold"> with the file</span> — not as a separate receipt.
        </p>
        <div className="space-y-2 mb-4">
          {IN_BAND.map((r) => (
            <div key={r.format} className="rounded-lg border border-border bg-background/40 p-3 sm:flex sm:items-start sm:gap-4">
              <span className="text-xs font-mono font-bold text-gold shrink-0 sm:w-44">{r.format}</span>
              <span className="text-xs text-muted-foreground">{r.mech}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          Metadata is tamperproof — removing or altering it breaks the cryptographic signature. Any C2PA-compatible
          tool can read and verify it.
        </p>
      </SectionShell>

      <SectionShell letter="B" title="Cryptographic Stack" icon={Lock}>
        <div className="grid sm:grid-cols-2 gap-2">
          {CRYPTO_STACK.map((c) => (
            <div key={c.name} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-foreground">{c.name}</span>
                <span className="text-[10px] font-mono text-gold">{c.spec}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell letter="C" title="Public Verification" icon={Globe}>
        <p className="text-sm text-foreground/80 mb-4">
          Anyone can verify any signed file without an account and without contacting APEX.
        </p>
        <ul className="space-y-2 text-sm text-foreground/80">
          <li>
            Verification portal:{" "}
            <Link to="/verify" className="text-gold hover:underline">
              digital-gallows.apex-infrastructure.com/verify
            </Link>
          </li>
          <li className="break-all">
            Public Ed25519 key (hex): <code className="text-xs font-mono text-gold">{PUBLIC_KEY_HEX}</code>
          </li>
          <li>Offline verification supported.</li>
          <li>Zero-knowledge proof option (Groth16-compatible / BN128) for privacy-preserving compliance checks.</li>
        </ul>
      </SectionShell>

      <SectionShell letter="D" title="Standards & References" icon={BookMarked}>
        <div className="space-y-2">
          {STANDARDS.map((s) => {
            const external = s.href.startsWith("http");
            const inner = (
              <>
                <span className="text-xs font-mono font-bold text-gold shrink-0 sm:w-52">{s.id}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </>
            );
            return external ? (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-background/40 p-3 sm:flex sm:items-start sm:gap-4 hover:border-gold/40 transition-colors block"
              >
                {inner}
              </a>
            ) : (
              <Link
                key={s.id}
                to={s.href}
                className="rounded-lg border border-border bg-background/40 p-3 sm:flex sm:items-start sm:gap-4 hover:border-gold/40 transition-colors block"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell letter="E" title="EU AI Act Article Mapping" icon={Stamp}>
        <div className="space-y-2">
          {ARTICLE_MAP.map((a) => (
            <div key={a.art} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-black text-foreground">{a.art}</span>
                <span className="text-xs text-muted-foreground">— {a.title}</span>
              </div>
              <p className="text-xs text-foreground/70 mt-1">{a.impl}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell letter="F" title="Live Demonstration" icon={PlayCircle}>
        <p className="text-sm text-foreground/80 mb-4">
          Working implementation of the Section 1 mandatory measures. Runs entirely in your browser — no account, no
          upload, no API key. Mark a file, download it, change one byte, and the verifier will say so.
        </p>
        <InBandTool />
        <div className="flex flex-wrap gap-3 mt-5">
          <Link
            to="/inband"
            className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors"
          >
            Full specification → /inband
          </Link>
          <Link
            to="/pramaan"
            className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors"
          >
            Seal any file → /pramaan
          </Link>
          <Link
            to="/verify"
            className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors"
          >
            Check any receipt → /verify
          </Link>
        </div>
      </SectionShell>


      <SectionShell letter="G" title="Code of Practice Signatory Status" icon={ShieldCheck}>
        <p className="text-sm text-foreground/80">
          APEX PSI has applied to sign the EU Code of Practice on Transparency of AI-Generated Content. Technical
          documentation is publicly available on this page. Source code is open-source on{" "}
          <a
            href="https://github.com/kawal393/digital-gallows-apex-infrastructure"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </SectionShell>
    </div>
  </section>
);

export default Section1Compliance;
