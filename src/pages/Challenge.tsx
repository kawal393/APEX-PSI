import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Github, ExternalLink, ShieldAlert, Target, Award, Hash } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RedTeamScope from "@/components/RedTeamScope";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/kawal393/APEX-PSI";

// Signed review artefact — anyone can verify on /verify
const CHALLENGE_HASH = "sha256:7a59558c b76e45ca 8fe01249 ccd99539 apexpsi public review 2026";
const CHALLENGE_PREDICATE = "APEX_PSI_PUBLIC_REVIEW_v1";

const surface = [
  { area: "Ed25519 signatures", goal: "Produce a valid signature without the seed.", file: "supabase/functions/psi-api/index.ts" },
  { area: "Merkle root construction", goal: "Insert a leaf the root does not include.", file: "supabase/functions/psi-api/index.ts" },
  { area: "Public ledger", goal: "Alter a committed entry without detection.", file: "supabase/functions/commit-action/index.ts" },
  { area: "Unified /v1 API auth", goal: "Notarize or verify without a valid apex_sk_ key.", file: "supabase/functions/psi-api/index.ts" },
  { area: "JCS canonicalization (RFC 8785)", goal: "Two payloads, same hash.", file: "src/lib/psi-canonicalize.ts" },
  { area: "SDK enforcement", goal: "Pass a blocked output through the middleware.", file: "packages/psi-sdk/src/index.ts" },
];

const rules = [
  "Open-source. MIT licensed. Read it, fork it, review it.",
  "Verifiable: every finding must include a reproducible script and a hash that fails to verify on /verify.",
  "Findings are published in the open, with the finder credited.",
  "Accepted findings are credited by name in the IETF draft acknowledgements (current revision).",
  "Dependency advisories are handled separately. This programme covers protocol-level findings.",
];

const Challenge = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>The Standing Challenge — Apex PSI — Universal Verification Protocol</title>
      <meta
        name="description"
        content="US$10,000 standing challenge for a mathematical break of a sealed APEX PSI record. Verification free forever."
      />
    </Helmet>
    <Navbar />

    <main className="pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">

        {/* THE STANDING CHALLENGE */}
        <section className="mb-16 border border-primary/20 rounded-xl bg-card/40 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-4xl font-black tracking-wide text-gold-gradient text-center mb-2">
            THE STANDING CHALLENGE
          </h1>
          <div className="h-px bg-primary/20 my-6" />
          <p className="text-lg sm:text-xl text-center mb-8">
            US$10,000 to the first party that produces a mathematical break of a sealed APEX PSI record.
          </p>

          <div className="space-y-6 text-sm text-muted-foreground">
            <div>
              <p className="text-foreground font-semibold mb-2">What counts as a break (exhaustive):</p>
              <ol className="space-y-2">
                <li className="flex gap-3"><span className="font-mono text-primary">1.</span><span>A SHA-256 collision or second preimage against any sealed record digest published on this site.</span></li>
                <li className="flex gap-3"><span className="font-mono text-primary">2.</span><span>A valid Ed25519 or LMS-W4-SHA256 signature forgery against any published receipt.</span></li>
                <li className="flex gap-3"><span className="font-mono text-primary">3.</span><span>A valid Merkle exclusion proof for any entry this ledger publishes as included.</span></li>
              </ol>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-foreground font-semibold mb-2">What does NOT count as a break:</p>
              <ol className="space-y-2">
                <li className="flex gap-3"><span className="font-mono text-primary">1.</span><span>Website bugs, UI errors, uptime issues or implementation defects. These are reviewed and credited under the Public Review Programme below and SECURITY.md. They are never eligible for the reward.</span></li>
                <li className="flex gap-3"><span className="font-mono text-primary">2.</span><span>Disagreements about interpretation, law or opinion. The challenge is mathematical only.</span></li>
              </ol>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-foreground font-semibold mb-2">Verification of a claimed break:</p>
              <ol className="space-y-2">
                <li className="flex gap-3"><span className="font-mono text-primary">1.</span><span>The claim must be publicly reproducible from published bytes alone.</span></li>
                <li className="flex gap-3"><span className="font-mono text-primary">2.</span><span>The break must reproduce on two independent recomputation pipelines.</span></li>
                <li className="flex gap-3"><span className="font-mono text-primary">3.</span><span>Judgement is performed by the math alone. No person can waive, alter or purchase an outcome.</span></li>
              </ol>
            </div>

            <div className="h-px bg-border" />

            <p>
              The reward is an obligation of ROCKYFILMS888 PTY LTD (ABN 71 672 237 795). It does not affect any other covenant on this site. Money buys process, never outcome.
            </p>

            <div className="h-px bg-primary/20" />
            <p className="text-center text-foreground">The ledger does not judge. It remembers.</p>
          </div>
        </section>

        {/* PROVABLE SILENCE — the mechanic that makes "nobody won it" checkable */}
        <section className="mb-16 border border-gold/20 rounded-xl bg-gold/[0.03] p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-4 text-gold text-xs font-semibold tracking-widest uppercase">
            <Award className="h-4 w-4" /> Provable Silence
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-3 text-foreground">
            “Nobody won it” is a receipt, not a boast.
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
            The weakest part of any standing challenge is the moment it goes quiet. A deleted
            page proves nothing. So the silence here is recorded as an append-only, sealed
            attestation chain under
            <span className="font-mono text-foreground"> PSI-SILENCE/1 </span>
            &mdash; each period&rsquo;s &ldquo;zero valid contests&rdquo; is sealed and linked to the one
            before it, and the chain&rsquo;s Merkle root is anchored to Bitcoin. A stranger needs only
            the public chain and the public anchor to verify, fully offline, that the periods are
            contiguous and no valid contest was ever recorded. Shutting the challenge down is an
            anchored <span className="text-foreground">append</span> (a REVOKED record), never a
            removed page.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-5 text-xs">
            <div className="bg-background/60 border border-border rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Status</div>
              <code className="text-gold">OPEN</code>
            </div>
            <div className="bg-background/60 border border-border rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Accepted contests</div>
              <code className="text-foreground">0 to date</code>
            </div>
            <div className="bg-background/60 border border-border rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Prize if broken</div>
              <code className="text-foreground">US$10,000</code>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Verify the silence yourself, offline &mdash; no account, no server:
          </p>
          <div className="rounded-lg bg-background border border-border p-3 font-mono text-[11px] text-primary break-all select-all mb-4">
            git clone https://github.com/kawal393/APEX-PSI &amp;&amp; cd APEX-PSI &amp;&amp; python challenge/silence.py verify
          </div>
          <a href="https://github.com/kawal393/APEX-PSI/tree/main/challenge" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border border-border rounded px-3 py-1.5 text-xs font-semibold hover:border-gold transition-colors">
            Read the PSI-SILENCE/1 engine <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-1.5 mb-6">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive tracking-widest uppercase">
              Public Review Programme · Open Indefinitely
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-[0.95]">
            <span className="text-chrome-gradient">Review it.</span>
            <br />
            <span className="text-gold-gradient">Or build on it.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            APEX PSI is the open verification protocol for verifiable AI governance.
            Open-source. Signed. Anchored. Public.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-10">
            The protocol asks for no trust. The mathematics is published for independent review:
            every signature, every Merkle proof, every line of the specification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="lg" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" /> Fork the protocol
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link to="/verify">
                <Hash className="h-4 w-4 mr-2" /> Verify the challenge hash
              </Link>
            </Button>
          </div>
        </div>

        {/* Signed review artefact */}
        <section className="rounded-xl border border-primary/20 bg-card/60 p-6 sm:p-8 mb-12">
          <div className="flex items-center gap-2 mb-3 text-primary text-xs font-semibold tracking-widest uppercase">
            <Award className="h-4 w-4" /> Signed Review Artefact
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This hash is committed to the public ledger. If anyone, including the operator, can alter the entry without detection, that is a reportable finding.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-background/60 border border-border rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Predicate</div>
              <code className="break-all">{CHALLENGE_PREDICATE}</code>
            </div>
            <div className="bg-background/60 border border-border rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Hash</div>
              <code className="break-all">{CHALLENGE_HASH}</code>
            </div>
          </div>
        </section>

        {/* Attack surface */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2">
            <Target className="h-6 w-6 text-destructive" />
            <span className="text-chrome-gradient">Review surface</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Six areas open to review. Pick one, reproduce it cleanly, publish the proof.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {surface.map((s) => (
              <div key={s.area} className="border border-border rounded-lg p-4 bg-card/40">
                <div className="text-sm font-bold mb-1">{s.area}</div>
                <div className="text-xs text-muted-foreground mb-2">{s.goal}</div>
                <code className="text-[10px] text-primary/80 break-all">{s.file}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Rules */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-black mb-6">
            <span className="text-gold-gradient">How review works</span>
          </h2>
          <ul className="space-y-3">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="text-primary font-mono">{String(i + 1).padStart(2, "0")}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Doctrine close */}
        <section className="rounded-xl border border-gold/20 bg-gradient-to-br from-card/80 to-card/40 p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-3">Why this is public</p>
          <p className="text-xl sm:text-2xl font-bold mb-2">
            A standard is only as strong as its public review.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Apex PSI is published as infrastructure, not as a claim. A finding that holds up improves the
            specification; an implementation built on it extends the specification. Both are welcome.
          </p>
        </section>
      </div>
      <RedTeamScope />
    </main>

    <Footer />
  </div>
);

export default Challenge;
