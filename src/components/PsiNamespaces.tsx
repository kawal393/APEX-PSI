import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { PSI_NAMESPACES, PSI_NAMESPACE_LINE } from "@/data/psiConstitution";

/** The namespaces — AI governance is the first use, never the limit. */
const PsiNamespaces = () => (
  <section id="namespaces" className="px-4 py-20">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        Namespaces
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
        One protocol. Infinite evidence.
      </h2>
      <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground">
        {PSI_NAMESPACE_LINE}
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PSI_NAMESPACES.map((ns) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-gold break-all">
                  {ns.code}
                </span>
                <StatusBadge status={ns.status} />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{ns.label}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{ns.what}</p>
            </>
          );
          return ns.href ? (
            <Link
              key={ns.code}
              to={ns.href}
              className="rounded-lg border border-border bg-card/40 p-5 hover:border-gold/50 transition-colors"
            >
              {inner}
            </Link>
          ) : (
            <div key={ns.code} className="rounded-lg border border-border/60 bg-card/20 p-5">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default PsiNamespaces;
