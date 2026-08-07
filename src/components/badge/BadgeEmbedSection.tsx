import { useState } from "react";
import { Code2, ShieldCheck } from "lucide-react";
import CopyBlock from "@/components/CopyBlock";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";

const PLACEHOLDER = "YOUR_SHA256_HASH";

const buildOptions = (hash: string) => [
  {
    id: "image",
    title: "Option 1 — Simple image badge",
    note: "Static, zero JavaScript. Links straight to the public verification page.",
    code: `<!-- APEX PSI Verified -->
<a href="${SITE_URL}/verify?hash=${hash}" target="_blank" rel="noopener">
  <img src="${SITE_URL}/apex-verified-badge.svg"
       alt="APEX PSI Verified" width="220" height="40" />
</a>`,
  },
  {
    id: "iframe",
    title: "Option 2 — Live iframe badge",
    note: "Renders real-time verification status for the hash on every page load.",
    code: `<!-- APEX PSI live badge -->
<iframe src="${SITE_URL}/embed/seal?hash=${hash}"
        width="320" height="120" frameborder="0" loading="lazy"
        style="border:0;border-radius:10px;overflow:hidden"
        title="APEX PSI verification status"></iframe>`,
  },
  {
    id: "widget",
    title: "Option 3 — JavaScript widget",
    note: "Auto-verifies against the public API and updates the badge in place.",
    code: `<!-- APEX PSI widget -->
<div id="apex-psi-badge" data-hash="${hash}"></div>
<script>
(async () => {
  const el = document.getElementById("apex-psi-badge");
  const hash = el.dataset.hash;
  const res = await fetch("${SITE_URL}/api/v1/verify?hash=" + hash);
  const data = await res.json().catch(() => ({}));
  const ok = data && (data.verified === true || data.found === true);
  el.innerHTML =
    '<a href="${SITE_URL}/verify?hash=' + hash + '" target="_blank" rel="noopener" ' +
    'style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;' +
    'background:#0b0d10;border:1px solid ' + (ok ? "#c9a227" : "#3a3a3a") + ';color:#e6e6e6;' +
    'font:600 12px ui-monospace,Menlo,monospace;text-decoration:none">' +
    (ok ? "&#10003; APEX PSI VERIFIED" : "APEX PSI &middot; UNVERIFIED") + "</a>";
})();
</script>`,
  },
];

const BadgePreview = ({ verified = true }: { verified?: boolean }) => (
  <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-center">
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] font-bold ${
        verified ? "border border-gold/60 bg-[#0b0d10] text-gold" : "border border-border bg-[#0b0d10] text-muted-foreground"
      }`}
    >
      <ShieldCheck className="h-3.5 w-3.5" /> {verified ? "APEX PSI VERIFIED" : "APEX PSI · UNVERIFIED"}
    </span>
  </div>
);

/** Copy-paste embed codes for the APEX Verified badge. */
const BadgeEmbedSection = () => {
  const [hashInput, setHashInput] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  const options = buildOptions(PLACEHOLDER);
  const generatedOptions = generated ? buildOptions(generated) : [];

  return (
    <section className="mt-16">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black mb-2 inline-flex items-center gap-2">
          <Code2 className="h-5 w-5 text-gold" /> Embeddable Verified Badge
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Three ways to display verification on your own site. Replace{" "}
          <span className="font-mono text-foreground">{PLACEHOLDER}</span> with the SHA-256 hash of your sealed
          record. The badge attests that a record exists and verifies — not that its claims are true.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {options.map((o, i) => (
          <div key={o.id} className="rounded-xl border border-border bg-card/70 p-4 flex flex-col">
            <h3 className="text-sm font-black text-foreground mb-1">{o.title}</h3>
            <p className="text-xs text-muted-foreground mb-3 flex-1">{o.note}</p>
            <div className="mb-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-1.5">Preview</p>
              <BadgePreview verified={i !== 2} />
            </div>
            <CopyBlock code={o.code} multiline />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Hint: replace <span className="font-mono">{PLACEHOLDER}</span> with your own hash.
            </p>
          </div>
        ))}
      </div>

      {/* Generator */}
      <div className="mt-8 rounded-xl border border-gold/40 bg-gold/[0.05] p-5">
        <h3 className="text-base font-black mb-2">Generate badge for my seal</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Paste your receipt hash and get all three embed snippets pre-filled.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = hashInput.trim();
            if (v) setGenerated(v);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Input
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="Paste your SHA-256 hash or receipt ID"
            className="bg-background border-border font-mono text-xs"
          />
          <Button variant="hero" type="submit" className="shrink-0">
            Generate
          </Button>
        </form>

        {generated && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {generatedOptions.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-card/70 p-4">
                <h4 className="text-xs font-black text-foreground mb-2">{o.title}</h4>
                <CopyBlock code={o.code} multiline />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BadgeEmbedSection;
