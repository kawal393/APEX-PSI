import { Helmet } from "react-helmet-async";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   /partners — Apex Infrastructure Partnership Door
   Two layers: Open Verification Layer (free / success-fee) and
   the 5 Guardian Seats (Priority Insight & Certification Partners).
   All claims limited to recomputation of public filings.
   ────────────────────────────────────────────────────────────── */

const DEAL_TERMS = [
  {
    title: "Build free",
    body: "Access the public verification endpoints and sealed findings at no cost. Verification of a record's hash is free and stays free.",
  },
  {
    title: "Pay only on profit",
    body: "If you build commercial value on top of the data, a success fee applies — agreed in writing before you start. Nothing upfront, no minimums.",
  },
  {
    title: "No ownership trade",
    body: "Partnership grants access and brand association only. No equity, no board seats, no exclusivity at this layer. The standard stays open.",
  },
];

const GUARDIAN_SEATS = [
  {
    sector: "Litigation",
    gets: "Priority anomaly alerts, expert-witness certification support, early case intelligence.",
  },
  {
    sector: "Risk & Insurance",
    gets: "Verified exposure data across public filings, fraud-pattern detection feeds.",
  },
  {
    sector: "Cyber & Forensics",
    gets: "Tamper-evident audit trails, integrity-chain evidence for incident response.",
  },
  {
    sector: "Financial Compliance",
    gets: "Independent attestation support for filings and disclosures.",
  },
  {
    sector: "Governance",
    gets: "Technical advisory seat, standards and regulatory liaison.",
  },
];

const NOT_OFFERED = [
  "Exclusive rights to cases, sectors, or companies",
  "The right to suppress, delay, or gate any finding",
  "Any non-public data — every input is a public filing",
];

const WHAT_IS =
  "Apex Infrastructure recomputes numbers from public corporate filings — growth rates, cross-year consistency, revenue-versus-profit coupling — and seals each computation with a hash and timestamp. A finding is arithmetic on a company's own documents: reproducible, falsifiable, and dated.";

interface FormState {
  company: string;
  website: string;
  sector: string;
  email: string;
  intent: string;
}

const Partners = () => {
  const [form, setForm] = useState<FormState>({
    company: "",
    website: "",
    sector: "",
    email: "",
    intent: "open-layer",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.email.trim()) return;
    setStatus("sending");
    try {
      // Self-serve application: delivered to the business inbox as a structured record.
      const subject = encodeURIComponent(`Partnership application — ${form.company}`);
      const bodyLines = [
        "Company: " + form.company,
        "Website: " + (form.website || "—"),
        "Sector: " + (form.sector || "—"),
        "Reply-to: " + form.email,
        "Track: " + (form.intent === "guardian" ? "Guardian Seat (Priority Insight & Certification)" : "Open Verification Layer"),
        "",
        "Submitted via apex-infrastructure.com/partners on " + new Date().toISOString().slice(0, 10),
      ];
      window.location.href =
        "mailto:apexinfrastructure369@gmail.com?subject=" + subject + "&body=" + encodeURIComponent(bodyLines.join("\n"));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <Helmet>
        <title>Partners — Apex Infrastructure — Compliance Intelligence Infrastructure</title>
        <meta
          name="description"
          content="Free to verify, paid when you profit. Open verification layer for builders, and five Guardian Seats as Priority Insight & Certification Partners."
        />
        <link rel="canonical" href="https://apex-infrastructure.com/partners" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16">
          {/* HERO */}
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            Apex Infrastructure · Partners
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Free to verify. Paid when you profit.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {WHAT_IS}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The verification layer is open. Below it, builders join free. Above it, five Guardian
            Seats carry priority access and certification for the institutions that act on findings.
          </p>

          {/* LAYER 1 — THE DEAL */}
          <section className="mt-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Layer 1 · Open Verification Layer
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">The deal for builders</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {DEAL_TERMS.map((t) => (
                <div key={t.title} className="rounded-md border border-border bg-card/40 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Hash verification stays free forever. Commercial terms are written before use, signed
              by both sides, and contain no exclusivity.
            </p>
          </section>

          {/* LAYER 2 — GUARDIAN SEATS */}
          <section className="mt-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Layer 2 · Guardian Seats
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Priority Insight &amp; Certification Partners
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Five seats, one per sector. Seat holders are not buying exclusivity — they are buying
              first sight of sealed findings in their sector, certification support, and evidence
              formatted for professional use. What they receive:
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {GUARDIAN_SEATS.map((s) => (
                <div key={s.sector} className="rounded-md border border-border bg-card/40 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide">{s.sector}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.gets}</p>
                </div>
              ))}
              <div className="flex items-center justify-center rounded-md border border-dashed border-border p-5">
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Seats filled only by signed agreement
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-md border border-border/60 bg-background/60 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                What the seats are not
              </p>
              <ul className="mt-3 space-y-2">
                {NOT_OFFERED.map((n) => (
                  <li key={n} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* PARTNER WALL */}
          <section className="mt-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              The Partner Wall
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Who builds on the layer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every signed partner appears here automatically — name, mark, and date. No partner yet
              means the wall is waiting for the first signature.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-24 items-center justify-center rounded border border-dashed border-border"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Open slot
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* APPLY */}
          <section className="mt-14 rounded-md border border-border bg-card/40 p-6">
            <h2 className="text-2xl font-bold tracking-tight">Apply — one form, one reply</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Applications go to the business inbox and are answered once. A reply opens a
              conversation; silence is the answer.
            </p>
            <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
                className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="Website"
                className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                placeholder="Sector"
                className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Business email"
                className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name="intent"
                    checked={form.intent === "open-layer"}
                    onChange={() => setForm({ ...form, intent: "open-layer" })}
                  />
                  Open Verification Layer (free / success-fee)
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name="intent"
                    checked={form.intent === "guardian"}
                    onChange={() => setForm({ ...form, intent: "guardian" })}
                  />
                  Guardian Seat enquiry
                </label>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex items-center gap-2 rounded border border-primary/60 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {status === "sending" ? "Opening…" : "Submit application"}
                </button>
                {status === "sent" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mail client opened with your application. One reply, then the channel is yours or closed.
                  </p>
                )}
              </div>
            </form>
          </section>

          {/* FOOTNOTE */}
          <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            Every finding published by Apex Infrastructure is a recomputation of numbers taken from
            public filings, sealed with a hash and timestamp, and reproducible by anyone from the
            cited source documents. Partnership on this page is not an endorsement of any partner,
            and listing here confers no right over any finding.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Partners;
