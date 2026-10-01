import { Link } from "react-router-dom";

const PILLARS = [
  { title: "Shared record", body: "Two organisations can check the same receipt and reach the same answer, without trusting each other's internal systems." },
  { title: "Accountable automation", body: "Actions taken by software and AI agents can carry a receipt showing what was committed, by which key, and when." },
  { title: "Open to everyone", body: "The specification and verifier are free and work offline. Hosted sealing at higher volume is an optional paid service." },
];

export default function PlainLanguageIntro() {
  return (
    <section aria-labelledby="what-is-psi" className="mx-auto max-w-7xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">In plain words</p>
      <h2 id="what-is-psi" className="mt-2 text-2xl md:text-4xl font-black uppercase">What is APEX PSI?</h2>
      <p className="mt-4 max-w-3xl text-base text-muted-foreground">
        More and more decisions in the economy are made by software: payments, trades, deliveries, medical records and AI agents.
        When something goes wrong, people need a way to check what was actually recorded, and whether it was changed afterwards.
      </p>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground">
        APEX PSI is an open protocol for tamper-evident receipts. A receipt fixes the exact contents of a record, who signed it and when.
        Anyone can check it later with free tools. It proves integrity and timing, not whether the content itself is true.
      </p>
      <div className="mt-8 grid gap-px bg-border md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="bg-background p-5">
            <p className="font-mono text-sm font-bold uppercase text-gold">{p.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 font-mono text-xs uppercase tracking-wider">
        <Link to="/verify" className="text-gold underline underline-offset-2">Check a receipt</Link>
        <Link to="/verticals" className="text-gold underline underline-offset-2">See industries</Link>
        <Link to="/products" className="text-gold underline underline-offset-2">Plans</Link>
      </div>
    </section>
  );
}
