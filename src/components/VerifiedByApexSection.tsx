import { useState } from "react";
import { Check, Copy } from "lucide-react";

const DEMOS = [
  { name: "Example Trader Pty Ltd", hash: "1e9e62eda2ada5242542594b457f21a2429d5943065a82b97067f2d91637bcfb" },
  { name: "Example Robotics Pty Ltd", hash: "9e5c7ed98491e6f0dd9347433cc32796208370f80c4c15a068aae471ff6c8fb0" },
  { name: "Example Health AI Pty Ltd", hash: "5a6c6328cf32512bb0963628ff34e93dd8ddb2b0ca85ffc110e7e5f2f44c2471" },
];

const snippetFor = (name: string, hash: string) =>
  `<script src="https://ai-governance-standard.com/badge.js" data-name="${name}" data-hash="${hash}" async></script>`;

const VerifiedByApexSection = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (hash: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(hash);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="border-t border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-4">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          Verified by Apex PSI
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          One line of HTML. A verifiable badge.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Layout demonstration only. These three names are invented and these three hashes have not
          been sealed, so each link opens a page stating that no ledger entry exists. That page is the
          protocol behaving correctly: it refuses to attest to anything it has not seen. A real badge
          attests the existence and integrity of a sealed digest — never the truth of any claim, and
          never an endorsement of the company named.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMOS.map(({ name, hash }) => {
            const snippet = snippetFor(name, hash);
            return (
              <div key={hash} className="rounded-md border border-border bg-card/50 p-5">
                <div className="flex items-center justify-center rounded border border-primary/40 bg-background/60 px-3 py-4">
                  <div className="text-center">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                      Verified by Apex
                    </p>
                    <p className="mt-1 text-sm font-semibold">{name}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">{hash.slice(0, 16)}…</p>
                  </div>
                </div>

                <pre className="mt-4 overflow-x-auto rounded border border-border bg-background/80 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {snippet}
                </pre>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <a
                    href={`https://www.ai-governance-standard.com/r/${hash}`}
                    className="font-mono text-[10px] uppercase tracking-wider text-primary underline underline-offset-2"
                  >
                    View record →
                  </a>
                  <button
                    onClick={() => copy(hash, snippet)}
                    className="flex items-center gap-1 rounded border border-primary/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
                  >
                    {copied === hash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === hash ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VerifiedByApexSection;
