// commerce-truth-check — the fourth door.
//
// The live-copy guard proves that a SENTENCE on the site matches the repository.
// This proves that the site's money claims match what the MERCHANT ACCOUNT
// actually sells. A store that sells a paid product while the site says
// "there is no fee" is a false sentence no text grep can see, because both
// halves are individually true-looking and only the pair is a lie.
//
// Read-only against Stripe. Never prints a key. Key comes from the vault file
// outside every repo: C:/Users/apex1/.apex-vault/stripe_payment_links_once.env
//
// Three fatal rules, each proven by its own failure case:
//   1. a sentence the site serves that the merchant account contradicts
//      (demonstrated red on 19 October: "there is no fee" beside an active $199.00 monthly listing)
//   2. a checkout button the served page carries that cannot charge
//      (a link that is not on this account, is switched off, or sells only archived prices)
//   3. a till whose account is named for a different business than the product it sells
//      (demonstrated red on 22 November: the card page for "APEX PSI — Pro $11.00 per month"
//       reads "Sovereign AI Film Verse", because that is this account's public business name)
//   4. a price a served button charges that no hosted tier grants
//      (the charge works, the money is taken, and nothing raises the buyer's capacity —
//       measured 22 November by reading TIER_PRICE_ID from the provisioning code itself)
//   5. a money endpoint the site depends on that is not answering
//      (create-checkout, sync-subscription, create-api-key, stripe-webhook)
// Everything else it prints is measurement, not verdict: which APEX PSI prices have a
// button, which have none, and which are quoted as a number in the served file.
//
// Usage: node scripts/commerce-truth-check.mjs
// Exit 0 = site and store agree. Exit 1 = contradiction, listed per line. Exit 2 = could not measure.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VAULT = 'C:/Users/apex1/.apex-vault/stripe_payment_links_once.env';
const SITE = 'https://www.ai-governance-standard.com';
const FUNCTIONS_BASE = 'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1';
const TIERS_FILE = fileURLToPath(new URL('../supabase/functions/_shared/tiers.ts', import.meta.url));

// What each money endpoint must answer for the door to be considered alive. Each of
// these replies BEFORE any charge or write, so probing them changes nothing.
const DOOR_EXPECTATIONS = [
  // deployed and asking for a session = correct; a signed-in browser supplies it.
  { path: '/create-checkout', want: [401], means: 'present, asks the buyer to sign in before charging' },
  { path: '/sync-subscription', want: [401], means: 'present, reads the plan only for a signed-in user' },
  { path: '/create-api-key', want: [401], means: 'present, mints a key only for a signed-in user' },
  // stripe-webhook builds the Stripe client from STRIPE_SECRET_KEY before it looks at a
  // signature, so "400 missing signature" is also proof the card secret is configured.
  { path: '/stripe-webhook', want: [400], means: 'present, and STRIPE_SECRET_KEY is configured in the runtime' },
];

/** Read the tier map out of the code that provisions, so this guard never hardcodes a price id. */
export function readTierMap(source) {
  const free = Number((source.match(/FREE_DAILY_LIMIT\s*=\s*(\d+)/) || [])[1]);
  const block = (name) => {
    const start = source.indexOf(`export const ${name}`);
    if (start < 0) return {};
    const body = source.slice(start, source.indexOf('};', start) + 1);
    const out = {};
    for (const m of body.matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) out[m[1]] = m[2];
    for (const m of body.matchAll(/(\w+)\s*:\s*(-?\d+)/g)) out[m[1]] = Number(m[2]);
    return out;
  };
  return { free, limits: block('TIER_DAILY_LIMIT'), prices: block('TIER_PRICE_ID') };
}

// ---- rule 4: does paying actually deliver capacity? ------------------------
export function ruleDelivery(charges, slugs, tierMap) {
  const priceToTier = {};
  for (const [tier, id] of Object.entries(tierMap.prices)) priceToTier[id] = tier;
  const faults = [];
  const delivered = [];
  for (const slug of slugs) {
    const c = charges[slug];
    if (!c || !c.active) continue;
    for (const priceId of c.priceIds) {
      const tier = priceToTier[priceId];
      const limit = tier ? tierMap.limits[tier] : undefined;
      if (!tier) {
        faults.push(
          `buy.stripe.com/${slug} charges ${priceId}, which no hosted tier grants — a buyer who pays it gets no raised capacity and no key path`,
        );
      } else if (!(limit > tierMap.free)) {
        faults.push(
          `buy.stripe.com/${slug} charges ${priceId}, mapped to tier "${tier}" whose daily limit (${limit}) is not above the free ${tierMap.free} — paying changes nothing`,
        );
      } else {
        delivered.push(`${priceId} -> ${tier} (${limit}/day)`);
      }
    }
  }
  return faults.length ? { ok: false, what: faults.join('\n  ') } : { ok: true, note: `every charged price grants capacity: ${delivered.join(', ')}` };
}

// ---- rule 5: are the money endpoints alive? -------------------------------
export function ruleDoors(results) {
  const faults = [];
  for (const { path, want, means } of DOOR_EXPECTATIONS) {
    const got = results[path];
    if (got === undefined) faults.push(`${path} was not measured`);
    else if (want.includes(got)) continue;
    else if (got === 404) faults.push(`${path} is not deployed — the page depends on it`);
    else if (got >= 500 || got === 0) faults.push(`${path} answers ${got} — the endpoint is down${path === '/stripe-webhook' ? ' (a 500 here means STRIPE_SECRET_KEY is missing from the runtime)' : ''}`);
    else faults.push(`${path} answers ${got}, expected ${want.join('/')} (${means})`);
  }
  return faults.length ? { ok: false, what: faults.join('\n  ') } : { ok: true, note: DOOR_EXPECTATIONS.map((d) => `${d.path} answers ${d.want[0]}`).join(', ') };
}

async function probeDoors() {
  const out = {};
  for (const { path } of DOOR_EXPECTATIONS) {
    try {
      const r = await fetch(FUNCTIONS_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      out[path] = r.status;
      await r.text();
    } catch (e) {
      out[path] = 0;
    }
  }
  return out;
}


const key = (() => {
  const t = readFileSync(VAULT, 'utf8');
  const m = t.match(/^STRIPE_RESTRICTED_KEY[^\S\n]*=[^\S\n]*(\S+)/m);
  if (!m) { console.error('no key in the vault'); process.exit(2); }
  return m[1];
})();

// What the site asserts about money, and what has to be true for it to hold.
const FEE_ASSERTIONS = [
  {
    where: 'Products page, Supplier Transparency Console card',
    must_contain: 'No listing fee — there is no fee',
    // True only while no ACTIVE product on the account sells a registry listing.
    forbidden_product: /registry listing/i,
    why: 'The site tells suppliers a listing costs nothing. If the merchant '
      + 'account sells an active "Registry Listing" product, one of the two is false.',
  },
];

async function stripe(path) {
  const r = await fetch('https://api.stripe.com' + path, { headers: { Authorization: 'Bearer ' + key } });
  const j = await r.json();
  if (j.error) throw new Error(path + ' -> ' + j.error.type + '/' + (j.error.code || '-'));
  return j;
}

(async () => {
  // 1. The live bundle the browser actually receives.
  const html = await (await fetch(SITE + '/?t=' + Date.now(), { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } })).text();
  const names = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map(m => m[1]))];
  if (names.length !== 1) { console.error('could not name the live bundle:', names); process.exit(2); }
  const bundle = await (await fetch(`${SITE}/assets/${names[0]}?t=${Date.now()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  console.log(`live bundle ${names[0]} (${bundle.length} B)`);

  // 2. What the merchant account sells.
  const [prods, prices] = [await stripe('/v1/products?limit=100'), await stripe('/v1/prices?limit=100')];
  const byId = {};
  for (const p of prods.data || []) byId[p.id] = p.name;
  const sellable = (prices.data || []).filter(p => p.active).map(p => ({
    id: p.id,
    product: p.product,
    name: (typeof p.product === 'object' && p.product.name) || byId[p.product] || String(p.product),
    amount: (p.unit_amount / 100).toFixed(2),
    currency: String(p.currency).toUpperCase(),
    cadence: p.recurring ? 'per ' + p.recurring.interval : 'one-time',
  }));
  const activeProducts = (prods.data || []).filter(p => p.active).map(p => p.name);
  console.log(`store: ${activeProducts.length} active products, ${sellable.length} active prices\n`);

  // 3. Pair them.
  // A price counts as reachable when the site both states it and links a
  // checkout for it. "$11" sitting in prose proves nothing on its own, so the
  // predicate below is deliberately weak and is paired with the link check.
  let bad = 0;
  for (const a of FEE_ASSERTIONS) {
    const onSite = bundle.includes(a.must_contain);
    const sellers = sellable.filter(s => a.forbidden_product.test(s.name));
    if (onSite && sellers.length) {
      bad++;
      console.log('CONTRADICTION  ' + a.where);
      console.log('  site says    : "' + a.must_contain + '"');
      for (const s of sellers) console.log('  store sells  : "' + s.name + '"  ' + s.amount + ' ' + s.currency + ' ' + s.cadence + '  (price ' + s.id + ', active)');
      console.log('  why it fails : ' + a.why);
    } else if (onSite) {
      console.log('ok             ' + a.where + ' — site says no fee and nothing active sells one');
    } else {
      console.log('n/a            ' + a.where + ' — phrase not in the live bundle (copy changed?)');
    }
  }

  // 4. Every active APEX PSI price, paired with the ONE checkout link that can charge it.
  //
  // This replaces the account-level guess the first version had to admit in a NOTE. A Stripe
  // payment link carries its price id, so the pairing is provable: fetch the links, ask each one
  // what it charges, then match that price id against the ids in the links the served file carries.
  // Nothing about a name or a substring is trusted any more.
  const LINK_RE = /buy\.stripe\.com\/([A-Za-z0-9]+)/g;
  const bundleSlugs = [...new Set([...bundle.matchAll(LINK_RE)].map(m => m[1]))];

  const allLinks = [];
  for (const l of (await stripe('/v1/payment_links?limit=100')).data || []) allLinks.push(l);
  const charges = {};            // slug -> { active, priceIds, amounts }
  for (const l of allLinks) {
    // line_items comes back EMPTY unless it is asked for, and an empty read looks exactly like
    // a link that charges nothing. Measured 20 October: the first version of this pairing read
    // zero prices from every link and reported both live buttons as dead checkouts.
    const detail = await stripe('/v1/payment_links/' + l.id + '?expand[]=line_items.data.price');
    const items = (detail.line_items && detail.line_items.data) || [];
    const priceIds = items.map(it => (typeof it.price === 'string' ? it.price : it.price && it.price.id)).filter(Boolean);
    const slug = String(l.url || '').split('/').pop();
    charges[slug] = { active: !!l.active, priceIds, amounts: items.map(it => it.amount_total / 100) };
  }
  const slugHasLivePrice = (slug) =>
    charges[slug] && charges[slug].active &&
    charges[slug].priceIds.some(id => sellable.some(s => s.id === id));

  console.log(`checkout links in the live bundle: ${bundleSlugs.length}` +
    (bundleSlugs.length ? ' — ' + bundleSlugs.map(s => 'buy.stripe.com/' + s).join(', ') : ''));

  // A button on the page that cannot charge is a lie a customer can click, so it is fatal.
  // --self-test injects a link that cannot exist on any account and requires the guard to catch it,
  // because an assertion that has never failed is not evidence that anything was measured.
  const SELF_TEST = process.argv.includes('--self-test');
  const FAKE_SLUG = 'selftestnotareallink0';
  const checkSlugs = SELF_TEST ? bundleSlugs.concat([FAKE_SLUG]) : bundleSlugs;
  const faults = [];
  const fault = (msg) => { faults.push(msg); console.log('CONTRADICTION  ' + msg); };
  for (const slug of checkSlugs) {
    if (!charges[slug]) {
      bad++;
      fault('the served page links buy.stripe.com/' + slug + ', which is not a link on this account');
    } else if (!slugHasLivePrice(slug)) {
      bad++;
      fault('the served page links buy.stripe.com/' + slug +
        ` but that link is ${charges[slug].active ? 'charging a price the account no longer sells' : 'marked inactive'} — a customer would reach a dead checkout`);
    }
  }

  const psi = sellable.filter(s => /APEX PSI/i.test(s.name));
  const reachable = new Set();
  for (const slug of bundleSlugs) for (const id of (charges[slug] || {}).priceIds || []) if (slugHasLivePrice(slug)) reachable.add(id);

  console.log('\nEvery APEX PSI price the account sells, against the link that can charge it:');
  for (const s of psi) {
    const onPage = reachable.has(s.id);
    const linkOwnsIt = Object.entries(charges).filter(([, c]) => c.active && c.priceIds.includes(s.id)).map(([k]) => k);
    const quote = bundle.includes('$' + s.amount.split('.')[0]);
    console.log('  ' +
      (onPage ? 'BUYABLE FROM THE PAGE ' : 'no button reaches it  ') + ' | ' +
      (linkOwnsIt.length ? 'a live link charges it' : 'NO LINK CHARGES IT    ') + ' | ' +
      (quote ? 'the number appears in the served file' : 'the number is not in the served file    ') + ' | ' +
      s.name + '  ' + s.amount + ' ' + s.currency + ' ' + s.cadence);
  }
  const orphanPrices = psi.filter(s => !reachable.has(s.id));
  if (orphanPrices.length) {
    console.log('  NOTE: the products above with "no button reaches it" are not a false sentence — the site');
    console.log('  does not quote them as buyable. They are stock the account sells that nobody can buy.');
    console.log('  Each one needs an owner decision: put a price and a button on its page, or archive it.');
  }

  // 5. The name the buyer actually reads at the till.
  //
  // A Stripe payment link renders under the merchant account's public business
  // name, so whoever owns this account is who the customer thinks they are
  // paying. Measured 22 Nov 2026: business_profile.name is "Sovereign AI Film
  // Verse" while both live buttons on the APEX PSI page charge "APEX PSI — Pro
  // $11.00" and "APEX PSI — Ultra $55.00". The identity we publish is the
  // operator at ecosystem.business in public/.well-known/apex-protocol.json, so
  // that file decides what "ours" means — no string hardcoded here.
  const PROTO = new URL('../public/.well-known/apex-protocol.json', import.meta.url);
  let businessUrl = '';
  try {
    const proto = JSON.parse(readFileSync(PROTO, 'utf8'));
    businessUrl = String((proto.ecosystem || {}).business || (proto.links || {}).business || '');
  } catch (e) { console.error('could not read the published operator identity:', e.message); process.exit(2); }
  const brandHost = (businessUrl.match(/^https?:\/\/([^/]+)/i) || [])[1] || '';
  const brandLabels = brandHost.split(/[.-]/).filter((s) => s.length >= 4);
  if (!brandLabels.length) { console.error('published operator URL names no label to match:', businessUrl); process.exit(2); }
  const acct = await stripe('/v1/account');
  const merchantName = (acct.business_profile && acct.business_profile.name)
    || ((acct.settings || {}).dashboard || {}).display_name || '';
  const brandMatches = (name) => !!name && brandLabels.some((l) => String(name).toLowerCase().includes(l.toLowerCase()));
  const apexButtonsLive = psi.some((s) => reachable.has(s.id));
  console.log(`\ntill brand        : merchant name "${merchantName || '(unset)'}" | our published operator: ${brandHost} (${brandLabels.join(', ')})`);
  if (apexButtonsLive && !brandMatches(merchantName)) {
    bad++;
    fault(`the page charges APEX PSI prices from an account named "${merchantName}" — the buyer's card page `
      + `and bank statement name a different business than the product they are buying. Either set the `
      + `account's public business name to ours, or move these prices onto that account.`);
  } else if (apexButtonsLive) {
    console.log('till brand        : ok — the account the buyer pays is named for the product they are buying');
  }

  // 6. Does paying deliver? A button that charges but grants no capacity takes money
  //    for nothing, so it is as fatal as a button that cannot charge.
  let tierMap;
  try {
    tierMap = readTierMap(readFileSync(TIERS_FILE, 'utf8'));
  } catch (e) { console.error('could not read the provisioning tier map at', TIERS_FILE, e.message); process.exit(2); }
  if (!Object.keys(tierMap.prices).length || !tierMap.free) {
    console.error('the provisioning tier map parsed empty — refusing to guess:', TIERS_FILE);
    process.exit(2);
  }
  console.log(`\ntier map        : free ${tierMap.free}/day | ` +
    Object.entries(tierMap.prices).map(([t, id]) => `${t}=${id}`).join(', '));
  const delivery = ruleDelivery(charges, bundleSlugs, tierMap);
  if (!delivery.ok) { bad++; fault(delivery.what); } else console.log('pay delivers     : ok — ' + delivery.note);

  // 7. The endpoints the buy flow runs on. Probing them POSTs an empty body, which each
  //    one rejects before it can read a session, charge a card or write a row.
  const doors = ruleDoors(await probeDoors());
  if (!doors.ok) { bad++; fault('money endpoint: ' + doors.what); } else console.log('doors alive    : ok — ' + doors.note);

  if (SELF_TEST) {
    const caught = faults.some(f => f.includes(FAKE_SLUG));
    console.log('  SELF-TEST  injected a link no account owns -> ' +
      (caught ? 'CAUGHT: this rule can fail, so its passing means something'
              : 'MISSED: this rule is broken and was removed from the estate today'));
    const caughtBrand = !brandMatches('Sovereign AI Film Verse') && brandMatches('Apex Infrastructure');
    console.log('  SELF-TEST  injected the measured merchant name against ours -> ' +
      (caughtBrand ? 'CAUGHT: the brand rule tells the two apart, so its PASS means something'
                  : 'MISSED: the brand rule cannot fail and is decoration'));

    // Rule 4 driven both ways on fabricated store state: a price no tier grants, and a
    // tier whose limit is not above free. Both must be refused; the real map must pass.
    const FAKE_PRICE = 'price_selftestnoplan0000';
    const fakeCharges = { selftestlink0: { active: true, priceIds: [FAKE_PRICE], amounts: [11] } };
    const caughtOrphan = !ruleDelivery(fakeCharges, ['selftestlink0'], tierMap).ok;
    console.log('  SELF-TEST  injected a charged price no tier grants -> ' +
      (caughtOrphan ? 'CAUGHT: money that buys no capacity is refused' : 'MISSED: the delivery rule cannot fail'));
    const equalLimitMap = { free: 100, limits: { pro: 100 }, prices: { pro: FAKE_PRICE } };
    const caughtFlat = !ruleDelivery(fakeCharges, ['selftestlink0'], equalLimitMap).ok;
    console.log('  SELF-TEST  injected a tier priced at the free limit -> ' +
      (caughtFlat ? 'CAUGHT: paying that changes nothing is refused' : 'MISSED: the flat-tier case is not seen'));
    const realPasses = ruleDelivery(charges, bundleSlugs, tierMap).ok;
    console.log('  SELF-TEST  the real served links against the real tier map -> ' +
      (realPasses ? 'PASS as expected' : 'the injected cases are not the live state'));

    // Rule 5 driven both ways: an undeployed door and a door answering 500 must be refused.
    const goodDoors = { '/create-checkout': 401, '/sync-subscription': 401, '/create-api-key': 401, '/stripe-webhook': 400 };
    const caughtMissing = !ruleDoors({ ...goodDoors, '/create-checkout': 404 }).ok;
    const caughtDown = !ruleDoors({ ...goodDoors, '/stripe-webhook': 500 }).ok;
    const doorsPassClean = ruleDoors(goodDoors).ok;
    console.log('  SELF-TEST  injected a 404 door and a 500 door -> ' +
      (caughtMissing && caughtDown && doorsPassClean ? 'CAUGHT: both states refused, clean set accepted' : 'MISSED: the door rule cannot fail'));

    if (!caught || !caughtBrand || !caughtOrphan || !caughtFlat || !caughtMissing || !caughtDown || !doorsPassClean) bad++;
  }

  console.log(bad ? `\nFAIL — ${bad} site-vs-store contradiction(s).` : '\nPASS — site money claims match what the account sells.');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('commerce-truth-check error:', e.message); process.exit(2); });
