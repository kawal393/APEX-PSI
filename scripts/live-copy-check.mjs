// Prove the LIVE SITE says what the repository says.
//
// Why this exists: the IETF sweep and the registry guard both checked artifacts we
// control — the source tree and the package stores. Neither checked the file a visitor
// actually loads. Three under-claims about the published verifier survived an entire
// publish for exactly that reason (found 19 Oct, fixed at d54a9fc), so the third door
// gets its own guard: fetch the served bundle by name from the served index, and assert
// on the strings inside it.
//
// Usage:  node scripts/live-copy-check.mjs [site]
// Exit 0 only when every MUST string is present and every MUST-NOT string is absent.
// The failure case is proved, not assumed: pass a stale bundle name and it exits 1.

const SITE = process.argv[2] || 'https://www.ai-governance-standard.com';

// Sentences the corrected copy states as fact. Substrings, not full lines, so a
// rewrap in the bundler cannot fake a failure.
const MUST = [
  ['throttle on /architecture', 'allows 20 lookups per minute per address; past that it answers HTTP 429'],
  ['throttle on /psi-05', '20 lookups per minute per address, then HTTP 429'],
  ['standard page banner', 'FILED 13 OCT 2026, NOT AN APPROVED STANDARD'],
  ['regulator card', 'Individual Internet-Draft, filed 13 Oct 2026'],
  ['filed http draft revision', 'draft-singh-psi-http-00'],
  ['datatracker is linked', 'datatracker.ietf.org/doc/draft-singh-psi-http/'],
  ['capacity-not-finding doctrine', 'never a finding'],
  ['corrections 19 Oct entry', '19 October 2026'],
];

// Claims that are false today. `has not been filed` appears once on the live site and
// it is inside a QUOTED historical entry on /corrections, which is never edited, so it
// is not listed here — the list holds only claims that must never appear again.
const MUST_NOT = [
  ['Unlimited verifications', 'Unlimited verifications'],
  ['Unlimited everything', 'Unlimited everything'],
  ['free verification is unlimited', 'Free verification is unlimited'],
  ['never-filed claim', 'has never been filed'],
  ['unfiled label', 'unfiled'],
  ['registry under-claim', 'Not published to a registry yet'],
  ['registry under-claim (cards)', 'Neither is published to a package registry yet'],
];

const count = (haystack, needle) => haystack.split(needle).length - 1;

const indexRes = await fetch(`${SITE}/?t=${Date.now()}`, {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' },
});
const html = await indexRes.text();
const names = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))];
if (names.length !== 1) {
  console.log(`FAIL expected exactly one entry bundle, found ${names.length}: ${names.join(', ')}`);
  process.exit(1);
}

const bundleRes = await fetch(`${SITE}/assets/${names[0]}?t=${Date.now()}`, {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' },
});
const js = await bundleRes.text();
console.log(`site ${SITE} -> ${names[0]} (${js.length} B), HTTP ${indexRes.status}/${bundleRes.status}`);

let failed = 0;
for (const [what, s] of MUST) {
  const n = count(js, s);
  if (n > 0) console.log(`  ok   present: ${what} x${n}`);
  else { console.log(`  FAIL missing:  ${what}`); failed++; }
}
for (const [what, s] of MUST_NOT) {
  const n = count(js, s);
  if (n === 0) console.log(`  ok   absent:   ${what}`);
  else { console.log(`  FAIL live claim: ${what} x${n}`); failed++; }
}

if (failed) {
  console.log(`\n${failed} problem(s). The live site does not match the repository.`);
  process.exit(1);
}
console.log('\nLive copy matches the corrected repository on every probe.');
