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
  // Distinctive to the 20 October entry. Chosen over the date string on purpose: "20 October 2026"
  // already appears once in the served file from unrelated copy, so counting it would pass while the
  // correction itself was still unpublished. This assertion is RED until Lovable publishes main.
  ['corrections 20 Oct entry', 'named a product called PSI Prover API'],
  // Distinctive to the 21 October entry on public/llms.txt. RED until Lovable publishes main.
  ['corrections 21 Oct entry', 'A file no guard reads is a file that will drift'],
  // Distinctive to the 23 October badge rewrite. The badge page used to sell "Display Your
  // Apex PSI Score" and a "real-time score" — there is no scoring engine anywhere in this
  // product, and compliance_score is a number a person types into a form. These two strings
  // are the corrected copy, and they are RED until Lovable publishes main.
  ['badge says it issues no scores', 'APEX PSI issues no scores'],
  ['badge refuses a non-hash', 'not a 64-character SHA-256 hash'],
  // The corrected hero, and the sentence that says what a seal cannot do. Both RED until
  // Lovable publishes main.
  ['hero names records not truth', 'for Verifiable Records'],
  ['hero states the seal limit', 'has not changed since its timestamp'],
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
  // 23 Oct: the badge page promised a score and an endorsement we do not issue. A badge that
  // anyone can download and paste says "PSI Verified" about nothing, which hands a stranger
  // our brand as a fake credential. These phrases must never come back.
  ['badge promises a score', 'Apex PSI Score'],
  ['badge promises a live score', 'Real-time score'],
  ['badge auto-updates a score', 'Auto-updates as your score changes'],
  ['badge claims regulator trust', 'building trust with customers and regulators'],
  ['badge issues a verdict', 'PSI Verified'],
  ['compliance pulse over-claim', 'Show your real-time compliance status'],
  // 23 Oct: five surfaces called a seal the truth. The H1 on the site root and on /mcp were
  // the loudest; badge-copy-check.mjs now refuses them in the tree, and these refuse them
  // on the served bundle.
  ['hero claims digital truth', 'for Digital Truth'],
  ['mcp hero claims cryptographic truth', 'Cryptographic truth'],
  ['product line claims a verified badge', 'APEX Verified badge'],
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
