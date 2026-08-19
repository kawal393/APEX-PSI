import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plug, Radio, Handshake, Map } from "lucide-react";
import { SITE_URL, CONTACT_EMAIL } from "@/lib/site";

const CHANNELS = [
  {
    title: "REST API /v1",
    body: "Notarize and verify from any language or platform with a scoped API key. One call in, a signed receipt out.",
    to: "/api",
    cta: "API docs",
  },
  {
    title: "Runtime adapters",
    body: "Published packages for the OpenAI SDK, Anthropic SDK, Vercel AI SDK and Hono. Every model call emits evidence with no code rewrite.",
    to: "/sdk",
    cta: "Install an adapter",
  },
  {
    title: "Compliance-Receipt HTTP header",
    body: "A transport-level marking any server can emit and any client can check offline, per draft-singh-psi-http-01.",
    to: "/header",
    cta: "Inspect a header",
  },
  {
    title: "Agent integrations (MCP)",
    body: "An OAuth-protected Model Context Protocol server so Claude, ChatGPT and Cursor can verify hashes and read ledger statistics directly.",
    to: "/api",
    cta: "Connect an agent",
  },
  {
    title: "Embeddable seal widget",
    body: "Drop a script tag on any site or product page so visitors can seal and verify files without leaving it.",
    to: "/seal",
    cta: "Get the widget",
  },
  {
    title: "Verification badge",
    body: "A signed public badge that links back to a live receipt. Distribution that markets itself from your customers' pages.",
    to: "/badge",
    cta: "Generate a badge",
  },
  {
    title: "CI/CD gates",
    body: "GitHub Actions and pre-deploy checks that block unsealed model releases and record the decision.",
    to: "/sdk",
    cta: "Pipeline guide",
  },
  {
    title: "Procurement registry",
    body: "A public, checkable listing buyers and regulators can query before signing a vendor contract.",
    to: "/registry/check",
    cta: "Run a vendor check",
  },
];

const ROADMAP = [
  {
    phase: "Now",
    items: [
      "Adapter coverage for every major model SDK",
      "Public receipt pages indexed for every seal",
      "Partner referral program with revenue share",
    ],
  },
  {
    phase: "Next",
    items: [
      "IETF working-group adoption of the header draft",
      "Independent verifier nodes operated by third parties",
      "Turnkey white-label deployment for auditors and law firms",
    ],
  },
  {
    phase: "Later",
    items: [
      "Reference implementations in package managers and OS distributions",
      "Hardware and firmware level attestation hooks",
      "Foundation-governed conformance test suite",
    ],
  },
];

const Integrations = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>Integrations & Partner Program — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Every way to wire APEX PSI into your stack: REST API, model SDK adapters, the Compliance-Receipt HTTP header, MCP agent access, embeddable widgets, CI/CD gates and the procurement registry."
      />
      <link rel="canonical" href={`${SITE_URL}/integrations`} />
      <meta property="og:title" content="Integrations & Partner Program — APEX PSI" />
      <meta
        property="og:description"
        content="APIs, SDK adapters, HTTP headers, MCP agent access and embeddable widgets for verifiable AI governance evidence."
      />
      <meta property="og:url" content={`${SITE_URL}/integrations`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <Navbar />

    <main className="pt-16">
      <section className="py-16 px-4 border-b border-border">
        <div className="container mx-auto max-w-7xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
            Distribution Layer
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-5 max-w-4xl">
            <span className="text-chrome-gradient">Integrate Once.</span>{" "}
            <span className="text-gold-gradient">Be Verifiable Everywhere.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            APEX PSI is an open protocol, not a walled product. Every surface below is documented,
            free to implement and independently checkable — which is exactly why it spreads.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-8">
            <Plug className="h-4 w-4 text-gold" />
            <h2 className="text-xs font-black uppercase tracking-widest">Integration surfaces</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {CHANNELS.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-border bg-card/40 p-5 flex flex-col"
              >
                <h3 className="text-sm font-black uppercase tracking-wide mb-2">{c.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{c.body}</p>
                <Link
                  to={c.to}
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gold hover:underline"
                >
                  {c.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-y border-border bg-card/20">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-8">
            <Handshake className="h-4 w-4 text-gold" />
            <h2 className="text-xs font-black uppercase tracking-widest">
              Ways to appear alongside us
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                t: "Implementer listing",
                b: "Ship the protocol in your product and be listed publicly as an implementer, with a live receipt as proof.",
                to: "/registry",
              },
              {
                t: "Referral partner",
                b: "Resellers, auditors and consultancies earn revenue share on services they introduce.",
                to: "/partner",
              },
              {
                t: "Verifier node",
                b: "Operate an independent mirror of the evidence ledger under the foundation programme.",
                to: "/foundation",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-border bg-background/60 p-6">
                <h3 className="text-sm font-black uppercase tracking-wide mb-2">{x.t}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{x.b}</p>
                <Link
                  to={x.to}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gold hover:underline"
                >
                  Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-muted-foreground max-w-3xl leading-relaxed">
            Listings describe verifiable technical relationships only. APEX PSI does not publish
            partner, sponsor or endorsement claims without a signed written agreement from the
            named organisation.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-8">
            <Map className="h-4 w-4 text-gold" />
            <h2 className="text-xs font-black uppercase tracking-widest">Roadmap</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {ROADMAP.map((r) => (
              <div key={r.phase} className="rounded-xl border border-border bg-card/40 p-6">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
                  {r.phase}
                </p>
                <ul className="space-y-2.5">
                  {r.items.map((i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-gold">—</span>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-8 md:p-12 text-center">
            <Radio className="h-8 w-8 text-gold mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
              Wire your platform into the standard
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
              Bring an API key, a header or an SDK adapter. We will help you get the first signed
              receipt out of your stack.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/api">Get an API key</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href={`mailto:${CONTACT_EMAIL}?subject=APEX%20PSI%20integration`}>
                  Talk to us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Integrations;
