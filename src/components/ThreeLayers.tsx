import { Link } from "react-router-dom";

const LAYERS = [
  {
    icon: "🔏",
    name: "The Mirror Library",
    state: "Truth is Recorded",
    body:
      "Immutable timestamped receipts. Nothing but hash, source URL, and block height. No content stored. No metadata stored. Pure facts. Forever verifiable.",
    quote: "The ledger does not judge. It remembers.",
    to: "/verify",
    cta: "Verify a receipt",
  },
  {
    icon: "👁️",
    name: "The Perception Layer",
    state: "Truth is Seen — Coming Soon",
    body:
      "Open-source browser extension. Local computation. Zero-metadata queries. Verify anything, anywhere, without leaving a trace. Not built yet — nothing to download.",
    quote: "Not a filter. A lens. What was always there, now visible.",
    to: null,
    cta: null,
  },
  {
    icon: "⚖️",
    name: "The Inverse Standard",
    state: "Truth is Adopted",
    body:
      "The public record. Neutral. Sorted by first seal date. Pressure comes from peers above, not from us below.",
    quote: "No one wants to be last. Everyone wants to be first. Gravity does the rest.",
    to: "/registry",
    cta: "/registry",
  },
];

const ThreeLayers = () => (
  <section className="py-20 px-4 border-t border-border/60" aria-label="The three layers">
    <div className="container mx-auto max-w-6xl">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
        🔒 Recorded · 👁️ Seen · ⚖️ Adopted
      </p>
      <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight mb-12">
        The Three Layers of the Truth Cycle
      </h2>

      <div className="grid md:grid-cols-3 gap-5">
        {LAYERS.map((l) => (
          <div key={l.name} className="rounded-lg border border-border bg-card/40 p-6 flex flex-col">
            <span aria-hidden className="text-2xl">{l.icon}</span>
            <h3 className="mt-3 text-lg font-black uppercase tracking-tight">{l.name}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{l.state}</p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed flex-1">{l.body}</p>
            <p className="mt-4 text-xs italic text-foreground/70">“{l.quote}”</p>
            {l.to && (
              <Link to={l.to} className="mt-4 font-mono text-xs text-gold hover:underline">
                {l.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-foreground/80">
        One protocol. One cycle. Forever free.
      </p>
    </div>
  </section>
);

export default ThreeLayers;
