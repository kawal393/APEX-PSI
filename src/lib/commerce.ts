// APEX PSI — commercial surfaces.
// The protocol is free. These are the paid, countersigned artefacts:
// Product display metadata. Checkout sessions are created server-side and
// bound to the authenticated customer so purchases can activate immediately.

export const CHECKOUT = {
  /** One-off Article 50 Conformity Receipt — countersigned by the APEX trust anchor. */
  conformityReceipt: {
    price: "$29",
    cadence: "one-off",
    label: "Article 50 Conformity Receipt",
  },
  /** PSI Prover — managed notary API subscription. */
  prover: {
    price: "$49",
    cadence: "per month",
    label: "PSI Prover",
  },
  /** Verified Supplier Registry listing — public procurement console entry. */
  registryListing: {
    price: "$199",
    cadence: "per month",
    label: "Verified Supplier Registry Listing",
  },
} as const;

export type CheckoutKey = keyof typeof CHECKOUT;
