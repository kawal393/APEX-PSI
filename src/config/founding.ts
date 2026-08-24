// Founding Members registry configuration.
// Single source of truth for the fee schedule, flags and the verbatim
// acknowledgement text rendered on /founding.

export const TOTAL_SEATS = 100;
export const LAPSE_DAYS = 90;

/** Config flags — nothing claims to be live unless the flag says so. */
export const ONCHAIN_STATUS = "IN CERTIFICATION" as const;
export const ONCHAIN_NETWORK = "Base Sepolia" as const;
export const FINDER_FEE_ACTIVE = false;
export const FIRST_ANCHOR_FEE_WAIVED = true;

export type FeeRow = {
  item: string;
  price: string;
  note: string;
  status?: string;
};

export const FEE_SCHEDULE: FeeRow[] = [
  { item: "Self-verification (MIT, local)", price: "FREE forever", note: "Run the verifier yourself. No account, no key." },
  { item: "Notarise / verify (hosted)", price: "$0.001", note: "Per receipt issued or verified through the hosted layer." },
  { item: "Bitcoin anchor", price: "$0.01", note: "Per anchored batch inclusion via OpenTimestamps." },
  { item: "Compliance check", price: "$0.10", note: "Per predicate evaluated against a record." },
  { item: "Operator", price: "$10/mo", note: "Single operator seat, hosted issuance." },
  { item: "Enterprise", price: "$100/mo", note: "Organisation-wide issuance and webhooks." },
  { item: "Surplus routing", price: "0.1%", note: "Routed to the registry infrastructure pool only." },
  { item: "Referral fee", price: "10%", note: "Of a referred customer's first invoice, paid only when they pay." },
  {
    item: "Finder fee — litigation-finance intros",
    price: "20%",
    note: "Disclosed finder fee on introductions.",
    status: FINDER_FEE_ACTIVE ? "active" : "not yet active",
  },
];

export const FEE_FOOTNOTE =
  "Fees published, amendable prospectively. Scale figures are modelled projections, stated so they can be checked rather than believed.";

/** §6 — verbatim. Never paraphrase, never reorder. */
export const ACKNOWLEDGEMENT_CLAUSES: string[] = [
  "I apply for a numbered registry listing (\u201cseat\u201d) in the Apex PSI Founding Member registry, operated by ROCKYFILMS888 PTY LTD trading as Apex Intelligence Empire (ABN 71 672 237 795) (\u201cApex\u201d).",
  "A seat confers only: (a) a numbered listing and a sealed record of earliness; (b) eligibility for disclosed referral fees per the published fee schedule; (c) published fee discounts and early-access privileges. It confers no other right.",
  "I acquire no equity, shares, ownership, profit share, voting right, governance right, intellectual-property interest, or beneficial interest of any kind in Apex, the APEX PSI protocol, the ledger, the genesis root, the brand, or any revenue \u2014 now, at maturity of the standard, or ever. No claim arises from my contribution, activity, seniority, referrals, or stewardship, or from the passage of time.",
  "No partnership, joint venture, employment, agency, or fiduciary relationship exists between me and Apex.",
  "Any stewardship or custodian role, if ever offered, is an unpaid, revocable duty conferring no property, control, or tenure.",
  "Anything I submit \u2014 feedback, ideas, introductions \u2014 is gratuitous and non-confidential, and Apex may use it without obligation to me.",
  "My seat is a personal, non-transferable, revocable privilege, terminable per the published charter. The sealed record of my earliness is a record of fact and remains accurate.",
  "Referral fees are disclosed affiliate fees, payable only when a referred customer pays, amendable prospectively \u2014 they are not a distribution of profit.",
  "I rely on no representation other than this acknowledgement and the published charter. Governing law: Victoria, Australia.",
];

/** Canonical text hashed client-side and sealed with the application. */
export const ACKNOWLEDGEMENT_CANONICAL = ACKNOWLEDGEMENT_CLAUSES.map(
  (c, i) => `${i + 1}. ${c}`,
).join("\n");

export const HOLDINGS = [
  {
    title: "SEALED SEAT",
    clause: "\u00a76.2(a)",
    body: "A numbered listing #001\u2013#100 and a sealed record of earliness. Assigned in order, never reissued, never sold.",
  },
  {
    title: "DISCLOSED REFERRAL FEES",
    clause: "\u00a76.2(b), \u00a76.8",
    body: "Eligibility for referral fees per the published fee schedule. Paid only when a referred customer pays. Not a profit distribution.",
  },
  {
    title: "LIFETIME FEE RIGHTS + FIRST ACCESS",
    clause: "\u00a76.2(c)",
    body: "Published fee discounts and early access to new registry capability. Activates only at INSCRIBED.",
  },
  {
    title: "STEWARDSHIP ELIGIBILITY",
    clause: "\u00a76.5",
    body: "Eligibility only. Any stewardship or custodian role is an unpaid, revocable duty conferring no property, control, or tenure.",
  },
];

export const CHARTER_LINES = [
  "Verification is MIT-open and free forever.",
  "Rectification Covenant: no fee ever changes a result.",
  "Guardian lock 3-of-5 at foundation formation.",
  "Registry membership is free and stays free.",
  "Stewardship is duty, never ownership.",
];

export const PUBLIC_PLAN = [
  { when: "NOW", line: "The wall opens. Applications are reviewed personally." },
  { when: "AT FIRST REVENUE", line: "Finder fees activate. The on-chain mirror completes certification." },
  { when: "AT FOUNDATION FORMATION", line: "Stewards are drawn from founding seats by sealed seniority." },
];

export const DISCLAIMERS = [
  "Founding membership confers status and fee rights \u2014 not equity, not ownership, not a transferable right, not an expectation of return. The empire behind the standard remains independently owned and operated.",
  "Referral commissions are disclosed affiliate fees earned only when a referred customer pays.",
  "Timestamping cryptographic digests on public blockchains is a neutral recording act, not a financial service. Apex does not issue tokens, ever.",
];

export const OPERATOR_LINE =
  "Operated by ROCKYFILMS888 PTY LTD trading as Apex Intelligence Empire (ABN 71 672 237 795). Not a nation, state, government or sovereign entity; confers no citizenship. Nothing here is legal or financial advice.";

export const STATUS_COPY: Record<string, string> = {
  PENDING: "Check your email.",
  VERIFIED: "Awaiting personal review.",
  RESERVED: "Your seat is held. Witness something.",
  INSCRIBED: "You are on the Wall.",
  LAPSED: "The seat retired empty.",
};
