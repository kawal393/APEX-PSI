import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InBandTool from "@/components/eu/InBandTool";
import { PSI_BOX_MAGIC, PSI_MANIFEST_SPEC, CONTAINER_MECHANISM, DIGITAL_SOURCE_TYPES } from "@/lib/c2pa-inband";
import { WM2_METHOD, WM2_SPEC } from "@/lib/psi-watermark-dct";
import { HYBRID_SUITE, PQC_ALGO, PQC_STANDARD } from "@/lib/psi-pqc";

const MANIFEST_EXAMPLE = `APEXPSI-C2PA-V1 | uint32be(length) | UTF-8 JSON

{
  "magic": "APEXPSI-C2PA-V1",
  "claim": {
    "spec": "PSI-INBAND-v1",
    "claim_generator": "APEX-PSI/1.0",
    "instance_id": "urn:uuid:…",
    "created_at": "2026-07-30T05:00:00.000Z",
    "format": "image/png",
    "title": "asset.png",
    "signature_suite": "Ed25519+ML-DSA-65",
    "assertions": [
      { "label": "c2pa.actions", "data": { "actions": [{
          "action": "c2pa.created",
          "digitalSourceType": "…/trainedAlgorithmicMedia",
          "softwareAgent": "APEX PSI", "when": "…" }] } },
      { "label": "c2pa.hash.data", "data": {
          "alg": "sha256", "hash": "<pre-embed digest>",
          "exclusions": [{ "box": "APEXPSI-C2PA-V1" }] } },
      { "label": "psi.watermark", "data": {
          "method": "psi.lsb-spread-v1", "channels": "RGB-LSB",
          "payload": "sync16+sha256" } }
    ],
    "hard_binding": { "alg": "sha256", "pre_embed_sha256": "…", "size_bytes": 0 },
    "verify_url": "https://ai-governance-standard.com/verify?h=…"
  },
  "signature": {
    "suite": "Ed25519+ML-DSA-65",
    "ed25519": { "sig": "…", "pk": "…" },
    "mldsa65": { "sig": "…", "pk": "…" },
    "message_hash": "<sha256 of RFC 8785 canonical claim>",
    "signed_at": "…"
  }
}`;

const VERIFY_STEPS = [
  "Locate the manifest box using the container mechanism for the detected format (or by scanning for the ASCII magic).",
  "Parse the length-prefixed UTF-8 JSON manifest.",
  "Canonicalize claim with RFC 8785 (JCS) and verify the Ed25519 signature (RFC 8032).",
  "Verify the ML-DSA-65 signature (NIST FIPS 204). A verdict of VALID requires BOTH to pass.",
  "Remove the manifest box from the asset and re-compute SHA-256; compare with hard_binding.pre_embed_sha256.",
  "For rasters, recover the transform-domain watermark (grid-offset, tile-shift and rescale search, soft majority vote) and compare it against the declared digest.",
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-12">
    <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-foreground mb-4">
      <span className="text-gold-gradient">{title}</span>
    </h2>
    {children}
  </section>
);

const InBand = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>In-Band Signed Metadata & Watermarking Spec | APEX PSI</title>
      <meta
        name="description"
        content="PSI-INBAND-v1: JUMBF-framed in-band signed tamperproof metadata plus a transform-domain robust watermark for AI-generated content. EU AI Act Code of Practice, Section 1."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/inband" />
      <meta property="og:title" content="In-Band Signed Metadata & Watermarking Spec | APEX PSI" />
      <meta
        property="og:description"
        content="Open specification and working browser implementation of in-band signed tamperproof metadata and watermarking."
      />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <Navbar />
    <main className="pt-28 pb-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">{PSI_MANIFEST_SPEC}</p>
        <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4">
          In-Band Signed Metadata &amp; Watermarking
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-8">
          The mandatory marking measures of Section 1 of the EU Code of Practice on Transparent Generative AI
          Systems: signed, tamper-evident metadata attached to the content itself, plus an invisible watermark for
          raster media. Specification, reference implementation and detector are open source and run client-side.
        </p>

        <Section title="Live implementation">
          <InBandTool />
        </Section>

        <Section title="Container mechanisms">
          <div className="space-y-2">
            {Object.entries(CONTAINER_MECHANISM).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-card/40 p-3 sm:flex sm:gap-4">
                <span className="text-xs font-mono font-bold text-gold sm:w-32 shrink-0">{k.toUpperCase()}</span>
                <span className="text-xs text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This is PSI-INBAND-v1, not C2PA. It reuses JUMBF framing (ISO 19566-2) for container placement only:
            claims are JCS-canonical JSON with hybrid signatures, not CBOR/COSE_Sign1. Interoperability testing
            against third-party C2PA validators is in progress and the results will be published at{" "}
            <Link to="/eu-code" className="text-gold hover:underline">/eu-code</Link> whatever they show.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Every container carries the identical self-describing box, so extraction is deterministic across formats:{" "}
            <code className="font-mono text-gold">{PSI_BOX_MAGIC}</code> followed by a 32-bit big-endian length and
            the UTF-8 JSON manifest.
          </p>
        </Section>

        <Section title="Manifest layout">
          <pre className="overflow-x-auto rounded-xl border border-border bg-card/40 p-4 text-[11px] leading-relaxed font-mono text-foreground/85">
{MANIFEST_EXAMPLE}
          </pre>
        </Section>

        <Section title="Cryptographic stack">
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { n: "Hybrid suite", s: HYBRID_SUITE, d: "A verdict of VALID requires both signatures to verify." },
              { n: PQC_ALGO, s: PQC_STANDARD, d: "Post-quantum lattice signature over the canonical claim." },
              { n: "Ed25519", s: "RFC 8032", d: "Classical signature over the same canonical claim." },
              { n: "SHA-256", s: "FIPS 180-4", d: "Hard binding of the pre-embed asset bytes." },
              { n: "JCS", s: "RFC 8785", d: "Deterministic JSON canonicalization before signing." },
              { n: "Watermark", s: WM2_METHOD, d: WM2_SPEC },
            ].map((c) => (
              <div key={c.n} className="rounded-lg border border-border bg-card/40 p-3">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{c.n}</span>
                  <span className="text-[10px] font-mono text-gold">{c.s}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Declared source types (IPTC digitalSourceType)">
          <div className="space-y-2">
            {Object.entries(DIGITAL_SOURCE_TYPES).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-card/40 p-3">
                <p className="text-xs font-bold text-foreground">{k}</p>
                <p className="text-[11px] font-mono text-muted-foreground break-all">{v}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Verification algorithm">
          <ol className="space-y-2">
            {VERIFY_STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border bg-card/40 p-3">
                <span className="text-xs font-mono font-black text-gold">{i + 1}</span>
                <span className="text-xs text-foreground/80">{s}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Scope and limits">
          <ul className="space-y-2 text-xs text-foreground/75">
            <li>• Marking asserts what the asset was and when it was sealed. It does not assert that the content is true.</li>
            <li>• The transform-domain watermark is benchmarked against JPEG recompression, resizing, cropping, screenshots and social-platform recompression chains — run it yourself at <Link to="/robustness" className="text-gold hover:underline">/robustness</Link>. Generative re-rendering of an image is expected to destroy any watermark; in-band metadata then remains the marker.</li>
            <li>• Removing the manifest is always possible for anyone holding the file — it makes the asset unmarked, it cannot forge a valid mark.</li>
            <li>• Demonstration seals use ephemeral keys generated in your browser. Production seals issued through the APEX notary are signed by the long-lived protocol keys published on <Link to="/protocol" className="text-gold hover:underline">/protocol</Link>.</li>
          </ul>
        </Section>

        <div className="flex flex-wrap gap-3">
          <Link to="/eu-ai-act" className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors">
            EU AI Act Section 1 compliance
          </Link>
          <Link to="/robustness" className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors">
            Watermark robustness benchmark
          </Link>
          <Link to="/standard" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            Compliance-Receipt header
          </Link>
          <Link to="/verify" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            Public verification
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default InBand;
