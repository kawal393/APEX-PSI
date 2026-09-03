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
  {
    date: "4 September 2026",
    said:
      "The public repository README told developers to run \u201cnpm install @apex/psi-sdk\u201d.",
    now:
      "No Apex package is published to npm or PyPI \u2014 all nine names return 404. Every install instruction now clones the repository and installs from the local path, and each package is marked \u201cnot published\u201d.",
    undertaking:
      "No install command is published unless it runs as written against a registry that actually serves the package.",
  },
  {
    date: "4 September 2026",
    said:
      "The README, the paper, the IETF draft text and several pages described the protocol as \u201cOptimistic ZKML\u201d and listed \u201cZK-SNARK fraud proofs\u201d, with one row marked \u201cLive\u201d.",
    now:
      "There is no zero-knowledge system here: no ZK-SNARK, no ZKML, no circuit, no trusted setup and no pairing check. The implemented stack is SHA-256 hash chains, Merkle trees, RFC 8785 (JCS) canonicalisation, Ed25519 and post-quantum LMS/ML-DSA signing. The BN128 code is labelled everywhere as an experimental demonstration that is not zero-knowledge.",
    undertaking:
      "A cryptographic primitive is named only where it is implemented. Research placeholders carry the word experimental in the same sentence.",
  },
  {
    date: "4 September 2026",
    said:
      "The protocol was advertised as \u201c43 Predicates \u00b7 9 Jurisdictions \u00b7 3 Institutional Nodes\u201d, and the node layer as \u201c2-of-3 consensus \u2014 no single point of failure\u201d.",
    now:
      "The source contains 54 predicate definitions across 11 regulatory frameworks, counted from the registry in the code. All three verification nodes are operated by APEX: the 2-of-3 check is software redundancy inside one operator's infrastructure, not independent institutional consensus. No third party runs a node.",
    undertaking:
      "Counts are taken from the code, and the word institutional is never used for infrastructure we run ourselves.",
  },
  {
    date: "4 September 2026",
    said:
      "The README said \u201cWe open-sourced the math\u201d and gave the licence as \u201cMIT\u201d for the whole project, while the engine licence reserves all rights.",
    now:
      "The repository is dual-licensed and the README says so: verification is MIT and free forever (packages/psi-verifier and the Python reference verifier), while the PSI-SEAL/1 sealing engine is proprietary, all rights reserved (LICENSE-ENGINE.txt). Where marketing copy and the licence files disagree, the licence files govern.",
    undertaking:
      "One licence sentence, stated the same way in the README, on /license and in the licence files.",
  },
  {
    date: "4 September 2026",
    said:
      "The homepage case study compared Apex to \u201cfull ZKML at $1,000 per output\u201d, showed a $0.003 Apex cost and opened with 1,247 outputs and 2 challenges already logged.",
    now:
      "The invented price comparison and the pre-loaded counters are removed. The demo starts at zero, counts only this browser session, and states that costs and savings are not published because they have not been measured.",
    undertaking:
      "No number appears on the site unless it is measured, live, or plainly labelled as an invented illustration.",
  },
  {
    date: "4 September 2026",
    said:
      "The sealing engine licence stated that commercial, government or institutional sealing requires a PSI-05 royalty licence, the PSI-05 page published royalty tiers for issuers and registries, the seal gate offered an Accept - commercial (PSI-05 royalty) button, and the patent pledge said standard commercial terms apply to the hosted service. The payment edge functions (create-checkout, check-subscription, customer-portal, finalize-checkout, stripe-webhook, crypto-quote, crypto-watcher) were still present in the repository although unwired, and the privacy policy still said payment information is processed by third-party providers.",
    now:
      "All use of the sealing engine is free of charge, at any scale, in perpetuity - personal, commercial, government or institutional. The royalty tiers are withdrawn, the gate records free terms, the seven payment functions are deleted from the repository, and the privacy policy states that no payment information is collected because no payment processor exists. What remains reserved is copyright in the schema (no competing seal generator) and the APEX marks. No charge was ever made under any of the withdrawn terms.",
    undertaking:
      "If a licence file and a page ever disagree about money, the page is treated as wrong until the licence file is changed, and the change is listed here with its date.",
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
          The sister platform at apex-infrastructure.com keeps its own register of the same
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
