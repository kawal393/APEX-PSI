import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TITLE = "Corrections & Undertakings — Apex PSI";
const DESCRIPTION =
  "Every public correction Apex PSI has made, dated and plain. When we get it wrong we say so here, and the record keeps its shape.";

const ENTRIES = [
  {
    date: "3 September 2026",
    said:
      "The founding page published a finder fee: 20% on introductions to litigation funders.",
    now:
      "No fee is charged, and none is published, for introducing anyone to a litigation funder, a lawyer or any other third party. The fee line is deleted.",
    undertaking:
      "Such a fee could have required an Australian financial services licence and risked champerty. None is charged and none will be.",
  },
  {
    date: "3 September 2026",
    said:
      "The platform's original name appeared in code, copy, comments, filenames, assets, mailboxes and hostnames.",
    now:
      "The name is retired everywhere a stranger can read. Two untouchable places keep it by design: the live ledger table names and the already-applied historical migrations, which are the database's own record and are never shown as text to any visitor.",
    undertaking: "A dead brand stays dead: no new file, mailbox, hostname or comment carries it.",
  },
  {
    date: "3 September 2026",
    said: "The site footer stated \u201cAustralian Provisional Patent \u2014 Filed\u201d.",
    now:
      "No provisional application has been filed. The footer reads \u201cNo patent claimed \u2014 open standard (MIT)\u201d.",
    undertaking:
      "No patent, filing or grant is mentioned on this site unless a filing number can be produced on demand.",
  },
  {
    date: "3 September 2026",
    said:
      "The engine header described itself as an \u201cEU AI Act Enforcement Layer\u201d.",
    now:
      "Apex holds no enforcement power of any kind. The header reads \u201cEU AI Act transparency verification \u00b7 a compliance instrument, not an authority\u201d.",
    undertaking:
      "Enforcement belongs to regulators and courts. This platform verifies; it never enforces.",
  },
  {
    date: "3 September 2026",
    said:
      "The pause control and its error messages cited EU AI Act Art. 14 as if the Act created a protocol pause mechanism.",
    now:
      "Article 14 is the human-oversight obligation for high-risk systems; there is no statutory pause. All labels now read \u201cArt. 14 principle\u201d or \u201chuman-oversight pause\u201d.",
    undertaking: "Legal citations on this site name principles, never invented mechanisms.",
  },
  {
    date: "3 September 2026",
    said:
      "The engine badge printed the number of ledger entries loaded at startup (capped at 500) as \u201cpersisted\u201d, understating the ledger, which holds thousands of receipts.",
    now:
      "The badge reads \u201clatest loaded\u201d. The full ledger count is published on the impact wall, fetched live from the public ledger.",
    undertaking: "A counter shows what it actually measures, or it does not ship.",
  },
  {
    date: "3 September 2026",
    said:
      "The site published commercial tiers, per-unit prices, subscriptions and checkout: paid plans, a fee schedule with dollar amounts, \u201cContact sales\u201d offers and card and on-chain payment flows.",
    now:
      "All commerce is withdrawn. The protocol, the verifier, sealing and verification are free, with no account and no key. No price, tier, subscription, purchase offer or checkout appears anywhere on the site.",
    undertaking:
      "Charging for evidence gave anyone a reason to doubt the record, and paid tiers implied a standing Apex does not hold. Verification stays free so the record can be checked by anyone, at no cost, without asking us.",
  },
];

const Corrections = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
    </Helmet>
    <Navbar />
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-32">
      <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-gold">
        The record keeps its shape
      </p>
      <h1 className="mb-6 font-serif text-4xl leading-tight md:text-6xl">
        Corrections &amp; <span className="italic text-gold">Undertakings</span>
      </h1>
      <p className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
        When we get it wrong, we say so here — dated, plain and permanent. We do not quietly
        edit: a removed claim stays listed below so the record keeps its shape. A correction is
        not a weakness in the record; it is the record working.
      </p>

      <section className="mb-14 border border-border/40 bg-card/20 p-7">
        <h2 className="mb-4 font-serif text-2xl">Standing undertakings</h2>
        <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {[
            "If a product or fee is withdrawn while any customer holds it, every purchaser is refunded in full — asked or unasked.",
            "If a public claim of ours is found unsourced or wrong, it is corrected or removed and the change is listed here with its date.",
            "Anyone may report an error at apexinfrastructure369@gmail.com. We aim to reply within 24–48 hours.",
            "Feedback changes the record, not the math: a sealed figure moves only when the arithmetic moves.",
            "Dissent is welcome on the impact wall and is sealed exactly like agreement.",
          ].map((l) => (
            <li key={l} className="flex gap-3">
              <span className="mt-1 text-gold">·</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground/70">
          The commercial platform at apex-infrastructure.com keeps its own register of the same
          kind.
        </p>
      </section>

      <h2 className="mb-6 font-serif text-2xl">The register</h2>
      <div className="space-y-6">
        {ENTRIES.map((e) => (
          <article key={e.date + e.said} className="border border-border/40 bg-card/20 p-7">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
              {e.date}
            </p>
            <p className="mb-3 text-sm leading-relaxed">
              <span className="font-semibold">What was said:</span> {e.said}
            </p>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">What stands now:</span> {e.now}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-gold">Undertaking:</span> {e.undertaking}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Found something we got wrong? Write to apexinfrastructure369@gmail.com. If you are right,
        it appears above with your date and our name on it — and the ledger keeps the old version
        too, because nothing here deletes.
      </p>
    </main>
    <Footer />
  </div>
);

export default Corrections;
