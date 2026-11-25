import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Download, FileText, FlaskConical } from "lucide-react";
import "@/i18n/breach-pack";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SITE_URL } from "@/lib/site";
import { buildBreachPack, packFingerprint, parseGateAnswer, type BreachPack as Pack } from "@/lib/breach-pack";

// The conformance door scopes its replay memory to a session, so this page
// carries one. The same signed request posted twice in this session is refused
// as a replay; another session is another test.
const CONFORMANCE_SESSION =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : Math.random().toString(36).slice(2, 12).padEnd(8, "0");
const TEST_DOOR = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "qhtntebpcribjiwrdtdd"}.supabase.co/functions/v1/machine-checkout?conformance=agent-03&session=${CONFORMANCE_SESSION}`;

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BreachPack() {
  const { t } = useTranslation("breachPack");
  const [text, setText] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [fp, setFp] = useState<{ json: string; sha256: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (raw: string) => {
    setError(""); setPack(null); setFp(null);
    try {
      const p = buildBreachPack(parseGateAnswer(raw));
      setPack(p); setFp(await packFingerprint(p));
    } catch (e) { setError(t(e instanceof Error && e.message === "invalid_json" ? "invalid_json" : "not_gate_answer")); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void load(text); };
  const tryExample = async () => {
    setBusy(true); setError("");
    try {
      const ex = await (await fetch("/conformance/agent-03-example.json")).json();
      const cases = ex.refusals.filter((c: { expected_reason: string }) => c.expected_reason !== "replay");
      const pick = cases[Math.floor(Math.random() * cases.length)];
      const res = await fetch(TEST_DOOR, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pick.request) });
      const body = JSON.stringify(await res.json(), null, 2);
      setText(body); await load(body);
    } catch { setError(t("failure")); }
    finally { setBusy(false); }
  };
  const pdf = async () => {
    if (!pack || !fp) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("courier"); doc.setFontSize(8);
    const lines = doc.splitTextToSize(`APEX PSI — BREACH PACK (UNSIGNED)\nSHA-256 of companion JSON: ${fp.sha256}\n\n${JSON.stringify(pack, null, 2)}`, 180) as string[];
    let y = 15;
    for (const l of lines) { if (y > 280) { doc.addPage(); y = 15; } doc.text(l, 15, y); y += 4; }
    doc.save(`apex-breach-pack-${fp.sha256.slice(0, 12)}.pdf`);
  };

  const rows = pack ? [
    [t("verdict"), t(pack.verdict)], [t("reason"), pack.reason ?? t("none")], [t("mode"), pack.mode ?? t("none")],
    [t("failed"), pack.failed_checks.join(", ") || t("none")], [t("actions"), String(pack.actions_recorded)],
  ] : [];

  return <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>{t("title")}</title><meta name="description" content={t("description")} />
      <link rel="canonical" href={`${SITE_URL}/breach-pack`} />
      <meta property="og:title" content={t("title")} /><meta property="og:description" content={t("description")} />
      <meta property="og:type" content="website" /><meta name="twitter:card" content="summary" />
    </Helmet>
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-xs text-primary">{t("eyebrow")}</p>
        <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">{t("heading")}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed">{t("oneLine")}</p>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t("boundary")}</p>
      </header>
      <div className="grid gap-10 py-8 lg:grid-cols-2">
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <label htmlFor="bp-input" className="font-mono text-xs uppercase">{t("input")}</label>
          <Textarea id="bp-input" value={text} rows={14} className="font-mono text-xs" placeholder={t("placeholder")}
            onChange={e => { setText(e.target.value); setPack(null); setError(""); }} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!text.trim()}><FileText />{t("build")}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={tryExample}><FlaskConical />{t(busy ? "trying" : "tryExample")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("exampleNote")}</p>
        </form>
        <section className="min-w-0 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p role="status" aria-live="polite" className={`font-mono text-sm font-bold ${pack ? pack.verdict === "REFUSED" ? "text-destructive" : "text-compliant" : "text-muted-foreground"}`}>
            {pack ? t(pack.verdict) : t("idle")}
          </p>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {pack && fp && <>
            <dl className="mt-6 divide-y divide-border text-xs">
              {rows.map(([k, v]) => <div key={k} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2"><dt className="text-muted-foreground">{k}</dt><dd className="break-all font-mono">{v}</dd></div>)}
            </dl>
            <h2 className="mt-6 text-sm font-bold uppercase">{t("checks")}</h2>
            <ul className="mt-2 divide-y divide-border text-xs">
              {Object.entries(pack.checks).map(([k, c]) => <li key={k} className="flex justify-between gap-4 py-2 font-mono"><span>{k}</span><span className={c.status === "ok" ? "text-compliant" : "text-muted-foreground"}>{c.status}{c.reason ? ` · ${c.reason}` : ""}</span></li>)}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">{t("fingerprint")}</p>
            <p className="break-all font-mono text-xs">{fp.sha256}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => save(new Blob([fp.json], { type: "application/json" }), `apex-breach-pack-${fp.sha256.slice(0, 12)}.json`)}><Download />{t("json")}</Button>
              <Button variant="outline" size="sm" onClick={pdf}><Download />{t("pdf")}</Button>
            </div>
          </>}
        </section>
      </div>
      <nav className="flex flex-wrap gap-2 border-t border-border pt-6" aria-label={t("sources")}>
        <Button asChild variant="link"><Link to="/gate">/gate</Link></Button>
        <Button asChild variant="link"><Link to="/recipe/agent-payment">/recipe/agent-payment</Link></Button>
        <Button asChild variant="link"><a href="/conformance/agent-03.json">agent-03.json</a></Button>
        <Button asChild variant="link"><a href="/conformance/agent-03-example.json">agent-03-example.json</a></Button>
      </nav>
    </main>
    <Footer />
  </div>;
}
