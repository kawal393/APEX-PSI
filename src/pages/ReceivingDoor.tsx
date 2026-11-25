import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Download, ShieldCheck } from "lucide-react";
import "@/i18n/gate";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_URL } from "@/lib/site";
import { actionCheckReport, checkActionReceipt, CLAIM_FIELDS, type ActionCheck, type ReceiptClaims } from "@/lib/action-receipt-check";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReceivingDoor() {
  const { t } = useTranslation("gate");
  const [receipt, setReceipt] = useState("");
  const [claims, setClaims] = useState<ReceiptClaims>({});
  const [result, setResult] = useState<ActionCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const reset = () => { setResult(null); setError(""); };
  const check = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setResult(null); setBusy(true);
    try { setResult(await checkActionReceipt(receipt, claims)); }
    catch (e) { setError(t(e instanceof Error && e.message === "invalid_receipt_id" ? "invalid" : "failure")); }
    finally { setBusy(false); }
  };
  const exportReport = async (kind: "json" | "pdf") => {
    if (!result) return;
    setExporting(true); setError("");
    try {
      const report = await actionCheckReport(result);
      const name = `apex-action-check-${result.request.receipt_id}`;
      if (kind === "json") save(new Blob([report.json], { type: "application/json" }), `${name}.json`);
      else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF();
        pdf.setFont("courier"); pdf.setFontSize(8);
        const lines = pdf.splitTextToSize(`APEX PSI — UNSIGNED CHECK REPORT\nSHA-256 of companion JSON: ${report.sha256}\n\n${report.json}`, 180) as string[];
        let y = 15;
        for (const line of lines) {
          if (y > 280) { pdf.addPage(); y = 15; }
          pdf.text(line, 15, y); y += 4;
        }
        pdf.save(`${name}.pdf`);
      }
    } catch { setError(t("exportFailed")); }
    finally { setExporting(false); }
  };
  const bool = (v: unknown) => v === true ? t("yes") : v === false ? t("no") : t("unknown");
  const rows = result ? [
    [t("signature"), bool(result.signatureVerified)],
    [t("keyStatus"), result.keyStatusCheckedAt ?? t("unknown")],
    [t("serverAllow"), bool(result.response.allowed)],
    [t("expiry"), bool(result.response.expired)],
    [t("revoked"), bool(result.response.revoked)],
    [t("authority"), result.response.authority_ok === null ? t("notRequested") : bool(result.response.authority_ok)],
    [t("reason"), result.reason], [t("checkedAt"), result.checkedAt],
  ] : [];

  return <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>{t("title")}</title><meta name="description" content={t("description")} />
      <link rel="canonical" href={`${SITE_URL}/gate`} />
      <meta property="og:title" content={t("title")} /><meta property="og:description" content={t("description")} />
      <meta property="og:type" content="website" /><meta name="twitter:card" content="summary" />
    </Helmet>
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-xs text-primary">{t("eyebrow")}</p>
        <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">{t("heading")}</h1>
        <p className="mt-5 font-mono text-xs text-primary">{t("status")}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("boundary")}</p>
      </header>
      <div className="grid gap-10 py-8 lg:grid-cols-2">
        <form onSubmit={check} className="min-w-0 space-y-6">
          <div>
            <label htmlFor="gate-receipt" className="font-mono text-xs uppercase">{t("receipt")}</label>
            <Input id="gate-receipt" required value={receipt} disabled={busy} autoComplete="off" className="mt-3 font-mono" placeholder="APEX-ACT-…"
              onChange={e => { setReceipt(e.target.value); reset(); }} />
          </div>
          <fieldset disabled={busy} className="space-y-4">
            <legend className="mb-4 font-mono text-xs uppercase text-primary">{t("expectations")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {CLAIM_FIELDS.map(field => <div key={field} className="min-w-0">
                <label htmlFor={`gate-${field}`} className="text-xs text-muted-foreground">{t(field)}</label>
                <Input id={`gate-${field}`} value={claims[field] ?? ""} maxLength={256} autoComplete="off" placeholder={t("optional")} className="mt-2 font-mono text-xs"
                  onChange={e => { setClaims(c => ({ ...c, [field]: e.target.value })); reset(); }} />
              </div>)}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("expectationsNote")}</p>
          </fieldset>
          <Button type="submit" disabled={busy || !receipt.trim()} className="w-full sm:w-auto"><ShieldCheck />{t(busy ? "checking" : "check")}</Button>
        </form>
        <section className="min-w-0 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-label={t("receiptSummary")}>
          <p className={`font-mono text-sm font-bold ${result?.recordCheckPassed ? "text-compliant" : result ? "text-destructive" : "text-muted-foreground"}`} role="status" aria-live="polite">
            {t(result ? result.recordCheckPassed ? "passed" : "refused" : "idle")}
          </p>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {result && <>
            <dl className="mt-6 divide-y divide-border text-xs">
              {rows.map(([label, value]) => <div key={label} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2">
                <dt className="text-muted-foreground">{label}</dt><dd className="break-all font-mono">{value}</dd>
              </div>)}
            </dl>
            <details className="mt-5"><summary className="cursor-pointer text-xs text-muted-foreground">{t("response")}</summary>
              <pre className="mt-3 max-h-80 overflow-auto border border-border p-3 text-xs">{JSON.stringify(result.response, null, 2)}</pre>
            </details>
            <h2 className="mt-8 text-sm font-bold uppercase">{t("report")}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("reportNote")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => exportReport("json")}><Download />{t("json")}</Button>
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => exportReport("pdf")}><Download />{t("pdf")}</Button>
            </div>
          </>}
        </section>
      </div>
      <section className="border-y border-border py-6">
        <h2 className="font-mono text-xs text-primary">{t("next")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("nextNote")}</p>
      </section>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("expectations")}>
        <Button asChild variant="link"><Link to="/mandate">{t("mandate")}</Link></Button>
        <Button asChild variant="link"><Link to="/recipe/agent-payment">{t("recipe")}</Link></Button>
        <Button asChild variant="link"><a href="/ietf/draft-singh-psi-agent-03.txt">{t("draft")}</a></Button>
      </nav>
      <p className="mt-6 max-w-3xl text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
    <Footer />
  </div>;
}