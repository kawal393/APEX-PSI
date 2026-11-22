// The one table that turns a claim this estate has measured false into a claim it can
// stand behind, and the one matcher that applies it.
//
// Two readers must never disagree about it:
//   scripts/article-claims-fix.mjs   writes these substitutions into the published rows
//   scripts/article-claims-check.mjs --self-test proves that applying them leaves the
//                                    guard nothing to flag
// A table copied into both files is a table that can drift while both still look right.
//
// Matching is case-insensitive and the case found is preserved, because the guard reads
// case-insensitively. A table that only covered the case it was written in would clear
// some rows and leave the capitalised ones standing — which is exactly how the 19 Nov
// rewrite would have failed: "Trustworthy and compliant" at the start of a sentence.

export const RULES = [
  // The product proves an event happened and was signed. It cannot make a claim true.
  ['cryptographic truth', 'cryptographic evidence'],

  // A record is tamper-evident: any change breaks the hash and the signature. Nothing
  // here is tamper-proof.
  ['tamper-proof', 'tamper-evident'],
  ['tamper proof', 'tamper evident'],

  // Nothing issued here is irrefutable or indisputable. What is published is the key and
  // the root, so a third party can check it — a different claim, and a true one.
  ['irrefutably', 'independently'],
  ['irrefutable', 'independently verifiable'],
  ['indisputably', 'independently'],
  ['indisputable', 'independently verifiable'],

  // A signature is checkable, not unbreakable.
  ['unbreakable', 'tamper-evident'],

  // Nothing on this estate has been measured to be without defects, and nobody is
  // certified compliant by a receipt.
  ['flawless', 'carefully reviewed'],
  ['certified compliant', 'auditable'],

  // The product does not deliver compliance, so it cannot be advertised as delivering it.
  ['not only compliant by design but also provably so', 'auditable by design and independently verifiable'],
  ['compliant by design but also provably so', 'auditable by design and independently verifiable'],
  ['compliant by design', 'auditable by design'],
  ['provably trustworthy and compliant', 'independently verifiable'],
  ['trustworthy, auditable, and compliant', 'trustworthy and auditable'],
  ['transparent, auditable, and policy-compliant AI systems', 'transparent and auditable AI systems with policy evidence'],
  ['auditable, transparent, and policy-compliant AI systems', 'auditable and transparent AI systems with policy evidence'],
  ['policy-compliant AI systems', 'policy-auditable AI systems'],
  ['trustworthy and compliant', 'trustworthy and auditable'],

  // An unprovable priority claim. Both apostrophes are spelled out because the generator
  // that wrote these articles used both, and a rule for one leaves the other published.
  ["the world's first comprehensive legal framework", 'a landmark comprehensive legal framework'],
  ['the world’s first comprehensive legal framework', 'a landmark comprehensive legal framework'],
  ["the world's first", 'a landmark'],
  ['the world’s first', 'a landmark'],

  // A receipt is evidence, not certainty.
  ['reconstruct historical contexts with absolute certainty', 'reconstruct historical contexts from the record itself'],
  ['with absolute certainty', 'from the record'],
].sort((a, b) => b[0].length - a[0].length);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Keep the shape of what was found: ALL CAPS stays caps, a leading capital stays leading. */
export function matchCase(found, replacement) {
  if (found === found.toUpperCase() && /[A-Z]/.test(found)) return replacement.toUpperCase();
  if (/^\p{Lu}/u.test(found) && /^\p{Ll}/u.test(replacement)) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// The replacements we introduce, split by the sound their first letter starts with.
//
// Why this is needed and not decoration: "an unbreakable chain of trust" is grammatical,
// and rewriting the banned word inside it gives "an tamper-evident chain of trust". A
// correction that leaves broken English on a page a buyer reads is its own credibility
// problem, and measured 22 Nov 2026 the published corpus does contain that shape
// (`ai-output-provenance-c2pa-content-credentials-0sxmd0`). So the article is fixed in the
// same pass as the phrase, from the same table — never by hand, and never for a word the
// table did not just write.
const VOWEL_START = [...new Set(RULES.map(([, to]) => to))].filter((t) => /^[aeiou]/i.test(t));
const CONSONANT_START = [...new Set(RULES.map(([, to]) => to))].filter((t) => !/^[aeiou]/i.test(t));
const alternation = (list) => list.map(esc).sort((a, b) => b.length - a.length).join('|');
const NEEDS_AN = new RegExp(`\\b(a)(\\s+)(${alternation(VOWEL_START)})`, 'gi');
const NEEDS_A = new RegExp(`\\b(an)(\\s+)(${alternation(CONSONANT_START)})`, 'gi');

/** Repair "a"/"an" agreement wherever this table just changed the word after it. */
function fixArticles(text) {
  return text
    .replace(NEEDS_AN, (_, art, sp, rest) => `${matchCase(art, 'an')}${sp}${rest}`)
    .replace(NEEDS_A, (_, art, sp, rest) => `${matchCase(art, 'a')}${sp}${rest}`);
}

/** Apply the table to one string, longest phrase first, case preserved. */
export function applyCopyRules(text, rules = RULES) {
  let out = text;
  for (const [from, to] of rules) {
    out = out.replace(new RegExp(esc(from), 'gi'), (m) => matchCase(m, to));
  }
  return fixArticles(out);
}

/**
 * Places where "a"/"an" disagrees with a phrase this table wrote. Exported so the
 * projection in scripts/article-claims-check.mjs --after-fix can count them across the
 * whole corpus: fixing the claim must not ship broken English in its place.
 */
export function articleDisagreements(text) {
  return [
    ...(text.match(new RegExp(`\\ban\\s+(?:${alternation(CONSONANT_START)})`, 'gi')) || []),
    ...(text.match(new RegExp(`\\ba\\s+(?:${alternation(VOWEL_START)})`, 'gi')) || []),
  ];
}
