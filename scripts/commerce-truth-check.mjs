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
// Two fatal rules, each proven by its own failure case:
//   1. a sentence the site serves that the merchant account contradicts
//      (demonstrated red on 19 October: "there is no fee" beside an active $199.00 monthly listing)
//   2. a checkout button the served page carries that cannot charge
//      (a link that is not on this account, is switched off, or sells only archived prices)
// Everything else it prints is measurement, not verdict: which APEX PSI prices have a
// button, which have none, and which are quoted as a number in the served file.
//
// Usage: node scripts/commerce-truth-check.mjs
// Exit 0 = site and store agree. Exit 1 = contradiction, listed per line. Exit 2 = could not measure.

import { readFileSync } from 'node:fs';

const VAULT = 'C:/Users/apex1/.apex-vault/stripe_payment_links_once.env';
const SITE = 'https://www.ai-governance-standard.com';

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

  if (SELF_TEST) {
    const caught = faults.some(f => f.includes(FAKE_SLUG));
    console.log('  SELF-TEST  injected a link no account owns -> ' +
      (caught ? 'CAUGHT: this rule can fail, so its passing means something'
              : 'MISSED: this rule is broken and was removed from the estate today'));
    if (!caught) bad++;
  }

  console.log(bad ? `\nFAIL — ${bad} site-vs-store contradiction(s).` : '\nPASS — site money claims match what the account sells.');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('commerce-truth-check error:', e.message); process.exit(2); });
