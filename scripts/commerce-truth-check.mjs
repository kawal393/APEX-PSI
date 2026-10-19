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
// Usage: node scripts/commerce-truth-check.mjs
// Exit 0 = site and store agree. Exit 1 = contradiction, listed per line.

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

  // 4. Paid APEX PSI products a visitor cannot actually buy from the page.
  const psi = sellable.filter(s => /APEX PSI/i.test(s.name) && /Pro|Ultra|Registry|Article 50|Prover/i.test(s.name));
  console.log('\nAPEX PSI products the merchant account sells, vs whether the live bundle names a price for them:');
  for (const s of psi) {
    const priced = bundle.includes('$' + s.amount.split('.')[0]) || bundle.includes(s.amount);
    console.log('  ' + (priced ? 'price visible ' : 'NO PRICE ON SITE') + '  ' + s.name + '  ' + s.amount + ' ' + s.currency + ' ' + s.cadence);
  }

  console.log(bad ? `\nFAIL — ${bad} site-vs-store contradiction(s).` : '\nPASS — site money claims match what the account sells.');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('commerce-truth-check error:', e.message); process.exit(2); });
