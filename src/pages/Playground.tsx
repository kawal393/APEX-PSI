import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SITE_URL } from "@/lib/site";
import {
  sealInBrowser, verifyPlaygroundSeal, buildIncidentBundle, type PlaygroundSeal,
} from "@/lib/playground";
import { verifyIncidentBundle, type IncidentResult } from "../../packages/psi-verifier/src/incident";

const SAMPLE = JSON.stringify(
  { agent: "payments-bot", tool: "transfer", amount: "AUD 500", to: "acct-42", policy: "P-7 approved" },
  null, 2,
);

const download = (name: string, data: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-3 text-xs font-mono border-b border-border/40 py-1.5">
    <span className="text-muted-foreground uppercase">{k}</span>
    <span className="break-all text-foreground">{v}</span>
  </div>
);

export default function Playground() {
  const [text, setText] = useState(SAMPLE);
  const [seal, setSeal] = useState<PlaygroundSeal | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inc, setInc] = useState<IncidentResult | null>(null);

  const doSeal = async () => {
    setErr(null); setVerdict(null);
    try { const s = await sealInBrowser(text); setSeal(s); setVerdict((await verifyPlaygroundSeal(s, text)) ? "VALID" : "INVALID"); }
    catch { setErr("This browser does not support Ed25519 in WebCrypto. Try a current Chrome, Edge, Firefox or Safari."); }
  };
  const doTamper = async () => {
    if (!seal) return;
    const t = text + " ";
    setText(t);
    setVerdict((await verifyPlaygroundSeal(seal, t)) ? "VALID" : "INVALID");
  };
  const doReverify = async () => { if (seal) setVerdict((await verifyPlaygroundSeal(seal, text)) ? "VALID" : "INVALID"); };

  const doRecorder = async () => download("incident-bundle.json", await buildIncidentBundle([
    ["tool_start", text], ["policy_check", "P-7 approved"], ["tool_end", "ok"],
  ]));
  const onFile = async (f?: File) => {
    if (!f) return;
    try { setInc(await verifyIncidentBundle(JSON.parse(await f.text()))); }
    catch { setInc({ valid: false, errors: ["file is not valid JSON"], count: 0, head: null }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Seal in your browser — APEX PSI Playground</title>
        <meta name="description" content="Seal any agent action with Ed25519 in your browser, tamper with it, and watch verification fail. No sign-up, nothing sent anywhere." />
        <link rel="canonical" href={`${SITE_URL}/playground`} />
        <meta property="og:title" content="APEX PSI Playground — seal in 5 seconds" />
        <meta property="og:description" content="Ed25519 sealing and verification running entirely in your browser." />
      </Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-28 pb-20 space-y-14">
        <header className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-gold">Playground · no sign-up · offline</p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Fingerprint it. Break it. Watch it fail.</h1>
          <p className="max-w-2xl text-muted-foreground">
            Everything on this page runs in your browser. Your text is never sent to APEX — you can check that in your browser's network tab.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase">1 · Fingerprint an agent action</h2>
          <Textarea aria-label="Action to fingerprint" value={text} onChange={(e) => setText(e.target.value)} rows={8} className="font-mono text-xs" />
          <div className="flex flex-wrap gap-3">
            <Button onClick={doSeal}>Fingerprint it in your browser</Button>
            <Button variant="outline" onClick={doTamper} disabled={!seal}>Tamper (add one space)</Button>
            <Button variant="outline" onClick={doReverify} disabled={!seal}>Verify again</Button>
            <Button variant="outline" onClick={() => seal && download("fingerprint.playground.json", seal)} disabled={!seal}>Download fingerprint file</Button>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          {seal && (
            <div className="border border-border rounded-md p-4 space-y-1">
              <p data-testid="verdict" className={`text-2xl font-black ${verdict === "VALID" ? "text-emerald-400" : "text-destructive"}`}>{verdict}</p>
              <p className="text-xs text-muted-foreground">This shows the text has not changed. It is not yet a ledger receipt — a receipt needs the hosted notary, which adds a signature and a timestamp.</p>
              <Row k="payload sha256" v={seal.payload_sha256} />
              <Row k="sealed at" v={seal.sealed_at} />
              <Row k="public key" v={seal.public_key} />
              <Row k="signature" v={seal.signature} />
              <p className="text-xs text-muted-foreground pt-2">
                Integrity only. This key was made just now in your browser, so this fingerprint proves the text has not changed since it was made — not who sealed it, and not that the text is true. Receipts signed by the APEX notary key can be checked at <a className="underline" href="/verify">/verify</a>.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase">2 · Agent flight recorder</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">One line in your agent records every step as a fingerprint chain. Nothing leaves your machine.</p>
          <pre className="bg-muted/40 border border-border rounded-md p-4 text-xs overflow-x-auto">{`# The Python recorder is not published yet — download the sample bundle below to try it.

from apex_psi import FlightRecorder
rec = FlightRecorder()

# LangChain / LangGraph
agent.invoke(inputs, config={"callbacks": [rec]})
# CrewAI
Agent(..., step_callback=rec)

rec.save("incident-bundle.json")`}</pre>
          <Button variant="outline" onClick={doRecorder}>Download a sample incident bundle</Button>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase">3 · Inspect an incident bundle</h2>
          <p className="text-sm text-muted-foreground">Drop the file here to check it in your browser. (Command-line version coming with the next package release.)</p>
          <input aria-label="Incident bundle file" type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
          {inc && (
            <div data-testid="incident-verdict" className="border border-border rounded-md p-4 font-mono text-xs space-y-1">
              <p className={`text-lg font-black ${inc.valid ? "text-emerald-400" : "text-destructive"}`}>{inc.valid ? `PASS · ${inc.count} entries, chain intact` : "FAIL"}</p>
              {inc.errors.map((e) => <p key={e}>- {e}</p>)}
              {inc.valid && <p className="text-muted-foreground">Integrity only: authorship and time are not proven unless the head was sealed by a notary.</p>}
            </div>
          )}
        </section>

        <section className="space-y-2 text-sm text-muted-foreground max-w-2xl">
          <h2 className="text-xl font-bold uppercase text-foreground">Free vs hosted</h2>
          <p>Local sealing, recording and verification are free with no limit. The hosted notary (independent timestamp, APEX signature, public ledger) is free up to 20 receipts a minute and 100 a day; above that it tells your code where to <a className="underline" href="/upgrade">upgrade</a>, or you keep sealing locally.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
