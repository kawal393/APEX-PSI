import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type Tier = {
  label: string;
  note: string;
  items: string[];
};

const TIERS: Tier[] = [
  {
    label: "Standards we implement",
    note: "Published specifications the protocol conforms to",
    items: [
      "IETF Internet-Drafts",
      "RFC 8785 (JCS)",
      "NIST SP 800-208 (LMS)",
      "FIPS 204 (ML-DSA)",
      "C2PA content credentials",
      "Model Context Protocol",
      "OpenTimestamps",
      "W3C WebAuthn",
    ],
  },
  {
    label: "Infrastructure we run on",
    note: "Production systems carrying live traffic and evidence",
    items: ["Cloudflare", "Supabase", "Stripe", "GitHub", "npm", "Bitcoin", "Polygon", "Resend"],
  },
  {
    label: "Drop-in integrations available",
    note: "Published adapters and endpoints any team can wire in today",
    items: [
      "OpenAI SDK",
      "Anthropic SDK",
      "Vercel AI SDK",
      "Hono",
      "Claude / ChatGPT / Cursor (MCP)",
      "GitHub Actions",
      "REST API /v1",
      "Embeddable seal widget",
    ],
  },
];

const EcosystemStrip = () => (
  <section className="py-16 px-4 border-y border-border bg-card/20">
    <div className="container mx-auto max-w-7xl">
      <div className="mb-10 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">
          Interoperability Surface
        </p>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
          <span className="text-chrome-gradient">Built On Open Standards.</span>{" "}
          <span className="text-gold-gradient">Wired Into Everything.</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto">
          APEX PSI does not ask for permission to interoperate. It implements published
          specifications and ships adapters, so any stack can produce and check verifiable
          governance evidence.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div key={tier.label} className="rounded-xl border border-border bg-background/60 p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-1">
              {tier.label}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">{tier.note}</p>
            <ul className="flex flex-wrap gap-2">
              {tier.items.map((item) => (
                <li
                  key={item}
                  className="rounded border border-border bg-card px-2.5 py-1 text-[11px] font-mono text-foreground/80"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-5">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
          <span className="text-foreground/80 font-semibold">Accuracy notice:</span> the names above
          identify standards, infrastructure and software that APEX PSI implements, runs on or
          integrates with. They are not partners, sponsors or endorsers, and no affiliation is
          claimed. Trademarks belong to their respective owners.
        </p>
        <Link
          to="/integrations"
          className="shrink-0 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gold hover:underline"
        >
          Integration directory <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </section>
);

export default EcosystemStrip;
