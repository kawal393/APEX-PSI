import { Link } from "react-router-dom";

const GrandHero = () => {
  return (
    <section
      aria-label="The world's first and only global open protocol for digital truth"
      className="relative border-b border-gold/20 bg-background px-4 pb-20 pt-16 text-center md:pb-28 md:pt-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-gold md:text-sm md:tracking-[0.7em]">
          The World's First &amp; Only
        </p>

        <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-foreground md:text-8xl lg:text-9xl">
          Global Open Standard
          <span className="mt-2 block bg-gradient-to-b from-gold via-gold/90 to-gold/50 bg-clip-text text-transparent">
            &amp; Protocol for Digital Truth
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground md:text-sm">
          The world's first. Open sourced. Free forever.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/protocol"
            className="w-full border border-gold bg-gold px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-background transition-colors hover:bg-transparent hover:text-gold sm:w-auto"
          >
            The Protocol
          </Link>
          <Link
            to="/engine"
            className="w-full border border-gold/40 px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-gold transition-colors hover:border-gold hover:bg-gold/10 sm:w-auto"
          >
            Straight to the Engine
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GrandHero;
