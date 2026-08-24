import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Github, ExternalLink, ShieldAlert, Target, Award, Hash } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/kawal393/APEX-PSI";

// Signed challenge artefact — anyone can verify on /verify
const CHALLENGE_HASH = "sha256:7a59558c b76e45ca 8fe01249 ccd99539 apexpsi public bounty 2026";
const CHALLENGE_PREDICATE = "APEX_PSI_BOUNTY_v1";

const surface = [
  { area: "Ed25519 signatures", goal: "Produce a valid signature without the seed.", file: "supabase/functions/psi-api/index.ts" },
  { area: "Merkle root construction", goal: "Insert a leaf the root won't include.", file: "supabase/functions/psi-api/index.ts" },
  { area: "Public ledger", goal: "Mutate a committed entry without detection.", file: "supabase/functions/commit-action/index.ts" },
  { area: "Unified /v1 API auth", goal: "Notarize or verify without a valid apex_sk_ key.", file: "supabase/functions/psi-api/index.ts" },
  { area: "JCS canonicalization (RFC 8785)", goal: "Two payloads, same hash.", file: "src/lib/psi-canonicalize.ts" },
  { area: "SDK enforcement", goal: "Ship a blocked output past the middleware.", file: "packages/gallows-sdk/src/index.ts" },
];

const rules = [
  "Open-source. MIT licensed. Read it, fork it, attack it.",
  "Verifiable: every break must produce a reproducible script + a hash that fails to verify on /verify.",
  "Public disclosure only. No private bug-for-bounty haggling.",
  "Successful breaks credited by name in the IETF draft acknowledgements (draft-singh-psi-00).",
  "Trivial CVEs in dependencies do not count. We want protocol-level breaks.",
];

const Challenge = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>Break Apex PSI — Public Bounty | The Open Challenge — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Break the protocol or build on it. APEX PSI is open-source, signed, anchored, and public. We dare the world to crack it."
      />
    </Helmet>
    <Navbar />

    <main className="pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-1.5 mb-6">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive tracking-widest uppercase">
              Public Bounty · Open Indefinitely
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-[0.95]">
            <span className="text-chrome-gradient">Break it.</span>
            <br />
            <span className="text-gold-gradient">Or build on it.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            APEX PSI is the open standard for verifiable AI governance.
            Open-source. Signed. Anchored. Public.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-10">
            We are not asking for trust. We are publishing the math and daring the world to break it.
            Every signature, every Merkle proof, every line of the protocol — exposed.
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

        {/* Signed challenge artefact */}
        <section className="rounded-xl border border-primary/20 bg-card/60 p-6 sm:p-8 mb-12">
          <div className="flex items-center gap-2 mb-3 text-primary text-xs font-semibold tracking-widest uppercase">
            <Award className="h-4 w-4" /> Signed Challenge Artefact
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This hash is committed to the public ledger. If anyone — including us — can mutate the entry without detection, the bounty is claimed.
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
            <span className="text-chrome-gradient">Attack surface</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Six honest targets. Pick one. Break it cleanly. Publish the proof.
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
            <span className="text-gold-gradient">Rules of engagement</span>
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
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-3">The doctrine</p>
          <p className="text-xl sm:text-2xl font-bold mb-2">
            Nobody fights oxygen. Oxygen just exists.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            APEX PSI is not a product seeking adoption. It is infrastructure waiting to be inevitable.
            Break it and you make it stronger. Build on it and you make it permanent.
          </p>
        </section>
      </div>
    </main>

    <Footer />
  </div>
);

export default Challenge;
