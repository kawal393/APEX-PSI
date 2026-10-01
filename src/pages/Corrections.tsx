import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TITLE = "Corrections & Undertakings — Apex PSI";
const DESCRIPTION =
  "Every public correction Apex PSI has made, dated and plain. When we get it wrong we say so here, and the record keeps its shape.";

const ENTRIES = [
  {
    date: "1 October 2026",
    said:
      "The preprint and the research pages presented an arXiv identifier, a DOI, peer review and third-party validation that do not exist, and quoted O(1) tamper detection, a 3-node MPC and zero-knowledge commitments as live capability.",
    now:
      "The paper is labelled a self-hosted preprint, not peer reviewed, with no identifier and no conference submission. Tamper detection is stated as a chain recompute. The quorum is described as redundant nodes operated by Apex, not multi-party computation. Every endorsement sentence in the source list is deleted and the list is retitled Sources & Related Reading, with an explicit note that none of those sources reviewed, tested or adopted APEX PSI.",
    undertaking:
      "No capability, citation, identifier or third-party endorsement appears on this site unless the artefact resolves and the code that implements it can be pointed to.",
  },
  {
    date: "1 October 2026",
    said:
      "The specification page published a normative-looking receipt structure with fields (receipt_id, payload.context, signature.suite, inclusion.path) that no emitter or verifier in the repository produces or reads.",
    now:
      "The published structure is the real one: the PSI-SEAL/1.0.0 seal envelope, with the field set the code actually builds and checks, and a note that action receipts returned by /v1/notarize carry a smaller different field set.",
    undertaking:
      "Every public schema example on this site is taken from the shipped code that generates it, not written to describe the idea.",
  },
  {
    date: "1 October 2026",
    said:
      "Fourteen public surfaces, including the machine-readable /.well-known/apex-protocol.json, described draft-singh-psi-http-01 as a filed IETF draft and pointed at a datatracker record that returns 404. Others cited draft-singh-psi-00, which revision 01 superseded.",
    now:
      "The Compliance-Receipt header is everywhere labelled a working specification in preparation that has not been filed, with no datatracker link. The filed document is named correctly: draft-singh-psi revision 01, individual submission, Informational, expiring 3 March 2027, not an approved standard. Citations were rebuilt to match.",
    undertaking:
      "A draft is called filed only when its datatracker URL returns 200, and that is re-checked before any revision is published.",
  },
  {
    date: "1 October 2026",
    said:
      "The deployed build still carried a referral and commission programme, an unlock-by-inviting gate, a partner earnings and white-label console, and a marketing card offering white-label protocol infrastructure, after this page recorded their removal.",
    now:
      "The components are deleted, the affiliate disclaimer is replaced by a plain statement that no referral, affiliate or commission programme exists, and the deployment cards no longer offer white-label infrastructure or describe Apex as a certifier. The operator wall is empty by design and fills only when a published receipt recomputes.",
    undertaking:
      "A removal is recorded here only when it is live, not when it is written. Until a change is deployed it is described as pending.",
  },
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
  {
    date: "30 September 2026",
    said:
      "The correction of 3 September 2026 closed with the sentence \u201cNo price, tier, subscription, purchase offer or checkout appears anywhere on the site.\u201d",
    now:
      "That sentence stopped being true when the metered door opened. /upgrade offers two paid API keys (Builder $11/mo, Scale $55/mo) that raise the daily sealing cap from the free 100 to 2,000 and 20,000. Checking any published receipt stays free for everyone, with no account and no key, and the verifier, the schema and the specification stay free. Nothing that changes a finding, a result or a record is sold.",
    undertaking:
      "The withdrawal of 3 September was of outcome-priced and per-proof commerce, and it stands. Any future price is described on the day it ships, in the same words on every page, and never announced as an absence.",
  },
  {
    date: "30 September 2026",
    said:
      "This site carried a partner programme promising \u201cEarn 50% Commission on Every Subscription\u201d, a referral link with commission tracking, a payout-email setting and a white-label portal for restyling the platform.",
    now:
      "The commission programme, the referral payouts and the white-label portal are withdrawn and removed from the code. A partner takes an operator reference, which attributes their own seals to them and pays nothing. White-labelling is refused on principle: altering the presentation of a receipt breaks what the receipt is for. The badge and the APEX names are licensed as published, in writing.",
    undertaking:
      "No one is paid to speak for this protocol, and no one is paid to route traffic to it. Promotion is earned by a checkable receipt, never by a share of revenue.",
  },
  {
    date: "1 October 2026",
    said:
      "The correction of 4 September 2026 stated that \u201cEvery install instruction now clones the repository and installs from the local path, and each package is marked \u2018not published\u2019\u201d.",
    now:
      "That sentence was not true when it was published, and it stayed untrue for twenty-seven days. Six live surfaces still told developers to install packages that no registry serves: /verify showed two registry cards for @apex/psi-verifier and psi-verifier (PyPI) captioned \u201cFree forever. MIT. No permission required\u201d, /how-to-use printed npm i @apex/psi-hono, /license and /pramaan named @apex/psi-verifier as an installable package, /universal-seal put the dead package name inside machine-readable JSON that a partner's tool would parse, and the parity widget on /verify told visitors to reproduce its columns with require('@apex/psi-verifier'). All nine npm and PyPI names were re-probed against the registries on 1 October 2026: every @apex/* name, psi-verifier and apex-psi return 404. The only thing that resolves is the source in the repository and apex-psi-mcp on npm. Each of the six surfaces now clones from the repository or names what actually installs, and /sdk says in its own description that the SDKs are source and not published.",
    undertaking:
      "An undertaking recorded here is executed the same day it is written, or it is not written. Before any install command ships, it is run against the public registry, and the registry's own answer \u2014 not this site \u2014 decides whether the sentence appears.",
  },
  {
    date: "1 October 2026",
    said:
      "The cross-language parity widget on /verify compared two columns under the heading \u201cVerified, not asserted\u201d, implying both sides had just been computed.",
    now:
      "Only the left column is computed in your browser. The right column is a recorded Python result stored as a string in the page: no Python ran there, and no Apex package was installed to make it run. The columns are now labelled \u201cTypeScript \u2014 recomputed live in this browser\u201d and \u201cPython \u2014 recorded output, not run here\u201d, and the widget says plainly that agreement between them is not proof a Python process ran just now. The reproducible version of the claim lives at /conformance, which fetches the same golden vectors the Python suite produced and recomputes every digest in the visitor's browser, showing expected against got on any mismatch rather than hiding it.",
    undertaking:
      "A widget shows what it actually does at the moment you look at it. A recording is labelled a recording. If a claim needs a second machine to be true, the page says so or the claim comes off.",
  },
  {
    date: "1 October 2026",
    said:
      "The correction of 4 September 2026 said the protocol's zero-knowledge claims were fixed by labelling the BN128 code experimental everywhere.",
    now:
      "The pages were fixed; the machine layer behind them was not. Found and corrected on 1 October: the chat assistant's own instructions told it that PSI uses \u201cZero-Knowledge proofs\u201d and a \u201cZK-Oracle\u201d, so it was answering visitors with a capability that does not exist - those lines now state the implemented stack and instruct it to deny any ZK capability if asked; the lead follow-up email carried a \u201cZero-Knowledge - Prove compliance without revealing your models\u201d bullet, now replaced by what the record actually does; /sdk documented a zk_mode parameter on POST /prove-action, and the endpoint's source accepts only commit_id, so the parameter, its description and its dedicated feature card are gone; /auth said \u201cProtected by zero-knowledge cryptographic verification\u201d, which was never true of a password form; and the same overclaim sat in three unused components still readable in the public repository. Also corrected the same day in the same mail: a \u201cdeadline is August 2, 2026 - act now\u201d line written after that date had passed, a \u201cPlans start at $499/mo\u201d price that exists nowhere on this site, an unsubstantiated \u201cWe've helped companies across finance, healthcare and tech\u201d, JUDGE mode described as \u201csimulating regulatory inspection\u201d, and a \u201cReply STOP to unsubscribe\u201d instruction with no system behind it. The site's own pages (Architecture, Protocol, Paper, IETF draft, Engine) were already correct: this was the copy nobody reads aloud, where the old claims had survived.",
    undertaking:
      "A withdrawn claim is searched for in the whole repository, including edge functions, mail templates, assistant instructions and unused components - not just the pages that were edited last time. The grep, not the memory, decides whether a claim is gone.",
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
