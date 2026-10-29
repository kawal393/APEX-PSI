/**
 * The commerce face — apex-infrastructure.com — measured every morning.
 *
 * Until 29 Oct 2026 this domain had no daily guard: every guard in empire/morning_scan.mjs runs
 * inside psi-hub-merge and reads www.ai-governance-standard.com. Six GREEN checks described a
 * different website while this one quoted three AUD prices with zero checkout strings in its
 * served bundle, and published a legal file denying any package was ever released.
 *
 * Read-only: no Stripe call, no vault key, no write to any repo.
 * Exit 0 = every gate passes. Exit 1 = a gate is FAIL. Exit 2 = the face could not be measured,
 * which is never allowed to read as clean.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const ORIGIN = "https://apex-infrastructure.com";
const UA = "apex-infra-face-check/1.0";
const STATE = "C:/Users/apex1/.openhands/scans/infra-face-last.json";
// Page copy lives in the lazy chunks, not the entry bundle. The flagship face ships ~115 of them,
// so reading a token sample proves nothing — the pricing page is one chunk that a cap can skip.
const MAX_CHUNKS = 200;

const say = (...a) => console.log(...a);

async function get(url, ms = 30000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: ac.signal });
    return { status: r.status, ok: r.ok, text: await r.text() };
  } finally {
    clearTimeout(t);
  }
}

const count = (hay, needle) => hay.split(needle).length - 1;
const all = (hay, re) => [...hay.matchAll(re)];
const uniq = (arr) => [...new Set(arr)];

const faults = [];
const notes = [];
const fail = (gate, msg) => faults.push(`${gate} :: ${msg}`);

// ------------------------------------------------------------------ 0. the served app, in full
const index = await get(ORIGIN + "/");
if (!index.ok) {
  say(`FAIL  infra-face-check — could not read ${ORIGIN}: HTTP ${index.status}`);
  process.exit(2);
}
const bundle = (index.text.match(/index-[A-Za-z0-9_-]+\.js/) || [])[0];
if (!bundle) {
  say("FAIL  infra-face-check — the served index names no entry bundle");
  process.exit(2);
}
const main = await get(`${ORIGIN}/assets/${bundle}`);
if (!main.ok) {
  say(`FAIL  infra-face-check — entry bundle ${bundle} is not served (HTTP ${main.status})`);
  process.exit(2);
}

// Page copy is not in the entry bundle: routes are lazy chunks. Fetch them all, or the check
// would read an empty shell and call the site honest.
const chunkNames = uniq(
  all(main.text, /["'](\/?assets\/)?([A-Za-z][A-Za-z0-9._-]{3,80}\.js)["']/g)
    .map((m) => m[2])
    .filter((n) => n !== bundle && !n.startsWith("index-")),
).slice(0, MAX_CHUNKS);

let app = index.text + "\n" + main.text;
let chunksRead = 0;
for (const c of chunkNames) {
  try {
    const r = await get(`${ORIGIN}/assets/${c}`, 20000);
    if (r.ok) {
      app += "\n" + r.text;
      chunksRead += 1;
    }
  } catch {
    /* one dead chunk is reported, it does not stop the measurement */
  }
}
notes.push(`served app read: index + ${bundle} + ${chunksRead}/${chunkNames.length} lazy chunks, ${(app.length / 1024).toFixed(0)} KB`);

// ------------------------------------------------------------------ 1. robots and sitemap agree
const robots = await get(ORIGIN + "/robots.txt");
const sitemap = await get(ORIGIN + "/sitemap.xml");
if (!robots.ok || !sitemap.ok) {
  fail("machine-files", `robots.txt HTTP ${robots.status}, sitemap.xml HTTP ${sitemap.status}`);
}

const disallowed = robots.ok
  ? uniq(all(robots.text, /^Disallow:\s*(\/\S*)/gm).map((m) => m[1].replace(/\/+$/, "") || "/"))
  : [];
const sited = uniq(
  sitemap.ok ? all(sitemap.text, /<loc>([^<]+)<\/loc>/g).map((m) => m[1].replace(ORIGIN, "").replace(/\/+$/, "") || "/") : [],
);
if (sited.length === 0) fail("machine-files", "sitemap.xml served no <loc> entries");

for (const u of sited) {
  if (disallowed.some((d) => d !== "/" && (u === d || u.startsWith(d + "/")))) {
    fail("declared-but-hidden", `${u} is in sitemap.xml AND in robots Disallow — crawlers are told to fetch it and to stay out`);
  }
}

// ------------------------------------------------------------------ 2. every declared address answers
for (const u of sited) {
  if (u.endsWith(".md") || u.includes(".json")) {
    const r = await get(ORIGIN + u, 20000);
    if (!r.ok) fail("address-dead", `${u} is in the sitemap but serves HTTP ${r.status}`);
  }
}

// ------------------------------------------------------------------ 3. the paid door is declared
const routes = uniq(all(main.text, /path\s*:\s*"\/([a-z0-9:_-]*)"/g).map((m) => m[1]));
if (routes.includes("pricing") && !sited.includes("/pricing")) {
  fail("paid-door-undeclared", `/pricing is a live route in the served bundle but is not in sitemap.xml — the only page that takes money is the one no crawler or guard is told about`);
}
notes.push(`routes in the served bundle: ${routes.length}; addresses declared in the sitemap: ${sited.length}`);

// ------------------------------------------------------------------ 4. a quoted price has a till
// The first version of this gate looked for buy.stripe.com / checkout.stripe.com / pk_live_ and
// reported RED on a working system. That was wrong and it nearly caused a wrong business
// conclusion: this site never puts a Stripe string in the browser. The button calls the Supabase
// function "stripe-checkout", which opens a Stripe Checkout session server-side and returns its
// URL, so a correct check has to follow that mechanism end to end — the call in the shipped
// chunks, the button that fires it, and the function actually being deployed.
const checkout = {
  "buy.stripe.com": count(app, "buy.stripe.com"),
  "checkout.stripe.com": count(app, "checkout.stripe.com"),
  pk_live_: count(app, "pk_live_"),
};
const tillInvoke = count(app, "stripe-checkout");
const tillButton = count(app, "Continue to payment");
const sbHosts = uniq(all(app, /https:\/\/[a-z0-9]{15,25}\.supabase\.co/g));
let tillLive = "unknown";
for (const host of sbHosts) {
  const r = await get(`${host}/functions/v1/stripe-checkout`);
  if (r.status === 404) continue;
  tillLive = r.ok || r.status === 400 || r.status === 500 ? `${host} -> HTTP ${r.status}` : `HTTP ${r.status}`;
  break;
}
const quoted = uniq(
  all(app, /AUD\s*\$?\s?([\d]{1,3}(?:,\d{3})*(?:\.\d+)?)(\s?\/\s?(?:mo|month|year|once|forever))?/g).map((m) => m[0].replace(/\s+/g, " ").trim()),
);
notes.push(`direct stripe links in the served app (0 is normal here): ${JSON.stringify(checkout)}`);
notes.push(`till mechanism: invoke("stripe-checkout") x${tillInvoke}, "Continue to payment" x${tillButton}, function ${tillLive}`);
notes.push(`AUD price strings quoted across the served app: ${quoted.length ? quoted.join(" | ") : "none"}`);
if (quoted.length > 0 && (tillInvoke === 0 || tillButton === 0)) {
  fail("price-with-no-till", `the app quotes ${quoted.length} AUD prices but the checkout call or its button is missing from the shipped chunks (invoke x${tillInvoke}, button x${tillButton}) — a quoted price nobody can pay`);
} else if (quoted.length > 0 && tillLive === "unknown") {
  fail("price-with-no-till", `the page can ask for money but no deployed stripe-checkout function answered on any supabase host in the bundle (${sbHosts.join(", ") || "none found"}) — the button would fail at click`);
}

// ------------------------------------------------------------------ 5. the legal file and the shelves
const mark = await get(ORIGIN + "/TRADEMARK.md");
if (mark.ok) {
  const denies = /no Apex package has ever been published/i.test(mark.text);
  const shelves = [];
  try {
    const n = await get("https://registry.npmjs.org/apex-psi-verifier/latest", 15000);
    if (n.ok) shelves.push(`npm apex-psi-verifier ${JSON.parse(n.text).version}`);
  } catch {}
  try {
    const p = await get("https://pypi.org/pypi/psi-verifier/json", 15000);
    if (p.ok) shelves.push(`PyPI psi-verifier ${p.text && "serves"}`);
  } catch {}
  if (denies && shelves.length) {
    fail("shelf-denial", `the served TRADEMARK.md states "no Apex package has ever been published to the npm or PyPI registry" while ${shelves.join(" and ")} — a stranger disproves our own legal page in one minute`);
  }
} else {
  fail("address-dead", `TRADEMARK.md serves HTTP ${mark.status}`);
}

// ------------------------------------------------------------------ 6. copy claims one count
const companyCounts = uniq(all(app, /([\d]{1,3}(?:,\d{3})*) (?:companies|entities|tracked entities)/g).map((m) => m[1]));
if (companyCounts.length > 1) {
  fail("count-conflict", `the served app counts the same universe as ${companyCounts.join(" vs ")} — pick one number or name what each one counts`);
}

// ------------------------------------------------------------------ 7. the face moved?
let drift = "first measurement — nothing to compare";
if (existsSync(STATE)) {
  try {
    const prev = JSON.parse(readFileSync(STATE, "utf8"));
    if (prev.bundle && prev.bundle !== bundle) {
      drift = `MOVED — served bundle ${prev.bundle} (${prev.readAt}) is now ${bundle}`;
    } else {
      drift = `unchanged since ${prev.readAt}`;
    }
  } catch {
    drift = "previous state unreadable";
  }
}
writeFileSync(
  STATE,
  JSON.stringify({ readAt: new Date().toISOString(), bundle, routes: routes.length, chunksRead, quoted, checkout }, null, 2) + "\n",
  "utf8",
);
notes.push(`bundle drift: ${drift}`);

// ------------------------------------------------------------------ report
say("APEX COMMERCE FACE — apex-infrastructure.com, read-only");
for (const n of notes) say(`  note  ${n}`);
for (const f of faults) say(`  FAULT ${f}`);
say("");
const verdict = faults.length
  ? `FAIL — ${faults.length} gate(s) red on the commerce face: ${faults.map((f) => f.split(" :: ")[0]).join(", ")}`
  : "PASS — the commerce face declares its addresses, names a till under every price it quotes, and its legal pages agree with its shelves";
say(`${verdict} | bundle ${bundle} | ${discoveredLabel(sited, routes)}`);
process.exit(faults.length ? 1 : 0);

function discoveredLabel(sited, routes) {
  return `sitemap ${sited.length} addresses, bundle ${routes.length} routes`;
}
