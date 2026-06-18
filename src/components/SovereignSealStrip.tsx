import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ApexVerifiedStamp from "./ApexVerifiedStamp";

const TRUTHS = [
  "Truth is not opinion. It is anchored.",
  "Three nodes. One reality. Zero permission.",
  "Bitcoin secures the seal. Mathematics secures the verdict.",
  "What is sealed cannot be unsealed. What is anchored cannot be erased.",
];

// Approx live Bitcoin block height (auto-advances ~1 per 10 min from a known anchor).
const BTC_ANCHOR_BLOCK = 925000;
const BTC_ANCHOR_TS = Date.UTC(2026, 5, 18, 0, 0, 0); // June 18, 2026 UTC

const liveBlockHeight = () => {
  const elapsedMin = (Date.now() - BTC_ANCHOR_TS) / 60000;
  return BTC_ANCHOR_BLOCK + Math.max(0, Math.floor(elapsedMin / 10));
};

const SovereignSealStrip = () => {
  const [truthIdx, setTruthIdx] = useState(0);
  const [block, setBlock] = useState(liveBlockHeight());
  const [seal, setSeal] = useState<string>("");

  useEffect(() => {
    const i = setInterval(() => setTruthIdx((n) => (n + 1) % TRUTHS.length), 4500);
    const b = setInterval(() => setBlock(liveBlockHeight()), 30000);
    // Generate a fresh demo SHA-256 of the current second (browser-side, no network).
    (async () => {
      const enc = new TextEncoder().encode(`apex-sovereign-seal:${Math.floor(Date.now() / 1000)}`);
      const digest = await crypto.subtle.digest("SHA-256", enc);
      setSeal(Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join(""));
    })();
    return () => {
      clearInterval(i);
      clearInterval(b);
    };
  }, []);

  return (
    <section className="relative border-y border-gold/20 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 4%), hsl(0 0% 6%) 50%, hsl(0 0% 4%))" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 30%, hsl(43 85% 52% / 0.08), transparent 60%)" }} />

      <div className="container mx-auto max-w-7xl px-4 py-14 md:py-20 relative">
        <div className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center">
          {/* Left: the inevitable truth */}
          <div>
            <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.35em] text-gold/80 mb-4">
              The Sovereign Seal · Operational
            </p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black leading-[0.95] tracking-tight mb-6">
              <span className="text-chrome-gradient">The world will not be</span>
              <br />
              <span className="text-gold-gradient">asked. It will be sealed.</span>
            </h2>

            <motion.p
              key={truthIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-base md:text-xl text-foreground/90 font-semibold tracking-wide mb-8 max-w-2xl"
            >
              {TRUTHS[truthIdx]}
            </motion.p>

            {/* Tri-node lattice — visible equilibrium */}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {[
                { id: "PSI", label: "The Mind", role: "Compliance Engine" },
                { id: "INFRA", label: "The Body", role: "Infrastructure Backbone" },
                { id: "SHIELD", label: "The Shield", role: "Consumer Protection" },
              ].map((n, idx) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="rounded-md border border-gold/25 bg-background/60 backdrop-blur p-3"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400">SYNC</span>
                  </div>
                  <p className="text-sm font-black text-gold tracking-wide">{n.id}</p>
                  <p className="text-[10px] text-foreground/70 font-semibold">{n.label}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{n.role}</p>
                </motion.div>
              ))}
            </div>

            <p className="mt-6 text-[10px] md:text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
              Three nodes · One ledger · Continuous bi-directional equilibrium
            </p>
          </div>

          {/* Right: the seal itself */}
          <div className="flex flex-col items-center gap-4">
            <ApexVerifiedStamp hash={seal} btcBlock={block.toLocaleString()} size="lg" />
            <div className="text-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">Live Bitcoin Anchor</p>
              <p className="text-2xl font-black text-foreground tabular-nums">#{block.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                Every artifact · Every output · Sealed
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SovereignSealStrip;
