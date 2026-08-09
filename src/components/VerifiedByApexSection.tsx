import { useState } from "react";
import { Check, Copy } from "lucide-react";

const DEMOS = [
  { name: "Northgate Capital", hash: "3f9c1a7d5be24c08a1f6d3b920e7c45188aa02de6f31b7c4905ed2a17b6f3c81" },
  { name: "Helios Robotics", hash: "b71e04c9d5a8236f0c94ae17d3f6520b8e4c1a97ff02d6b3517ea9c840d2b6f5" },
  { name: "Meridian Health AI", hash: "d24a86f0b3c517e9ad0f24b7c6851390fe27b4d5a91c60e8f3b7d215ca94e076" },
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
          Illustrative examples. Each badge resolves to a public verification record; it attests
          existence and integrity, not the truth of any claim.
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
                    href={`https://apex-infrastructure.com/verify/${hash}`}
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
