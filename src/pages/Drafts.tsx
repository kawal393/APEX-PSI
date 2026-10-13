import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Verified against the IETF Datatracker API on 13 Oct 2026. Every entry is an
// individual Informational Internet-Draft: not an IETF standard, not WG-adopted.
type Draft = { name: string; rev: string; title: string; group: string };
const DRAFTS: Draft[] = [
  { name: "draft-singh-psi", rev: "02", title: "Proof of Stateful Integrity (PSI): Signed, Merkle-Committed Receipts for Digital Records", group: "Core" },
  { name: "draft-singh-psi-merkle", rev: "01", title: "PSI Merkle Commitment Profile (RFC6962-SHA256)", group: "Core" },
  { name: "draft-singh-psi-http", rev: "00", title: "The Compliance-Receipt HTTP Response Header Field", group: "Core" },
  { name: "draft-singh-psi-agent", rev: "01", title: "PSI Receipts for AI Agent Actions", group: "Core" },
  { name: "draft-singh-psi-age-assurance", rev: "01", title: "PSI Age Assurance Decision Receipts", group: "Profiles" },
  { name: "draft-singh-apex-psi-02", rev: "01", title: "PSI-02: Receipts for Carbon Sequestration Measurement Records", group: "Profiles" },
  { name: "draft-singh-apex-psi-03", rev: "02", title: "PSI-03: Receipts for Virtual Power Plant Dispatch Records", group: "Profiles" },
  { name: "draft-singh-apex-psi-04", rev: "01", title: "PSI-04: State-Chain Receipts for Records Concerning Vulnerable Persons", group: "Profiles" },
  { name: "draft-singh-apex-psi-07", rev: "02", title: "PSI-07: Receipts for Organic Production Records", group: "Profiles" },
  { name: "draft-singh-apex-psi-08", rev: "01", title: "PSI-08: Receipts for Health Record Access Events", group: "Profiles" },
  { name: "draft-singh-apex-psi-09", rev: "01", title: "PSI-09: Receipts for Age Assurance Decisions", group: "Profiles" },
];

const Drafts = () => (
  <>
    <Helmet>
      <title>IETF Internet-Drafts — Apex PSI</title>
      <meta name="description" content="Every filed PSI Internet-Draft with links to the IETF Datatracker and archive text." />
      <link rel="canonical" href="https://ai-governance-standard.com/drafts" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <p className="text-xs tracking-widest text-primary mb-2">IETF INTERNET-DRAFTS</p>
          <h1 className="text-3xl sm:text-5xl font-black uppercase mb-4 text-chrome-gradient">All filed drafts</h1>
          <p className="text-muted-foreground text-sm max-w-3xl mb-10">
            {DRAFTS.length} individual Informational drafts, checked against the IETF Datatracker on 13 October 2026.
            None is an IETF standard or adopted by a working group. Each expires 16 April 2027 unless revised.
          </p>
          {["Core", "Profiles"].map((g) => (
            <section key={g} className="mb-10">
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3">{g === "Core" ? "Core protocol" : "Sector profiles"}</h2>
              <div className="border border-border divide-y divide-border">
                {DRAFTS.filter((d) => d.group === g).map((d) => (
                  <div key={d.name} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-primary break-all">{d.name}-{d.rev}</p>
                      <p className="text-sm text-foreground">{d.title}</p>
                    </div>
                    <div className="flex gap-4 text-xs uppercase tracking-wider shrink-0">
                      <a className="underline hover:text-primary" href={`https://datatracker.ietf.org/doc/${d.name}/`} target="_blank" rel="noopener noreferrer">Datatracker</a>
                      <a className="underline hover:text-primary" href={`https://www.ietf.org/archive/id/${d.name}-${d.rev}.txt`} target="_blank" rel="noopener noreferrer">Text</a>
                      <a className="underline hover:text-primary" href={`https://www.ietf.org/archive/id/${d.name}-${d.rev}.html`} target="_blank" rel="noopener noreferrer">HTML</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default Drafts;
