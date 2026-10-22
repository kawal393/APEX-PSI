// Prove the repository itself does not contain the badge claims we cut on 23 Oct.
//
// live-copy-check.mjs reads what the world loads, so between a commit and a Lovable publish it
// is correctly RED. That window is where a regression hides: nobody reads the served bundle
// while it is being rewritten. This guard reads the source tree, so the same phrases are
// refused before anything ships.
//
// Usage:  node scripts/badge-copy-check.mjs [root]
// Exit 0 when no watched phrase survives in src/ or public/. Exit 1 on the first hit, with the
// file and line. The failure case is proved in the header comment of the commit that added it:
// drop any of these strings back into a page and this script stops the tree.

const ROOT = process.argv[2] || ".";
const DIRS = ["src", "public"];

// phrase -> why it is forbidden. A seal proves a record was made and has not changed; it is
// never a rating, an endorsement, or a verdict on content. There is no scoring engine in this
// product: compliance_score is a number a person types into a form, so no surface may call it
// a verified score.
const BANNED = [
  ["PSI Verified", 'grants a verdict the ledger never issues; it was also a badge anyone could download without sealing anything'],
  ["APEX Verified badge", "sells a verification that no code performs"],
  ["Apex PSI Score", "promises a score that does not exist"],
  ["Real-time score", "promises a live metric nothing computes"],
  ["Auto-updates as your score changes", "promises a live metric nothing computes"],
  ["building trust with customers and regulators", "aims a self-issued mark at regulators"],
  ["Show your real-time compliance status", "promises a verified compliance state"],
  ["Digital Truth", "a seal proves a statement was MADE, not that it is true"],
  ["digital truth", "a seal proves a statement was MADE, not that it is true"],
  ["Cryptographic truth", "cryptography evidences a record; it cannot certify truth"],
  ["cryptographic truth", "cryptography evidences a record; it cannot certify truth"],
  ["truth receipt", "the receipt is tamper-evident, not a truth claim"],
  ["Truth Stamp", "a seal marks when a record existed, not that it is true"],
  ["truth stamp", "a seal marks when a record existed, not that it is true"],
  ["truth-stamping", "a seal marks when a record existed, not that it is true"],
];

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
      walk(p);
    } else if (/\.(tsx?|jsx?|json|html|svg|md|txt)$/.test(entry)) {
      files.push(p);
    }
  }
};
for (const d of DIRS) {
  try {
    walk(join(ROOT, d));
  } catch {
    console.log(`FAIL no ${d}/ directory to read`);
    process.exit(1);
  }
}

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [phrase, why] of BANNED) {
      if (line.includes(phrase)) hits.push({ file, line: i + 1, phrase, why });
    }
  });
}

if (hits.length) {
  console.log(`badge-copy-check: ${hits.length} claim(s) in the source tree that we measured false:`);
  for (const h of hits) console.log(`  ${h.file}:${h.line} — "${h.phrase}" — ${h.why}`);
  process.exit(1);
}
console.log(`badge-copy-check: ${files.length} source files carry none of the ${BANNED.length} cut claims.`);
