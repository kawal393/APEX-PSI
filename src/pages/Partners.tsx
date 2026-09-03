import { Helmet } from "react-helmet-async";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Copy } from "lucide-react";

const BADGE_SNIPPET =
  '<script src="https://ai-governance-standard.com/badge.js" data-name="Your Company" data-hash="YOUR_RECORD_HASH" async></script>';
const NPM_SNIPPET = "npm install @apex/psi-sdk";

const CopyBox = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <pre className="overflow-x-auto rounded border border-border bg-background/80 p-3 font-mono text-[11px] text-muted-foreground">
        {code}
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="mt-2 flex items-center gap-1 rounded border border-primary/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const Partners = () => (
  <>
    <Helmet>
      <title>Partners — Verified, Integrated and Powered by Apex PSI — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Three ways to appear alongside APEX PSI: display a verification badge, integrate the SDK, or apply as a Tier-1 partner."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/partners" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Partners</p>
        <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Three ways to stand next to the protocol
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Listings describe technical use of an open protocol. They are not endorsements,
          certifications, or claims of legal affiliation in either direction.
        </p>

        <section className="mt-12 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Verified by Apex</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Publish a badge that resolves to a public verification record for a hash you control.
          </p>
          <div className="mt-4 inline-flex items-center rounded border border-primary/40 bg-background/60 px-4 py-3">
            <div className="text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Verified by Apex</p>
              <p className="mt-1 text-sm font-semibold">Your Company</p>
              <p className="font-mono text-[9px] text-muted-foreground">YOUR_RECORD_HASH</p>
            </div>
          </div>
          <CopyBox code={BADGE_SNIPPET} />
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Integrated with Apex PSI</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Install the open-source SDK or a runtime adapter and emit signed receipts from your own stack.
          </p>
          <CopyBox code={NPM_SNIPPET} />
          <a
            href="https://github.com/kawal393/APEX-PSI"
            className="mt-4 inline-flex items-center gap-2 rounded border border-primary/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
          >
            ★ Star on GitHub
          </a>
        </section>

        <section className="mt-8 rounded-md border border-border bg-card/40 p-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Powered by Apex</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tier-1 partners operate verifier nodes or embed the protocol in a regulated workflow.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-20 items-center justify-center rounded border border-dashed border-border font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
              >
                Open slot
              </div>
            ))}
          </div>
          <a
            href="/submit-a-matter"
            className="mt-6 inline-block rounded border border-primary/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
          >
            First partner pending — apply now →
          </a>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default Partners;
