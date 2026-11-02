/*
 * APEX REGISTRY SELF-AUDIT — reads every row of the live registry and re-does the arithmetic
 * the row itself claims, from the numbers written in that row.
 *
 * Why: the homepage says "1,859 findings now public across 1,506 companies — FY2024 and FY2025
 * filed numbers recomputed from source filings, cited and sealed." Those counts come from a
 * database view and match the table exactly. What had never been measured is whether each row's
 * own arithmetic holds. A registry that publishes its own error rate is stronger than one that
 * asks to be believed.
 *
 * First rule of this script: the extractor is guilty until proven innocent. An earlier run
 * called 33% of the registry FAIL because it read "FY2025" and "2025-12-31" and "20-F" as
 * amounts. Every number below is printed with the exact expression the machine used, so a bad
 * verdict can be seen as bad.
 *
 * A row counts PASS only when this script can recompute the row's own stated figure. Anything it
 * cannot recompute is UNCHECKED with the reason — never a pass. Coverage is always printed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const say = (...a) => console.log(...a);
const SITE = "https://apex-infrastructure.com";
// The registry address and the public anon key are both shipped inside the page's own JavaScript,
// so the guard reads them from there rather than from a file a person made once. If the project
// moves, the guard follows it instead of going quietly blind.
let base = "",
  key = "";
try {
  const idx = await (await fetch(`${SITE}/`, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) })).text();
  const entry = (idx.match(/src="(\/assets\/index-[^"]+\.js)"/) || [])[1];
  if (!entry) throw new Error("index.html names no entry bundle");
  const js = await (await fetch(SITE + entry, { signal: AbortSignal.timeout(60000) })).text();
  base = (js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/) || [""])[0];
  key = (js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/) || [""])[0];
} catch (e) {
  say(`BROKEN — the served page could not be read (${e.message}), so the registry was not audited. This is not a pass.`);
  process.exit(2);
}
if (!base || !key) {
  say("BROKEN — the served page does not name a registry address and a public key. Nothing below is measured.");
  process.exit(2);
}

const COLS =
  "id,ticker,market,metric,own_claim,apex_recomputation,variance,finding,finding_severity,status,source_url,verify_label,psi_merkle_leaf,as_of";

const rows = [];
for (let off = 0; ; off += 1000) {
  const r = await fetch(`${base}/rest/v1/reconciliation_rows?select=${COLS}&order=id.asc&limit=1000&offset=${off}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    say(`BROKEN — HTTP ${r.status} at offset ${off}; read ${rows.length} rows before failing. No verdict below is full coverage.`);
    process.exit(2);
  }
  const j = await r.json();
  rows.push(...j);
  if (j.length < 1000) break;
  if (off > 20000) break;
}
say(`ROWS READ: ${rows.length} — paged 1000 at a time until a short page, so this is the whole table.`);

// The homepage quotes the view, so the view is asked how many rows it thinks exist. Reading fewer
// than that would make every percentage below a sample dressed as a census.
const statsRow = await (await fetch(`${base}/rest/v1/apex_stats?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json().catch(() => null);
const declared = statsRow?.[0]?.total_rows ?? null;
if (declared !== null && declared !== rows.length) {
  say(`BROKEN — the site's own view says ${declared} rows; ${rows.length} were read. This is not a pass.`);
  process.exit(2);
}
if (declared !== null) say(`COVERAGE PROVEN: the view declares ${declared} rows and ${rows.length} were read.`);

/* Years, filing identifiers and ISO dates are not amounts. Removing them before extracting is the
 * whole difference between this run and the one that blamed the registry for my own parser. */
const denoise = (s) =>
  String(s || "")
    .replace(/\d{4}-\d{2}-\d{2}/g, " ")
    .replace(/\bFY\s?\d{4}\b/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\b\d{1,2}-[A-Z]\b/g, " ")
    .replace(/\b20-F\b|\b10-K\b|\b10-Q\b/g, " ")
    .replace(/p\.\s?\d+/gi, " ");

const AMT = /-?\d[\d,]*(?:\.\d+)?/g;
const amounts = (s) => [...denoise(s).matchAll(AMT)].map((m) => Number(m[0].replace(/,/g, ""))).filter((n) => Number.isFinite(n) && Math.abs(n) > 1);
const pct = (s) => {
  const m = String(s || "").match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};
// Indian lakh/crore grouping: "2,19,013 cr" is 219013 crore, not 2 crore 19 lakh 13 — read as a block.
const labelled = (s, re) => {
  const m = denoise(s).match(re);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

const isVendor = (r) => /cross-source|market data feed|data vendor|market data/i.test(`${r.metric} ${r.apex_recomputation} ${r.finding}`);

const tally = { PASS: [], FAIL: [], UNCHECKED: [] };
const kinds = {};
const push = (v, r, note) => {
  tally[v].push({ ticker: r.ticker, metric: r.metric, severity: r.finding_severity, variance: r.variance, note });
  r._v = v;
  r._note = note;
};

const uNorm = (u) => ({ INR: "₹", Rs: "₹", "Rs.": "₹", AUD$: "AUD", US$: "USD" })[u] || u || "";
// A margin row is any "<Something> margin" or "return on <something>", and the two figures it needs
// are the two labels the metric name itself points at. Matching on the metric's own words keeps a
// gross-margin row from being judged by net-income arithmetic, which is what made the first runs lie.
const METRIC_LABELS = {
  "net profit margin": [/revenue/i, /net income|net profit|profit after tax|profit for the (?:year|period)/i],
  "net margin": [/revenue/i, /net income|net profit|profit after tax/i],
  "operating margin": [/revenue/i, /operating (?:income|profit)/i],
  "gross margin": [/revenue/i, /gross profit/i],
  "pretax margin": [/revenue/i, /pre-?tax (?:income|profit)|income before tax/i],
};

const findAmount = (s, re) => {
  // The label patterns are alternations, so they must be grouped before the amount suffix is
  // appended — otherwise only the last alternative carries a capture group and m[1] is undefined.
  // The gap is lazy and the capture may start with a minus, so "Net income -71,000,000" keeps its
  // sign. An earlier run used a greedy gap and a digit-only capture and reported 490 rows as wrong
  // because every loss had been read as a profit.
  const rx = new RegExp("(?:" + re.source + ")[^0-9\\-]{0,22}?(-?[\\d,]*\\d(?:\\.\\d+)?)", "gi");
  for (const m of denoise(s).matchAll(rx)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && Math.abs(n) > 1) return n;
  }
  return null;
};

/* The whole verdict lives in one function so the tamper fixtures below are judged by exactly the
 * arithmetic the registry is judged by. A failure case that runs different code proves nothing. */
const judge = (r) => {
  const kind = isVendor(r) ? "vendor-vs-filing" : /margin|return|ratio|ROE|ROA|%/i.test(`${r.metric} ${r.apex_recomputation}`) ? "ratio" : "amount";
  kinds[kind] = (kinds[kind] || 0) + 1;

  if (kind === "vendor-vs-filing")
    return { v: "UNCHECKED", n: "compares the filed document to a market data feed — there is no company arithmetic here to re-check" };

  // Growth rows state two periods and a percentage between them. They are the largest family in the
  // registry, so leaving them unchecked would have made the coverage claim worthless.
  if (/growth|change yoy|vs prior period|increased|declined/i.test(r.metric)) {
    const pair = amounts(r.own_claim);
    const stated = pct(r.apex_recomputation) ?? pct(r.variance);
    if (pair.length < 2 || stated === null) return { v: "UNCHECKED", n: "growth row, but its own text does not print both periods as numbers" };
    // The row prints its periods in order ("FY2024 revenue A; FY2025 revenue B"), so the direction
    // is the row's own and not chosen to fit the answer.
    const [from, to] = [pair[0], pair[1]];
    const got = ((to - from) / Math.abs(from)) * 100;
    return { v: Math.abs(got - stated) <= 1.5 ? "PASS" : "FAIL", n: `growth from ${from.toLocaleString()} to ${to.toLocaleString()} = ${got.toFixed(2)}% against the ${stated}% the row prints` };
  }

  if (kind === "ratio") {
    const key = Object.keys(METRIC_LABELS).find((k) => new RegExp(k, "i").test(r.metric));
    const stated = pct(r.apex_recomputation);
    if (!key || stated === null) return { v: "UNCHECKED", n: `the metric names a ratio this script has no label rule for (${String(r.metric).slice(0, 40)})` };
    const [reA, reB] = METRIC_LABELS[key];
    const den = findAmount(r.own_claim, reA), num = findAmount(r.own_claim, reB);
    if (den === null || num === null || !den)
      return { v: "UNCHECKED", n: `${key} row, but ${num === null ? "the profit figure" : "the revenue figure"} is not labelled in its own text` };
    const got = (num / den) * 100;
    return { v: Math.abs(got - stated) <= 0.6 ? "PASS" : "FAIL", n: `${key}: ${num} / ${den} = ${got.toFixed(2)}% against the ${stated}% the row prints` };
  }

  // amount rows: the row's own variance field must follow from the row's own two figures
  const stated = pct(r.variance);
  const a = amounts(r.own_claim), b = amounts(r.apex_recomputation);
  if (!a.length || !b.length || stated === null) return { v: "UNCHECKED", n: "no clean pair of amounts, or no variance printed, to recompute" };
  const uA = uNorm((String(r.own_claim).match(/USD|AUD|GBP|JPY|EUR|INR|₹|tonnes|kg|cr\b|%/) || [])[0] || "");
  const uB = uNorm((String(r.apex_recomputation).match(/USD|AUD|GBP|JPY|EUR|INR|₹|tonnes|kg|cr\b|%/) || [])[0] || "");
  if (uA !== uB) return { v: "UNCHECKED", n: `the two sides carry different or missing units (${uA || "none"} vs ${uB || "none"}) — cannot be compared as written` };
  // Two sides of the same claim sit in the same order of magnitude. A percentage next to a
  // billion-dollar amount is this script reading the wrong pair, so it is not a registry failure.
  if (Math.max(Math.abs(a[0]), Math.abs(b[0])) / Math.max(1, Math.min(Math.abs(a[0]), Math.abs(b[0]))) > 100)
    return { v: "UNCHECKED", n: `the two amounts are ${Math.max(a[0], b[0]).toLocaleString()} and ${Math.min(a[0], b[0]).toLocaleString()} — not the same kind of number` };
  const got = ((b[0] - a[0]) / Math.abs(a[0])) * 100;
  return { v: Math.abs(got - stated) <= 1 ? "PASS" : "FAIL", n: `${b[0]} against ${a[0]} = ${got.toFixed(2)}% against the ${stated}% the row prints` };
};

for (const r of rows) {
  const { v, n } = judge(r);
  push(v, r, n);
}

const flagged = rows.filter((r) => r.finding_severity && r.finding_severity !== "none");
const fTally = (v) => flagged.filter((r) => r._v === v).length;

say("");
say("1. WHAT KIND OF ROW EACH ONE IS (counted from the row's own words)");
for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) say(`     ${k.padEnd(18)} ${n}`);

say("");
say("2. ARITHMETIC RE-DONE BY MACHINE — whole table, not a sample");
for (const v of ["PASS", "FAIL", "UNCHECKED"])
  say(`     ${v.padEnd(10)} ${String(tally[v].length).padStart(5)}  (${((tally[v].length / rows.length) * 100).toFixed(1)}%)`);
say(`     rows the machine could re-compute: ${tally.PASS.length + tally.FAIL.length} of ${rows.length}`);

say("");
say("3. THE 1,859 THE HOMEPAGE COUNTS, HELD TO THE SAME RULE");
say(`     flagged rows: ${flagged.length} | arithmetic holds: ${fTally("PASS")} | does not hold: ${fTally("FAIL")} | machine could not check: ${fTally("UNCHECKED")}`);

say("");
say("4. WORDS THAT CONTRADICT THEIR OWN NUMBERS (each counted, not estimated)");
const zero = flagged.filter((r) => /^0(\.0+)?%$/.test(String(r.variance || "")));
say(`     flagged rows whose variance reads 0%: ${zero.length}  (of which severity discrepancy/material: ${zero.filter((r) => ["discrepancy", "material"].includes(r.finding_severity)).length})`);
const sev = {};
for (const r of zero) sev[r.finding_severity] = (sev[r.finding_severity] || 0) + 1;
say(`        by severity: ${Object.entries(sev).map(([k, v]) => `${k}=${v}`).join("  ")}`);
say(`     flagged rows comparing a vendor to a filing: ${flagged.filter(isVendor).length}  (of which severity material: ${flagged.filter((r) => isVendor(r) && r.finding_severity === "material").length})`);
for (const r of flagged.filter((x) => x.finding_severity === "material"))
  say(`        MATERIAL ${r.ticker.padEnd(9)} variance ${String(r.variance).padEnd(9)} vendor-comparison: ${isVendor(r) ? "YES" : "no "} | ${String(r.metric).slice(0, 46)}`);

say("");
say("5. 'CITED AND SEALED', CHECKED ROW BY ROW");
const line = (l, n, of) => say(`     ${l.padEnd(50)} ${String(n).padStart(5)} / ${of}${n === of ? "   ALL" : ""}`);
line("rows carrying a PSI merkle leaf", rows.filter((r) => r.psi_merkle_leaf).length, rows.length);
line("rows carrying any source address", rows.filter((r) => r.source_url).length, rows.length);
line("rows naming a regulator as the source", rows.filter((r) => /SEC EDGAR|ASX|10-K|EDGAR/i.test(r.verify_label || "")).length, rows.length);
line("rows naming Yahoo Finance as the source", rows.filter((r) => /yahoo/i.test(r.verify_label || "")).length, rows.length);
line("rows naming no source at all", rows.filter((r) => !r.verify_label).length, rows.length);
say("     — restricted to the flagged 1,859 the homepage speaks for —");
line("flagged rows carrying a PSI merkle leaf", flagged.filter((r) => r.psi_merkle_leaf).length, flagged.length);
line("flagged rows naming a regulator", flagged.filter((r) => /SEC EDGAR|ASX|10-K|EDGAR/i.test(r.verify_label || "")).length, flagged.length);
line("flagged rows that cannot back the word 'filings'", flagged.filter((r) => !/SEC EDGAR|ASX|10-K|EDGAR/i.test(r.verify_label || "")).length, flagged.length);

say("");
say("6. WHAT THE MACHINE COULD NOT RE-CHECK, AND WHY (the honest ceiling of this audit)");
const reasons = {};
for (const r of tally.UNCHECKED) reasons[r.note.replace(/—.*$/, "").trim()] = (reasons[r.note.replace(/—.*$/, "").trim()] || 0) + 1;
for (const [k, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 6)) say(`     ${String(n).padStart(5)}  ${k}`);

say("");
say("7. THE ROWS THAT FAILED, WITH THE EXPRESSION THE MACHINE USED");
for (const r of tally.FAIL.slice(0, 15)) say(`     ${r.ticker.padEnd(9)} ${String(r.severity).padEnd(12)} ${r.note}`);
if (!tally.FAIL.length) say("     none — no row this machine re-computed disagreed with its own printed answer.");

// A checker that has never said NO is an unverified claim. Four rows with arithmetic a person can
// do in their head — three deliberately wrong, one right — go through the same judge() the live
// registry went through. If the wrong ones are not caught, nothing above means anything.
const keepKinds = JSON.stringify(kinds);
const PLANTED = [
  { ticker: "PLANT-MARGIN-WRONG", metric: "Net Profit Margin (FY2025)", own_claim: "Revenue 1000000000; Net income 250000000", apex_recomputation: "40.00% net margin (recomputed)", variance: "0.00%", finding_severity: "note" },
  { ticker: "PLANT-GROWTH-WRONG", metric: "Revenue Growth FY2024 → FY2025", own_claim: "FY2024 revenue 1000000000; FY2025 revenue 1200000000", apex_recomputation: "50.0% year-over-year (recomputed)", variance: "50.0%", finding_severity: "note" },
  { ticker: "PLANT-AMOUNT-WRONG", metric: "Revenue restated FY2025", own_claim: "Revenue as originally filed 1000000000 USD", apex_recomputation: "Revenue as restated 1100000000 USD", variance: "50.0%", finding_severity: "discrepancy" },
  { ticker: "PLANT-CORRECT", metric: "Net Profit Margin (FY2025)", own_claim: "Revenue 1000000000; Net income 250000000", apex_recomputation: "25.00% net margin (recomputed)", variance: "0.00%", finding_severity: "none" },
];
const wanted = ["FAIL", "FAIL", "FAIL", "PASS"];
const gotVerdicts = PLANTED.map((r) => judge(r).v);
Object.keys(kinds).forEach((k) => delete kinds[k]);
Object.entries(JSON.parse(keepKinds)).forEach(([k, v]) => (kinds[k] = v));
const caught = gotVerdicts.filter((v, i) => v === wanted[i]).length;
say("");
say("7b. PROOF THIS MACHINE CAN SAY NO (four rows whose arithmetic fits on one line)");
PLANTED.forEach((r, i) => say(`     ${r.ticker.padEnd(22)} expected ${wanted[i].padEnd(5)} got ${gotVerdicts[i]}  ${wanted[i] === gotVerdicts[i] ? "ok" : "<<< THE CHECKER IS BLIND"}`));
say(`     tamper caught: ${caught} of 4`);
if (caught !== 4) {
  say("");
  say("EXIT 1 — the self-audit cannot tell a wrong row from a right one, so every PASS above is unproven.");
  process.exit(1);
}

writeFileSync(  join(homedir(), ".openhands", "scratch", "self_audit.json"),
  JSON.stringify(
    {
      read_at: new Date().toISOString(),
      rows: rows.length,
      kinds,
      tally: { PASS: tally.PASS.length, FAIL: tally.FAIL.length, UNCHECKED: tally.UNCHECKED.length },
      flagged: { total: flagged.length, PASS: fTally("PASS"), FAIL: fTally("FAIL"), UNCHECKED: fTally("UNCHECKED") },
      contradictions: { zero_variance_flagged: zero.length, vendor_flagged: flagged.filter(isVendor).length },
      reasons: Object.entries(
        tally.UNCHECKED.reduce((m, r) => ((m[String(r.note).replace(/—.*$/, "").replace(/\(.*?\)$/, "").trim()] = (m[String(r.note).replace(/—.*$/, "").replace(/\(.*?\)$/, "").trim()] || 0) + 1), m), {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([why, n]) => ({ n, why })),
      fails: tally.FAIL,
      material_rows: flagged.filter((r) => r.finding_severity === "material").map((r) => ({ ticker: r.ticker, variance: r.variance, vendor: isVendor(r), metric: r.metric })),
    },
    null,
    1
  )
);
say("");
say(`MACHINE RECORD WRITTEN: ${join(homedir(), ".openhands", "scratch", "self_audit.json")}`);

if (tally.FAIL.length) {
  say(`EXIT 1 — ${tally.FAIL.length} row(s) print an answer that does not follow from the figures in the same row.`);
  process.exit(1);
}
say(`EXIT 0 — ${tally.PASS.length} rows re-computed by machine, none disagreeing with itself, and the checker proved it can catch a planted error.`);
