import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const PROJECT_STARTED_AT = new Date("2026-02-27T11:02:00Z").getTime();

const getElapsed = (now: number) => {
  const totalSeconds = Math.max(0, Math.floor((now - PROJECT_STARTED_AT) / 1000));

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
};

const ActiveSinceClock = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = useMemo(() => getElapsed(now), [now]);
  const units = [
    { label: "Days", value: elapsed.days },
    { label: "Hours", value: elapsed.hours },
    { label: "Minutes", value: elapsed.minutes },
    { label: "Seconds", value: elapsed.seconds },
  ];

  return (
    <div className="mx-auto mt-7 w-full max-w-2xl border-y border-gold/20 py-4" aria-live="off">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.32em] text-gold sm:text-[10px]">
        Active since 27 February 2026 · 11:02 UTC
      </p>
      <div className="mt-3 grid grid-cols-4" aria-label="Time active">
        {units.map(({ label, value }, index) => (
          <div
            key={label}
            className={index > 0 ? "border-l border-gold/20 px-1 sm:px-4" : "px-1 sm:px-4"}
          >
            <span className="block font-mono text-lg font-semibold tabular-nums text-foreground sm:text-2xl">
              {label === "Days" ? value : String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[9px] sm:tracking-[0.2em]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GrandHero = () => {
  return (
    <section
      aria-label="The first global open protocol for digital truth — the proof layer of the AI economy"
      className="relative border-b border-gold/20 bg-background px-4 pb-14 pt-12 text-center md:pb-20 md:pt-16"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-gold md:text-sm md:tracking-[0.7em]">
          The First
        </p>

        <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-7xl lg:text-8xl">
          Global Open Protocol
          <span className="mt-2 block bg-gradient-to-b from-gold via-gold/90 to-gold/50 bg-clip-text text-transparent">
            for Digital Truth
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground md:text-sm">
          The Proof Layer of the AI Economy. Open sourced. Free forever.
        </p>

        <ActiveSinceClock />

        <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#demo"
            className="w-full border border-gold bg-gold px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-background transition-colors hover:bg-transparent hover:text-gold sm:w-auto"
          >
            Watch It Work
          </a>
          <a
            href="#seal"
            className="w-full border border-gold/40 px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-gold transition-colors hover:border-gold hover:bg-gold/10 sm:w-auto"
          >
            Do It Yourself
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            to="/protocol"
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-gold"
          >
            Read the Protocol
          </Link>
          <Link
            to="/engine"
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-gold"
          >
            Open the Engine
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GrandHero;
 