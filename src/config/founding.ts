// Founding Members registry configuration.
// Single source of truth for the fee schedule, flags and the verbatim
// acknowledgement text rendered on /founding.

export const TOTAL_SEATS = 10;
export const LAPSE_DAYS = 90;

/** Config flags — nothing claims to be live unless the flag says so. */
export const ONCHAIN_STATUS = "IN CERTIFICATION" as const;
export const ONCHAIN_NETWORK = "Base Sepolia" as const;
export const FIRST_ANCHOR_FEE_WAIVED = true;

export type FeeRow = {
  item: string;
  price: string;
  note: string;
  status?: string;
};

export const FEE_SCHEDULE: FeeRow[] = [
  { item: "Self-verification (MIT, local)", price: "FREE forever", note: "Run the verifier yourself. No account, no key." },
  { item: "Notarise / verify (hosted)", price: "LIMITED FREE USE", note: "Up to 20 receipts per minute and 100 per day; independent verification remains free." },
  { item: "Bitcoin anchor", price: "FREE", note: "No charge for anchored batch inclusion via OpenTimestamps." },
  { item: "Compliance check", price: "FREE", note: "No charge for a predicate evaluated against a record." },
  { item: "Registry seat", price: "FREE", note: "A numbered listing costs nothing. Ten seats, by invitation and operator approval." },
  { item: "Founding Member referral fee", price: "50% of net revenue", note: "Paid to a Founding Member on revenue APEX actually receives from a customer they directly referred, for that customer's first 12 months. After a 12-month review, members who meet the published benchmark move to a 5-year 50% term; others keep their seat and move to a 20% fee on new customers. Settled monthly. No fee for recruiting members.", status: "active" },
];

/** Printed verbatim beneath the fee schedule. */
export const NO_FINDER_FEE_NOTICE =
  "No fee is charged, and none is published, for introducing anyone to a litigation funder, a lawyer or any other third party. Apex holds no Australian Financial Services Licence, and does not arrange, promote, fund or profit from any claim, funding scheme or legal proceeding.";

export const FEE_FOOTNOTE =
  "Independent verification and self-hosted use remain free. The APEX-hosted service has a limited public allowance; higher-volume operated products are arranged separately.";

/** §6 — verbatim. Never paraphrase, never reorder. */
export const ACKNOWLEDGEMENT_CLAUSES: string[] = [
  "I apply for a numbered registry listing (\u201cseat\u201d) in the Apex PSI Founding Member registry, operated by ROCKYFILMS888 PTY LTD trading as Apex Intelligence Empire (ABN 71 672 237 795) (\u201cApex\u201d).",
  "A seat confers only: (a) a numbered listing and a sealed record of earliness; (b) a disclosed referral fee of 50% of net revenue actually received by Apex from customers I directly refer, for each such customer\u2019s first 12 months, subject to an annual review under which a member meeting the published benchmark moves to a 5-year term at 50% and any other member keeps the seat with a 20% fee on newly referred customers, per the published fee schedule; (c) published fee discounts and early-access privileges. It confers no other right.",
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
    body: "A numbered listing #001\u2013#010 and a sealed record of earliness. Assigned in order, never reissued, never sold.",
  },
  {
    title: "DISCLOSED REFERRAL FEES",
    clause: "\u00a76.2(b), \u00a76.8",
    body: "50% of net revenue received from customers you directly refer, for their first 12 months. Meet the annual benchmark and the 50% term extends to 5 years; otherwise your seat stays and the fee on new customers becomes 20%. Paid only when a referred customer pays. Not a profit distribution.",
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
  { when: "NOW", line: "The wall is open to any operator whose published receipt recomputes. Nothing is granted by application." },
  { when: "AT FIRST REVENUE", line: "Every receipt issued stays resolvable. No revenue buys a finding and no mirror certifies anything." },
  { when: "AT FOUNDATION FORMATION", line: "Stewards are drawn from founding seats by sealed seniority." },
];

export const DISCLAIMERS = [
  "Founding membership confers status and fee rights \u2014 not equity, not ownership, not a transferable right, not an expectation of return. The empire behind the standard remains independently owned and operated.",
  "The only payment a Founding Member can receive is the disclosed referral fee (50%, or 20% after a below-benchmark annual review) on revenue Apex actually receives from customers they directly referred, for 12 months. Nothing is paid for recruiting members, for adoption, or from Apex's other revenue. Members are independent and cannot bind or represent Apex.",
  "Timestamping cryptographic digests on public blockchains is a neutral recording act, not a financial service. Apex does not issue tokens, ever.",
  "What this is not: membership costs nothing to join or keep; no fee is ever paid for recruiting another member; the fee right cannot be transferred, sold, pooled or tokenised; and it is never an investment, a return, passive income or guaranteed income \u2014 only a referral commission on paying customers a member brings.",
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
