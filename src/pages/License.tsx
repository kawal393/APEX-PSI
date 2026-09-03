import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock, Unlock, Scale, Infinity as InfinityIcon, FileCode } from "lucide-react";
import {
  PSI_SCHEMA_ID,
  PSI_SCHEMA_RULES,
  PSI_SCHEMA_COPYRIGHT,
  psiSchemaDigest,
} from "@/lib/psi-schema";

const License = () => {
  const [digest, setDigest] = useState("");

  useEffect(() => {
    psiSchemaDigest().then(setDigest).catch(() => setDigest("unavailable"));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>PSI Licence — Free to Verify, Free to Seal — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="APEX PSI licensing: the verifier is MIT and free forever; sealing is free for all use including commercial and institutional, at any scale. Reserved: the APEX marks and building a competing seal generator."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/license" />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-24">
        <section className="max-w-7xl mx-auto px-4">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-4">Licensing Architecture</p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase leading-[0.95]">
            Free to check.
            <br />
            <span className="text-gold">Free to create.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground">
            The rules of verification belong to everyone, and so does the engine.
            Anyone may verify a PSI seal, and anyone may produce one, anywhere, forever, at no cost.
            What stays reserved is the APEX marks and the right to build a competing seal generator on the schema.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-14 grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-400">
                Verifier — MIT, free forever
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "@apex/psi-verifier — zero dependencies, browser / Node / Deno / Bun / workers",
                "Publishable and vendorable anywhere: npm, PyPI, CDN bundles, AI framework adapters",
                "No key, no account, no rate limit, no permission",
                "Byte-exact conformance checks against PSI-SEAL/1",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <Link to="/verify">
                <Button size="sm" variant="heroOutline">Verify a seal</Button>
              </Link>
              <Link to="/sdk">
                <Button size="sm" variant="ghost">SDKs</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 border-gold/30 bg-gold/5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-gold" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-gold">
                Sealing engine — free, with two reservations
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Free for personal, educational, journalistic and research sealing",
                "Commercial, government and institutional sealing: free - no royalty, no fee",
                "Click-through acceptance at the point of use — recorded inside every seal",
                "Outputs are AS-IS mathematical statements, never a certification of fact",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <a href="/LICENSE-ENGINE.txt" target="_blank" rel="noreferrer">
                <Button size="sm" variant="hero">Read engine licence</Button>
              </a>
              <Link to="/standards/psi-05">
                <Button size="sm" variant="ghost">PSI-05 specification</Button>
              </Link>
            </div>
          </Card>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-14">
          <Card className="p-6 border-border">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase mb-2">
              Conformance enforcement — verifier v1.2.0
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              From v1.1.0 the MIT verifier rejects non-conformant input by default rather than
              merely reporting it, so no pipeline accepts a malformed seal by accident. The
              rejection is deterministic and actionable: it states the canonical schema digest,
              every failed normative rule, and where a conformant seal is produced. Verification
              itself remains free forever, in both the TypeScript and Python distributions, which
              compute an identical schema digest. Since v1.2.0 the rejection text itself is byte-identical
              across both distributions, and every line carries a readable rule citation.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background/60 p-4 text-xs leading-relaxed text-muted-foreground">
{`PSI-SEAL v1.2.0 REJECT: seal is not conformant to PSI-SEAL/1.0.0 — rule 1.1
canonical schema digest: <sha-256 of the normative rule set>
received schema: PSI-SEAL/1.0.0 (digest match: false)
findings:
  PSI-SEAL v1.2.0 REJECT: schema_digest mismatch — rule 4.2
generate a conformant seal: https://ai-governance-standard.com/seal
canonical schema: https://ai-governance-standard.com/.well-known/psi-schema.json
legacy escape hatch (report-only): enforce=false
verified, not asserted; trust the math, not the maker.`}
            </pre>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/seal">
                <Button size="sm" variant="hero">Generate a conformant seal</Button>
              </Link>
              <Link to="/verify">
                <Button size="sm" variant="heroOutline">Verify free</Button>
              </Link>
              <a href="/.well-known/psi-schema.json" target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost">Machine-readable schema</Button>
              </a>
            </div>
          </Card>
        </section>



        <section className="max-w-7xl mx-auto px-4 mt-14">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-5 w-5 text-gold" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase">
                Copyrighted schema — {PSI_SCHEMA_ID}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{PSI_SCHEMA_COPYRIGHT}</p>
            <div className="font-mono text-[11px] bg-muted/40 rounded p-3 mb-5 break-all">
              schema_digest = <span className="text-emerald-400">{digest || "computing…"}</span>
            </div>
            <ol className="space-y-2 text-sm font-mono text-muted-foreground">
              {PSI_SCHEMA_RULES.map((r) => (
                <li key={r} className="border-l-2 border-border pl-3">{r}</li>
              ))}
            </ol>
            <p className="mt-5 text-sm">
              <strong>Only schema-conformant seals are considered PSI-compliant.</strong> Output that
              deviates from these rules — even if functionally similar — fails verification, because the
              verifier checks the schema identifier and byte-exact conformity, not intent.
            </p>
            <div className="mt-4 flex gap-2">
              <a href="/.well-known/psi-schema.json" target="_blank" rel="noreferrer">
                <Button size="sm" variant="heroOutline">Machine-readable schema</Button>
              </a>
              <Link to="/spec">
                <Button size="sm" variant="ghost">Full technical spec</Button>
              </Link>
            </div>
          </Card>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-14 grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-5 w-5 text-gold" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase">Nature of output</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              A seal records that specific bytes existed in a specific state at a specific time. It is
              not a statement that the sealed content is true, lawful or accurate. Where an assessment
              is expressed, it is a <strong>Modelled Opinion</strong>, labelled as such, provided AS-IS
              with no warranty.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <InfinityIcon className="h-5 w-5 text-gold" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase">Perpetuity</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              The schema copyright and licence terms are irrevocably assigned to the APEX PSI Foundation
              (in formation) as perpetual steward, on the binding condition that verification remains MIT
              and free forever, that sealing remains free for all use at any scale, that the schema is
              never narrowed in a way that breaks existing seals, and that the APEX marks remain reserved
              and may not be applied to any product without a written licence. The terms survive the author.
            </p>
            <Link to="/foundation" className="text-gold text-sm hover:underline mt-3 inline-block">
              Foundation charter →
            </Link>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default License;
