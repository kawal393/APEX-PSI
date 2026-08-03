// APEX PSI — commercial surfaces.
// The protocol is free. These are the paid, countersigned artefacts:
// live Stripe Payment Links, single source of truth for every CTA on the site.

export const CHECKOUT = {
  /** One-off Article 50 Conformity Receipt — countersigned by the APEX trust anchor. */
  conformityReceipt: {
    url: "https://buy.stripe.com/14A6oz9sl12ofUI8gkb7y0a",
    price: "$29",
    cadence: "one-off",
    label: "Article 50 Conformity Receipt",
  },
  /** PSI Prover — managed notary API subscription. */
  prover: {
    url: "https://buy.stripe.com/00wdR148112o9wkaosb7y09",
    price: "$49",
    cadence: "per month",
    label: "PSI Prover",
  },
  /** Verified Supplier Registry listing — public procurement console entry. */
  registryListing: {
    url: "https://buy.stripe.com/5kQdR18oh5iEfUIdAEb7y0b",
    price: "$199",
    cadence: "per month",
    label: "Verified Supplier Registry Listing",
  },
} as const;

export type CheckoutKey = keyof typeof CHECKOUT;
