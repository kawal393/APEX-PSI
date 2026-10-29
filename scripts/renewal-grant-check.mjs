// Does a renewal actually buy what the page promises?
//
// A subscription renews without creating a checkout session, so nothing on the page, in the
// bundle or in any HTTP probe can show whether month two's AUD $99 buys anything. One handler in
// stripe-webhook decides it, and it derives the allowance from the credits recorded on the FIRST
// payment's session — which stripe-checkout fills from its own CREDITS map. If that map says zero,
// or the handler cannot prove a row moved, the customer is charged into an empty balance once a
// month and every call answers 402.
//
// Read-only: touches no account, sends no mail, moves no money.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The till and the renewal handler live in the commerce repository, which is NOT this one:
// APEX-PSI carries an older function with the same name and no stripe-checkout beside it. Reading
// the wrong clone would make this check pass on code that is not deployed.
const REPO = process.env.APEX_INFRA_REPO || join(homedir(), ".openhands", "apex-infra-site");
const read = (p) => {
  try {
    return readFileSync(join(REPO, p), "utf8");
  } catch (e) {
    // A guard that cannot open its input must not print a verdict about the estate.
    console.log(`BROKEN — cannot read ${p} from ${REPO} (${e.code}): that file decides whether a renewal is paid for. Set APEX_INFRA_REPO if the commerce clone lives elsewhere.`);
    process.exit(2);
  }
};

const CHECKOUT = "supabase/functions/stripe-checkout/index.ts";
const WEBHOOK = "supabase/functions/stripe-webhook/index.ts";

const faults = [];
const notes = [];
const fail = (gate, msg) => faults.push(`${gate} :: ${msg}`);

// --- the till: which products are subscriptions, and what each one buys on first payment
const checkout = read(CHECKOUT);
const subs = {};
for (const m of checkout.matchAll(/^\s{2}(\w+):\s*\{\s*price:\s*"(price_\w+)",\s*mode:\s*"subscription"/gm)) {
  subs[m[1]] = { price: m[2] };
}
const CREDITS_BLOCK = checkout.match(/const CREDITS: Record<string, number> = \{([\s\S]*?)\n\};/);
const credits = {};
if (CREDITS_BLOCK) for (const m of CREDITS_BLOCK[1].matchAll(/^\s*(\w+):\s*(\d+)/gm)) credits[m[1]] = Number(m[2]);

// --- the webhook: is a renewal fulfilled, and can it fail quietly?
const webhook = read(WEBHOOK);
const handles = /event\.type === "invoice\.payment_succeeded"/.test(webhook);
const cycleOnly = /billing_reason === "subscription_cycle"/.test(webhook);
const fromSession = /metadata\?*\.credits/.test(webhook) && !/RENEWAL_GRANTS/.test(webhook);
const readBack = /\.update\(\{\s*credits:[\s\S]{0,240}?\)\s*\n?\s*\.eq\([\s\S]{0,200}?\.select\(/.test(webhook);
const recordsMoney = /from\("orders"\)\.insert\(\{[\s\S]{0,700}?stripe_session_id:\s*inv\.id/.test(webhook);
const alertsOwner = /⚠️[\s\S]{0,400}Renewal/.test(webhook) || /Renewal[\s\S]{0,200}no delivery/.test(webhook);

notes.push(`till: ${Object.keys(subs).length} subscription products (${Object.keys(subs).join(", ")})`);
notes.push(`webhook: handles invoice.payment_succeeded=${handles}, cycle-only=${cycleOnly}, allowance from session=${fromSession}, reads back the updated row=${readBack}, records the renewal in orders=${recordsMoney}, alerts the owner on failure=${alertsOwner}`);

if (!Object.keys(subs).length) fail("guard-broken", `no subscription products parsed out of ${CHECKOUT} — its map format changed and this check is now blind`);

if (handles && !cycleOnly) fail("renewal-unhandled", `${WEBHOOK} answers invoice.payment_succeeded without checking billing_reason === "subscription_cycle" — the subscription's FIRST invoice is already fulfilled at checkout, so this pays out twice`);

for (const [product, cfg] of Object.entries(subs)) {
  if (credits[product] === undefined) {
    fail("renewal-unfulfilled", `${product} is sold as a subscription but has no CREDITS entry in ${CHECKOUT}, so its checkout metadata carries no allowance for a renewal to refill`);
  } else if (credits[product] <= 0) {
    fail("renewal-unfulfilled", `${product} grants ${credits[product]} credits — a renewal refills an empty allowance and the customer pays for a 402`);
  }
}

if (!fromSession) fail("renewal-drift", `${WEBHOOK} does not read the allowance from the first payment's session metadata (or keeps a second price list) — two places would then decide what a plan buys, and they can disagree in silence`);
if (!readBack) fail("renewal-silent", `${WEBHOOK} updates api_keys without selecting the rows back — a WHERE that matches nothing returns no error, so a charged customer with no key to top up looks like a fulfilled renewal`);
if (!recordsMoney) fail("renewal-unbooked", `${WEBHOOK} does not insert the renewal invoice into orders — repeat revenue never reaches the ledger`);
if (!alertsOwner) fail("renewal-silent", `${WEBHOOK} has no owner alert on the failure path, so an undelivered renewal surfaces only as a refund request`);

// Prove this check can fail: plant a zero grant in a copy of the till and re-run the same
// comparison. A guard that cannot detect a planted defect would not notice a real one either.
const planted = checkout.replace(/(const CREDITS: Record<string, number> = \{\s*\n\s*\w+:\s*)\d+/, "$10");
const plantedBlock = planted.match(/const CREDITS: Record<string, number> = \{([\s\S]*?)\n\};/);
const plantedCredits = {};
if (plantedBlock) for (const m of plantedBlock[1].matchAll(/^\s*(\w+):\s*(\d+)/gm)) plantedCredits[m[1]] = Number(m[2]);
const firstSub = Object.keys(subs)[0];
const plantApplied = !!firstSub && plantedCredits[firstSub] === 0 && credits[firstSub] > 0;
const tamperCaught = plantApplied && Object.keys(subs).some((p) => !(plantedCredits[p] > 0));
notes.push(`tamper test: planted credits=${credits[firstSub]}→0 on ${firstSub ?? "(no subscriptions)"} | applied=${plantApplied} | caught=${tamperCaught}`);
if (!plantApplied) fail("guard-broken", "the planted zero grant did not apply — the CREDITS source format changed under this check and it is proving nothing");
else if (!tamperCaught) fail("guard-broken", "the comparison did not catch a planted zero grant — it would not notice a real one either");

for (const n of notes) console.log(`  note  ${n}`);
if (faults.length) {
  console.log(`\nFAIL — ${faults.length} gate(s) red on renewal fulfilment:`);
  for (const f of faults) console.log(`  FAULT ${f}`);
  process.exit(1);
}
console.log(`\nPASS — every subscription the till sells carries a non-zero allowance a renewal can refill, the handler derives it from the first payment rather than a second price list, proves a row moved, books the invoice and shouts when it cannot deliver | ${Object.keys(subs).length} subscriptions watched`);
if (process.argv.includes("--verbose")) for (const [p, c] of Object.entries(credits)) console.log(`  ${p}: ${c} credits${subs[p] ? " (subscription — renewal refills this)" : ""}`);
