import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITE_URL } from "@/lib/site";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`;

const TESTS = [
  { q: "Can an outside party re-check a record?", a: "An auditor, customer or partner opens the receipt page or runs one command and re-verifies it, with no account and no access to your systems." },
  { q: "Is a changed record caught?", a: "On day 13 we alter a copy of a sealed record together and show the verification failing." },
  { q: "What does it cost your engineers?", a: "We record the actual integration effort: one HTTP call, the MCP server, or an SDK wrapper — whichever you used." },
];

const DAYS = [
  { d: "Day 0", t: "Scope", s: "Pick one workflow and the records worth sealing (AI decisions, approvals, model outputs, documents)." },
  { d: "Days 1–2", t: "Connect", s: "Add one seal call beside your existing system. Your live workflow does not wait on the receipt." },
  { d: "Days 3–12", t: "Run in parallel", s: "Records are sealed as they happen. Receipts accumulate under a pilot API key issued for the trial." },
  { d: "Day 13", t: "Tamper test", s: "A sealed record is deliberately altered and the verification is shown to fail." },
  { d: "Day 14", t: "Report", s: "Receipts issued, verification results, tamper test, integration effort, and the gaps we found — the report is itself sealed." },
];

const Pilot = () => {
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setSending(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          company: f.get("company"),
          role: f.get("role"),
          message: `[14-DAY PILOT REQUEST]\nRecords to seal: ${f.get("records") || "-"}\n\n${f.get("message") || ""}`,
        }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success("Pilot request received. We reply by email to arrange the scoping call.");
      form.reset();
    } catch {
      toast.error("Could not send. Please email business@apex-infrastructure.com directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>14-Day Evidence Pilot — Apex PSI</title>
        <meta name="description" content="A bounded 14-day pilot: seal one workflow's records in parallel, let an outside party re-verify them, run a tamper test, and receive a sealed report." />
        <link rel="canonical" href={`${SITE_URL}/pilot`} />
        <meta property="og:title" content="14-Day Evidence Pilot — Apex PSI" />
        <meta property="og:description" content="Seal one workflow in parallel for 14 days, re-verify independently, and receive a sealed report." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <p className="text-xs tracking-widest text-primary mb-2">FOR TEAMS EVALUATING APEX PSI</p>
            <h1 className="text-3xl sm:text-6xl font-black uppercase mb-4 text-chrome-gradient">14-Day Evidence Pilot</h1>
            <p className="text-muted-foreground max-w-3xl mb-12">
              One workflow. Fourteen days. Your records are sealed in parallel with what you run today, an outside party
              re-checks them without access to your systems, and you finish with a sealed report of what worked and what did not.
            </p>

            <section className="mb-14">
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-4">What the pilot answers</h2>
              <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
                {TESTS.map((x) => (
                  <div key={x.q} className="bg-background p-6">
                    <p className="font-bold uppercase text-sm text-primary mb-2">{x.q}</p>
                    <p className="text-sm text-muted-foreground">{x.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-14">
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-4">The fourteen days</h2>
              <div className="border border-border divide-y divide-border">
                {DAYS.map((x) => (
                  <div key={x.d} className="p-4 grid md:grid-cols-[140px_180px_1fr] gap-2">
                    <span className="font-mono text-sm text-primary">{x.d}</span>
                    <span className="font-bold uppercase text-sm">{x.t}</span>
                    <span className="text-sm text-muted-foreground">{x.s}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-14 grid md:grid-cols-2 gap-6">
              <div className="border border-border p-6">
                <h2 className="text-sm font-bold tracking-widest uppercase text-primary mb-3">What a receipt proves</h2>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                  <li>This exact record existed at the sealing time.</li>
                  <li>It has not changed since — any edit fails verification.</li>
                  <li>Its place in the ledger's order, checkable with a public inclusion proof.</li>
                </ul>
              </div>
              <div className="border border-border p-6">
                <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3">What it does not prove</h2>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                  <li>That the record's contents are true or the decision was right.</li>
                  <li>Compliance with any law or regulation.</li>
                  <li>Anything about records that were never sealed.</li>
                </ul>
              </div>
            </section>

            <section className="mb-14 border border-border p-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3">Your data</h2>
              <p className="text-sm text-muted-foreground max-w-4xl">
                The ledger stores fingerprints (SHA-256) and signatures, not your records. You can fingerprint records inside your
                own environment before anything is sent, so readable content never leaves your systems. Verification is free,
                needs no account and keeps working offline with the open-source verifier.
              </p>
            </section>

            <section className="grid md:grid-cols-5 gap-10">
              <div className="md:col-span-2">
                <h2 className="text-2xl font-black uppercase mb-3">Request a pilot</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Pilot terms are agreed directly — Contact Sales. Tell us which records you want sealed and we reply by email to
                  arrange a scoping call.
                </p>
                <p className="text-sm text-muted-foreground">
                  Want to try it first? <Link to="/seal" className="underline text-primary">Make a free receipt</Link> or read the{" "}
                  <Link to="/recipe/agent-payment" className="underline text-primary">agent payment recipe</Link>.
                </p>
              </div>
              <form onSubmit={submit} className="md:col-span-3 space-y-3" aria-label="Pilot request">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input name="name" placeholder="Name" required maxLength={100} aria-label="Name" />
                  <Input name="email" type="email" placeholder="Work email" required maxLength={255} aria-label="Work email" />
                  <Input name="company" placeholder="Company" required maxLength={150} aria-label="Company" />
                  <Input name="role" placeholder="Role" maxLength={100} aria-label="Role" />
                </div>
                <Input name="records" placeholder="Which records would you seal? (e.g. AI credit decisions)" maxLength={300} aria-label="Records to seal" />
                <Textarea name="message" placeholder="Anything else we should know" rows={4} maxLength={2000} aria-label="Message" />
                <Button type="submit" disabled={sending} className="w-full sm:w-auto uppercase tracking-widest">
                  {sending ? "Sending…" : "Request pilot"}
                </Button>
              </form>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Pilot;
