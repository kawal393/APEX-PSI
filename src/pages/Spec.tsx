import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Check, X, AlertTriangle, ArrowRight } from "lucide-react";

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 py-2.5 border-b border-border/50">
    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{k}</div>
    <div className="text-sm text-foreground/90 font-mono break-words">{v}</div>
  </div>
);

const Section = ({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 mb-16">
    <div className="flex items-baseline gap-3 mb-5">
      <span className="text-gold font-mono text-xs tracking-widest">{n}</span>
      <h2 className="text-2xl md:text-4xl font-black tracking-tight text-chrome-gradient uppercase">{title}</h2>
    </div>
    {children}
  </section>
);

const Status = ({ state, children }: { state: "live" | "partial" | "no"; children: React.ReactNode }) => {
  const Icon = state === "live" ? Check : state === "partial" ? AlertTriangle : X;
  const cls =
    state === "live"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
      : state === "partial"
        ? "text-gold border-gold/30 bg-gold/5"
        : "text-destructive border-destructive/30 bg-destructive/5";
  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="text-foreground/90">{children}</span>
    </div>
  );
};

const Spec = () => (
  <>
    <Helmet>
      <title>Apex PSI Technical Specification — EU AI Act Article 50 Provenance — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Full technical specification of the APEX PSI protocol: RFC 8785 canonicalization, Ed25519 + ML-DSA-65 hybrid signatures, JUMBF-framed in-band PSI manifests, Compliance-Receipt HTTP header, and EU AI Act Article 50 mapping."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/spec" />
      <meta property="og:title" content="APEX PSI — Full Technical Specification" />
      <meta property="og:description" content="Every algorithm, every endpoint, every limitation. Written for regulators and engineers." />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>

    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <header className="border-b border-border pt-28 pb-14 px-4 grid-bg">
        <div className="container mx-auto max-w-5xl">
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-gold mb-4">
            Technical Specification · v1.2 · Public
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.92] mb-6">
            <span className="text-chrome-gradient">The Whole Machine.</span>
            <br />
            <span className="text-gold-gradient">Nothing Hidden.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
            This is the complete technical description of APEX PSI — the algorithms, the wire formats, the endpoints,
            the trust model, and an explicit list of what this protocol <em>cannot</em> do. If you arrived here from the
            EU AI Office, Section 07 maps every Article 50 obligation to a concrete artefact you can verify yourself in
            under five minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["IETF draft-singh-psi (rev 01)", "draft-singh-psi-http (not yet filed)", "RFC 8785 (JCS)", "NIST FIPS 204", "JUMBF-framed (ISO 19566-2)", "MIT / Apache-2.0"].map((c) => (
              <span key={c} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-3 py-1">
                {c}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        {/* Contents */}
        <nav className="mb-16 border border-border rounded-lg p-5 bg-card/40">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {[
              ["01", "What the protocol asserts", "assert"],
              ["02", "Canonicalization & hashing", "hash"],
              ["03", "Signature suite", "sig"],
              ["04", "Receipt structure", "receipt"],
              ["05", "In-band embedding (C2PA)", "inband"],
              ["06", "Transport: HTTP header", "http"],
              ["07", "EU AI Act Article 50 mapping", "euaia"],
              ["08", "Anchoring & durability", "anchor"],
              ["09", "API surface", "api"],
              ["10", "Threat model", "threat"],
              ["11", "Limitations — read this", "limits"],
              ["12", "Governance & licensing", "gov"],
            ].map(([n, t, id]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-foreground/80 hover:text-gold transition-colors">
                  <span className="font-mono text-gold/70 text-xs mr-2">{n}</span>
                  {t}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="assert" n="01" title="What the protocol asserts">
          <p className="text-muted-foreground mb-5 leading-relaxed">
            APEX PSI is a <strong className="text-foreground">provenance and integrity</strong> protocol. It produces a
            portable receipt binding four things together: a byte-exact digest of a payload, a declared context
            (predicates, model identity, actor), a timestamp, and a signature from a named key.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <Status state="live">
              <strong>It proves:</strong> this exact byte sequence existed, in this state, under this declared context,
              at or before this time, and was sealed by the holder of this key.
            </Status>
            <Status state="no">
              <strong>It does not prove:</strong> that the content is true, lawful, accurate, unedited before sealing, or
              that the declared context is honest. Sealing a lie produces a verifiable lie.
            </Status>
          </div>
        </Section>

        <Section id="hash" n="02" title="Canonicalization & hashing">
          <p className="text-muted-foreground mb-5">
            Structured claims are serialised with RFC 8785 JSON Canonicalization Scheme before hashing, so key ordering,
            whitespace, and number formatting can never change the digest. Binary payloads are hashed directly.
          </p>
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="Canonical form" v="RFC 8785 (JCS) — UTF-8, lexicographic keys, ES6 number serialization" />
            <Row k="Digest" v="SHA-256 (FIPS 180-4) via WebCrypto crypto.subtle.digest" />
            <Row k="Large files" v="hash-wasm streaming SHA-256, chunked — files never leave the browser" />
            <Row k="Digest encoding" v="lowercase hex, 64 chars, optionally prefixed sha256:" />
            <Row k="Merkle tree" v="binary, SHA-256 of concatenated child digests, odd node promoted" />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background/80 p-4 text-xs font-mono text-foreground/80">
{`digest      = SHA256( JCS(claim) )
leaf        = digest
parent(a,b) = SHA256( a_bytes || b_bytes )
root        = fold(parent, leaves)   // odd tail promoted unchanged`}
          </pre>
        </Section>

        <Section id="sig" n="03" title="Signature suite">
          <p className="text-muted-foreground mb-5">
            Every institutional seal carries <strong className="text-foreground">two independent signatures</strong> over
            the same message. A receipt is quantum-verified only if both verify. Ed25519 covers the classical case;
            ML-DSA-65 covers a future in which Shor&apos;s algorithm is practical. Neither alone is trusted.
          </p>
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="Suite identifier" v="Ed25519+ML-DSA-65" />
            <Row k="Classical" v="Ed25519 (RFC 8032), 32-byte key, 64-byte signature" />
            <Row k="Post-quantum" v="ML-DSA-65 — NIST FIPS 204, Aug 2024 (Dilithium3 parameter set)" />
            <Row k="Implementation" v="@noble/ed25519, @noble/post-quantum — audited, dependency-free" />
            <Row k="Key custody" v="private seed held server-side only; signing performed by an isolated function" />
            <Row k="Trust anchor" v="/.well-known/apex-psi-trust-anchor.json (public halves, issuer URN, valid_from)" />
            <Row k="Ephemeral mode" v="client-side random keypair, discarded — proves integrity, NOT attribution" />
          </div>
          <div className="mt-4">
            <Status state="partial">
              Attribution requires the receipt&apos;s public keys to match the published trust anchor byte-for-byte.
              Self-sealed (ephemeral) receipts are valid integrity proofs but are attributable to nobody. The UI labels
              this distinction explicitly.
            </Status>
          </div>
        </Section>

        <Section id="receipt" n="04" title="Receipt structure">
          <p className="text-muted-foreground mb-5">
            The receipt is a ~2 KB JSON object. It is self-contained: a verifier needs the receipt, the payload, and the
            trust anchor. No network call to APEX is required, ever.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-background/80 p-4 text-xs font-mono text-foreground/80">
{`{
  "spec": "draft-singh-psi-00",
  "receipt_id": "psi_01J...",
  "payload": {
    "digest": "sha256:9f2c...",
    "bytes": 4194304,
    "media_type": "image/jpeg"
  },
  "context": {
    "predicates": ["EU_ART_50", "EU_ART_14"],
    "actor": "urn:apex-psi:issuer:root-1",
    "model": null,
    "captured_at": "2026-07-30T11:04:22Z",
    "geo": { "lat": -33.868, "lon": 151.209, "accuracy_m": 12 }
  },
  "signature": {
    "suite": "Ed25519+ML-DSA-65",
    "ed25519": { "pk": "5930...", "sig": "a71f..." },
    "mldsa65": { "pk": "c04b...", "sig": "9d3e..." },
    "message_hash": "sha256:9f2c...",
    "signed_at": "2026-07-30T11:04:23Z"
  },
  "inclusion": {
    "merkle_root": "sha256:41ab...",
    "path": ["sha256:0c1d...", "sha256:77fe..."],
    "index": 3
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Fields with no value are emitted as null, never omitted — omission would change the canonical form.
          </p>
        </Section>

        <Section id="inband" n="05" title="In-band embedding (PSI-INBAND-v1)">
          <p className="text-muted-foreground mb-5">
            Article 50 describes machine-readable marking subject to technical feasibility. APEX PSI can write a
            receipt into supported files using selected container conventions associated with C2PA. This does not claim
            C2PA certification or interoperability with every C2PA-aware product.
          </p>
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="JPEG / PNG" v="APP11 marker segment carrying a JUMBF-framed PSI manifest" />
            <Row k="MP4 / MOV" v="ISO BMFF 'uuid' box at top level" />
            <Row k="PDF" v="embedded file stream + /Metadata XMP reference" />
            <Row k="WAV / MP3" v="RIFF chunk / ID3v2 PRIV frame" />
            <Row k="Fallback" v="sidecar .praman JSON, byte-identical payload" />
            <Row k="Perceptual mark" v="optional invisible watermark for lossy-recompression survival" />
          </div>
          <div className="mt-4">
            <Status state="partial">
              Honest limit: stripping metadata destroys the in-band manifest. The digest still verifies against a sidecar
              or the public ledger, but the file alone will no longer self-declare. No provenance scheme on earth solves
              this — including C2PA. We do not claim otherwise.
            </Status>
          </div>
        </Section>

        <Section id="http" n="06" title="Transport: the Compliance-Receipt header">
          <p className="text-muted-foreground mb-5">
            For AI systems that emit text rather than files, the receipt travels as an HTTP response header. This is
            specified in <span className="font-mono text-foreground">draft-singh-psi-http-01</span> and is the mechanism
            we expect to matter most at scale — it requires no change to payload formats.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-background/80 p-4 text-xs font-mono text-foreground/80">
{`HTTP/1.1 200 OK
Content-Type: application/json
Compliance-Receipt: v=1; id=psi_01J...; alg=Ed25519+ML-DSA-65;
  digest=sha256:9f2c...; pred=EU_ART_50; iss=urn:apex-psi:issuer:root-1;
  ts=2026-07-30T11:04:23Z; sig=a71f...`}
          </pre>
          <p className="text-muted-foreground mt-4">
            Discovery is via <span className="font-mono text-foreground">/.well-known/compliance-receipt</span>, which
            publishes the issuer, spec version, key set, and verification endpoint. Runtime adapters exist for OpenAI,
            Anthropic, the Vercel AI SDK, and Hono.
          </p>
        </Section>

        <Section id="euaia" n="07" title="EU AI Act Article 50 mapping">
          <p className="text-muted-foreground mb-5">
            Article 50(2) requires providers of generative systems to mark outputs in a machine-readable format,
            detectable as artificially generated, and effective, interoperable, robust and reliable as far as
            technically feasible. Below is our claim against each word, with the artefact that substantiates it.
          </p>
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="Machine-readable" v="JCS-canonical JSON in APP11/JUMBF box or Compliance-Receipt header" />
            <Row k="Detectable" v="deterministic digest match — no ML classifier, no probabilistic guess" />
            <Row k="Interoperability evidence" v="Documented container conventions, individual IETF submissions and open reference code; independent compatibility testing remains required" />
            <Row k="Robust" v="hybrid Ed25519 + FIPS 204 ML-DSA-65; optional perceptual watermark" />
            <Row k="Reliability evidence" v="Documented receipts can be checked offline with the verifier and archived public key; availability and key-distribution risks remain" />
            <Row k="Art. 50(4) disclosure" v="deepfake / synthetic flag carried as a predicate in receipt context" />
            <Row k="Art. 12 record-keeping" v="append-only ledger, Merkle inclusion proof per entry" />
            <Row k="Art. 14 human oversight" v="predicate EU_ART_14 recorded at decision time, not reconstructed later" />
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <Status state="live">
              Verify any of the above yourself: fetch the trust anchor, seal a file at{" "}
              <Link to="/pramaan" className="underline">/pramaan</Link>, then verify the receipt at{" "}
              <Link to="/verify" className="underline">/verify</Link> with your network disconnected.
            </Status>
            <Status state="partial">
              APEX PSI is not a conformity assessment and confers no presumption of conformity. It is a technical
              mechanism a provider can use to satisfy a marking obligation. No notified body has assessed it.
            </Status>
          </div>
        </Section>

        <Section id="anchor" n="08" title="Anchoring & durability">
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="Ledger" v="append-only rows, each carrying prior digest — tamper-evident chain" />
            <Row k="Batching" v="periodic Merkle root over all receipts in the window" />
            <Row k="Bitcoin" v="OpenTimestamps proof remains pending until a Bitcoin attestation is independently verified" />
            <Row k="Other chains" v="No chain is treated as confirmed without independently verifiable transaction evidence" />
            <Row k="Mirror" v="audit-mirror JSONL export — anyone may replicate the full ledger" />
            <Row k="Liveness" v="lattice heartbeat across independent nodes" />
          </div>
          <div className="mt-4">
            <Status state="partial">
              Anchoring gives an upper bound on time (&ldquo;this existed no later than block N&rdquo;). It does not give
              a lower bound. A receipt&apos;s <span className="font-mono">signed_at</span> is an assertion by the signer,
              not a proof.
            </Status>
          </div>
        </Section>

        <Section id="api" n="09" title="API surface">
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="POST /v1/notarize" v="seal a digest + context → signed receipt with inclusion proof" />
            <Row k="POST /v1/notarize-batch" v="up to 100 decisions in one Merkle window" />
            <Row k="GET  /v1/verify" v="verify by digest or receipt_id → verified boolean + anchor state" />
            <Row k="GET  /v1/health" v="liveness, key id, spec version" />
            <Row k="GET  /.well-known/apex-psi-trust-anchor.json" v="public keys, issuer URN, validity window" />
            <Row k="GET  /.well-known/compliance-receipt" v="HTTP-binding discovery document" />
            <Row k="Auth" v="scoped API keys (apex_ntry_ / apex_api_) — verification endpoints are unauthenticated" />
            <Row k="CORS" v="open on all verification routes — permissionless audit is the point" />
          </div>
          <div className="mt-4">
            <Link to="/api" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gold hover:underline">
              Full API reference <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Section>

        <Section id="threat" n="10" title="Threat model">
          <div className="space-y-3">
            <Status state="live">
              <strong>Payload tampering.</strong> Any single-bit change breaks the digest. Detected deterministically.
            </Status>
            <Status state="live">
              <strong>Receipt forgery.</strong> Requires forging both Ed25519 and ML-DSA-65 over the same message.
            </Status>
            <Status state="live">
              <strong>Ledger rewriting.</strong> Hash chaining makes modification detectable when a trusted checkpoint or confirmed external timestamp is available.
            </Status>
            <Status state="live">
              <strong>Registrar disappearance.</strong> Verification is offline. If APEX ceases to exist, every issued
              receipt remains verifiable against the archived trust anchor.
            </Status>
            <Status state="partial">
              <strong>Signing-key compromise.</strong> Mitigated by key rotation and <span className="font-mono">valid_from</span>{" "}
              windows in the anchor. Not eliminated. This is the single highest-value target in the system and we say so.
            </Status>
            <Status state="no">
               <strong>Lying at the source.</strong> If a caller declares false context, the seal faithfully records the
               false claim. Cryptography does not validate source assertions.
            </Status>
            <Status state="no">
              <strong>Analogue re-capture.</strong> Photographing a screen produces genuinely new bytes with a genuinely
              valid seal. Provenance is not authenticity of the depicted scene.
            </Status>
          </div>
        </Section>

        <Section id="limits" n="11" title="Limitations — read this before you cite us">
          <p className="text-muted-foreground mb-5">
            Every provenance vendor publishes a capability list. Almost none publish this one. Here it is.
          </p>
          <ul className="space-y-2.5 text-sm text-foreground/85">
            {[
              "The IETF drafts are individual submissions. They are not adopted by a working group and are not standards.",
              "Zero-knowledge components are Groth16-compatible over BN128 and are demonstrative, not a production privacy guarantee.",
              "Bitcoin anchoring is via OpenTimestamps and inherits its calendar-server trust and confirmation latency.",
              "The APEX PSI Foundation is in formation. It is not an incorporated legal entity and holds no assets.",
              "There is no notified-body assessment, no ETSI/CEN-CENELEC harmonised-standard status, and no regulator endorsement.",
              "Metadata stripping removes in-band manifests. Perceptual watermarking degrades under heavy re-encoding.",
              "Geolocation in receipts is device-reported and trivially spoofable. Treat it as a claim, not evidence.",
              "Adoption is early. Our credibility rests on the mathematics being checkable, not on the size of our customer list.",
            ].map((l) => (
              <li key={l} className="flex gap-3 border-l-2 border-border pl-4 py-1">
                <span className="text-gold font-mono text-xs mt-0.5">—</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="gov" n="12" title="Governance & licensing">
          <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
            <Row k="Protocol licence" v="MIT — reference implementation" />
            <Row k="Verifier libraries" v="Apache-2.0" />
            <Row k="Patent posture" v="non-assertion pledge for standards-conformant implementations" />
            <Row k="Specifications" v="draft-singh-psi (rev 01, filed 29 Aug 2026); draft-singh-psi-http in preparation, not yet filed (IETF individual submissions)" />
            <Row k="Governance" v="APEX PSI Foundation — in formation; charter and verifier-node programme published" />
            <Row k="Forkability" v="the entire protocol runs without APEX. That is the design goal, not a concession." />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/verify" className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-black uppercase tracking-widest text-background hover:bg-gold/90 transition-colors">
              Verify a receipt <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/foundation" className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-black uppercase tracking-widest text-foreground hover:border-gold/40 transition-colors">
              Governance
            </Link>
            <Link to="/protocol" className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-black uppercase tracking-widest text-foreground hover:border-gold/40 transition-colors">
              Protocol roadmap
            </Link>
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  </>
);

export default Spec;
