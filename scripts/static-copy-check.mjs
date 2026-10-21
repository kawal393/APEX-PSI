// Prove the LIVE STATIC FILES equal the ones in this repository.
//
// Why this exists: live-copy-check.mjs reads the served JS bundle, which is where every
// React sentence lives. It cannot see public/*.txt — and public/llms.txt is exactly where a
// false standards claim survived. It still told readers that "draft-singh-psi-http is in
// preparation and has not been filed" on 21 Oct 2026, five days after we measured all five
// drafts returning HTTP 200 and corrected nineteen HTML surfaces. A machine-readable surface
// that no guard reads is a surface that drifts.
//
// Usage:  node scripts/static-copy-check.mjs [site]
// Exit 0 - every watched static file is byte-identical to the committed copy.
// Exit 3 - a file differs: either Lovable has not published main yet, or the live copy has
//          drifted away from the repo. Both are reportable; neither is a pass.
// Exit 1 - a fetch failed, or the live copy carries a claim on the never-again list.
// 3 rather than 2 on purpose: 2 already means "the guard could not run" to commerce-truth-check
// and to the morning scan, and "not published yet" is a different fact from "cannot check".

const SITE = process.argv[2] || 'https://www.ai-governance-standard.com';
const BASE = 'https://ai-governance-standard.com';

// Files in public/ that a stranger or a model can read and quote.
const WATCH = ['llms.txt', 'llms-full.txt'];

// Claims that are false today, asserted against the LIVE bytes whatever else happens,
// so a republish cannot smuggle them back.
const MUST_NOT = [
  ['llms.txt', ['has not been filed', 'in preparation and has not been filed']],
];

const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
let differs = 0;
let fatal = 0;

for (const file of WATCH) {
  const res = await fetch(`${BASE}/${file}?t=${Date.now()}`, { headers }).catch((e) => null);
  if (!res) {
    console.log(`FAIL ${file}: network`);
    fatal++;
    continue;
  }
  const live = await res.text();
  if (res.status !== 200) {
    console.log(`MISSING ${file}: HTTP ${res.status} (not published yet)`);
    differs++;
    continue;
  }
  let local = null;
  try {
    local = await Bun.file(`public/${file}`).text();
  } catch {
    const { readFileSync } = await import('node:fs');
    try {
      local = readFileSync(`public/${file}`, 'utf8');
    } catch {
      console.log(`FAIL ${file}: no committed copy to compare against`);
      fatal++;
      continue;
    }
  }
  const norm = (s) => s.replace(/\r\n/g, '\n');
  if (norm(live) === norm(local)) {
    console.log(`MATCH ${file}: live equals committed (${live.length} B)`);
  } else {
    console.log(`DRIFT ${file}: live ${live.length} B vs committed ${local.length} B`);
    differs++;
  }
  for (const [target, needles] of MUST_NOT) {
    if (target !== file) continue;
    for (const needle of needles) {
      const hits = live.split(needle).length - 1;
      if (hits > 0) {
        console.log(`FAIL ${file}: serves a claim we measured false — "${needle}" x${hits}`);
        fatal++;
      }
    }
  }
}

if (fatal) {
  console.log(`\nstatic-copy-check: ${fatal} fatal finding(s)`);
  process.exit(1);
}
if (differs) {
  console.log(`\nstatic-copy-check: ${differs} file(s) not yet matching main — publish pending, not a pass.`);
  process.exit(3);
}
console.log('\nstatic-copy-check: every watched static file is live and matches the repository.');
