import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy } from "lucide-react";
import { toast } from "sonner";

const YEAR = new Date().getFullYear();

const bibtex = `@techreport{singh${YEAR}apexpsi,
  author      = {Singh, Kawaljeet},
  title       = {{APEX PSI: Proof of Stateful Integrity for Verifiable AI Governance}},
  institution = {Apex Intelligence Empire (individual submission)},
  type        = {Internet-Draft (Informational, work in progress)},
  number      = {draft-singh-psi-01},
  year        = {${YEAR}},
  url         = {https://ai-governance-standard.com/standard},
  note        = {Hybrid Ed25519 + ML-DSA-65 signatures; SHA-256 evidence}
}`;

const ris = `TY  - RPRT
AU  - Singh, Kawaljeet
TI  - APEX PSI: Proof of Stateful Integrity for Verifiable AI Governance
IN  - Apex Intelligence Empire (individual submission)
M3  - Internet-Draft (Informational, work in progress)
M1  - draft-singh-psi rev. 01
PY  - ${YEAR}
UR  - https://ai-governance-standard.com/standard
ER  -`;

const ietf = `[APEX-PSI]  Singh, K., "APEX PSI: Proof of Stateful Integrity",
            Work in Progress, Internet-Draft,
            draft-singh-psi-01 (Informational, work in progress, not filed as a standard), ${YEAR},
            <https://ai-governance-standard.com/standard>.`;

const apa = `Singh, K. (${YEAR}). APEX PSI: Proof of stateful integrity for verifiable AI governance (Internet-Draft draft-singh-psi, revision 01; Informational, individual submission, not an approved standard). Apex Intelligence Empire. https://ai-governance-standard.com/standard`;

function Block({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">{title}</div>
        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(body); toast.success("Copied"); }}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
        </Button>
      </div>
      <pre className="text-xs font-mono whitespace-pre-wrap break-words text-muted-foreground">{body}</pre>
    </Card>
  );
}

export default function Cite() {
  return (
    <>
      <Helmet>
        <title>Cite Apex PSI — BibTeX · IETF · APA · RIS — Apex PSI — Universal Verification Protocol</title>
        <meta name="description" content="Official citation formats for APEX PSI: BibTeX, IETF, APA, and RIS. For academics, regulators, journalists, and standards bodies." />
        <link rel="canonical" href="https://ai-governance-standard.com/cite" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <BookOpen className="h-3 w-3 mr-1" /> Official Citation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">Cite</span> APEX PSI
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              For academics, regulators, journalists, and standards bodies. Pick the format your workflow expects.
            </p>
          </div>

          <div className="grid gap-4">
            <Block title="BibTeX" body={bibtex} />
            <Block title="IETF reference block" body={ietf} />
            <Block title="APA" body={apa} />
            <Block title="RIS" body={ris} />
          </div>

          <Card className="p-5 mt-6">
            <div className="font-bold mb-2">Canonical URLs</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Specification — <a className="underline" href="/standard">/standard</a></li>
              <li>IETF draft — <a className="underline" href="/ietf/draft-singh-psi-http-01.txt">Compliance-Receipt header working text (not filed with the IETF)</a></li>
              <li>Protocol overview — <a className="underline" href="/protocol">/protocol</a></li>
              <li>Foundation — <a className="underline" href="/foundation">/foundation</a></li>
            </ul>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}
