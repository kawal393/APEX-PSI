import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Terminal, Upload, FileCheck, ArrowRight } from "lucide-react";

const HowToUse = () => {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden" id="how-to-use">
      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[10px] sm:text-xs font-black tracking-[0.35em] uppercase text-gold mb-3">
            How to use APEX
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[0.95]">
            <span className="text-chrome-gradient">Two paths.</span>{" "}
            <span className="text-gold-gradient">Same root of truth.</span>
          </h2>
        </motion.div>

        {/* Track A — Developers / AI operators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-900/40 to-background p-6 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="h-6 w-6 text-primary" />
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-primary">Track A · Developers & AI Operators</p>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black mb-6 text-chrome-gradient">Sign every AI decision.</h3>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <p className="font-mono text-xs text-primary mb-2">01 · INSTALL</p>
              <p className="text-sm text-foreground/80 mb-3">Add a runtime adapter for your stack.</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Adapter API shown as designed. Packages are not published to npm yet; the verifier source is MIT in the repository.
              </p>
              <pre className="bg-black/60 border border-primary/20 rounded-md p-3 text-[11px] font-mono text-primary overflow-x-auto">
{`npm i @apex/psi-hono
# or @apex/psi-openai
# or @apex/psi-anthropic
# or @apex/psi-vercel-ai`}
              </pre>
            </div>
            <div>
              <p className="font-mono text-xs text-primary mb-2">02 · SIGN</p>
              <p className="text-sm text-foreground/80 mb-3">Every model call auto-signs with Ed25519.</p>
              <pre className="bg-black/60 border border-primary/20 rounded-md p-3 text-[11px] font-mono text-primary overflow-x-auto">
{`import { psi } from "@apex/psi-hono";

app.use(psi({
  keyId: "prod-1",
  sign: ed25519.sign,
}));`}
              </pre>
            </div>
            <div>
              <p className="font-mono text-xs text-primary mb-2">03 · VERIFY</p>
              <p className="text-sm text-foreground/80 mb-3">Anyone verifies via the public API.</p>
              <pre className="bg-black/60 border border-primary/20 rounded-md p-3 text-[11px] font-mono text-primary overflow-x-auto">
{`curl -X POST /v1/verify \\
  -d '{"receipt": "..."}'

→ { valid: true,
    keyId: "prod-1",
    ts: "2026-07-22..." }`}
              </pre>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/sdk" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-md text-sm">
              SDK Guides <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/api" className="inline-flex items-center gap-2 border border-primary/40 text-primary px-5 py-2.5 rounded-md text-sm font-mono">
              Public API
            </Link>
            <Link to="/standard" className="inline-flex items-center gap-2 text-primary/80 hover:text-primary px-3 py-2.5 text-xs font-mono">
              IETF Draft →
            </Link>
          </div>
        </motion.div>

        {/* Track B — Humans / Witnesses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/30 to-background p-6 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Upload className="h-6 w-6 text-emerald-400" />
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-400">Track B · Journalists · Creators · Witnesses</p>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black mb-6 text-gold-gradient">Seal what you saw.</h3>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { n: "01", title: "OPEN", desc: "Visit /pramaan on any device. No signup. No wallet. No account.", icon: Terminal },
              { n: "02", title: "DROP", desc: "Drag a photo, video, audio, or document. Hashing runs locally in your browser.", icon: Upload },
              { n: "03", title: "SEAL", desc: "Download your .praman receipt. Share it forever. Anyone can verify.", icon: FileCheck },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-emerald-400/20 bg-background/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <s.icon className="h-4 w-4 text-emerald-400" />
                  <p className="font-mono text-xs text-emerald-400">{s.n} · {s.title}</p>
                </div>
                <p className="text-sm text-foreground/85">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/pramaan" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-5 py-2.5 rounded-md text-sm">
              Open Pramaan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/verify" className="inline-flex items-center gap-2 border border-emerald-400/40 text-emerald-400 px-5 py-2.5 rounded-md text-sm font-mono">
              Verify a Receipt
            </Link>
            <Link to="/seal" className="inline-flex items-center gap-2 text-emerald-400/80 hover:text-emerald-400 px-3 py-2.5 text-xs font-mono">
              Universal Seal →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowToUse;
