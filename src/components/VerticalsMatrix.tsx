import { Link } from "react-router-dom";
import { DOMAIN_PROFILES } from "@/data/domainProfiles";

export default function VerticalsMatrix() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16" aria-labelledby="verticals-h">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">One receipt format</p>
      <h2 id="verticals-h" className="mt-2 text-3xl md:text-5xl font-black uppercase">Thirteen verticals</h2>
      <div className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {DOMAIN_PROFILES.map((p) => (
          <Link key={p.id} to={`/verticals#${p.id}`} className="bg-background p-4 hover:bg-card">
            <p className="font-mono text-[11px] text-gold">{p.id}</p>
            <p className="mt-1 text-sm uppercase tracking-wider">{p.vertical}</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{p.status}</p>
          </Link>
        ))}
        <Link to="/verticals" className="bg-background p-4 hover:bg-card flex items-center font-mono text-xs uppercase tracking-wider text-gold">All profiles →</Link>
      </div>
    </section>
  );
}
