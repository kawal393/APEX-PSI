#!/usr/bin/env node
/**
 * Audit draft-singh-psi-agent-03 word by word.
 *
 * draft-singh-psi-agent-02 was filed and posted on 15 November 2026 with
 * defects that no layout check could see, because a layout check only asks
 * whether the bytes are well formed. The words were wrong:
 *
 *   - Section 1.1 claimed "as at 6 November 2026" in a document dated
 *     15 November 2026.
 *   - Section 8 credited [I-D.psi-agent-01] with a "witnessing" check. The
 *     filed -01 defines no witness.
 *   - The envelope's "replaces" member was used in prose and never defined.
 *   - Section 6 step 14 pointed at Section 8 for the worth of the "at"
 *     field, and Section 8 never said it.
 *   - The settlement's "did" was never checked against the envelope.
 *   - The anchor was defined against RFC 6962 while the estate's own Merkle
 *     profile draft specifies the RFC 9162 tree hash, a merkle_profile
 *     member and a 32-byte leaf.
 *   - There was no table of contents.
 *   - Three citations did not match the RFC Editor's record: RFC 2026 was
 *     credited to Peterson (its author is Bradner) with "The" missing from
 *     its title, RFC 9421 was credited to "Backman, M." (its first author
 *     is Annabelle Backman), and RFC 8032's second author was printed in
 *     the wrong order.
 *
 * This script is the answer. It reads the draft, the two drafts it depends
 * on as published (the bytes the registry holds), and checks:
 *
 *   1. every reference label used is defined, and none is orphaned;
 *   2. every "Section N" resolves to a section that exists;
 *   3. every reason code used is in the vocabulary, and none is unused;
 *   4. every RFC citation is character for character what the RFC Editor's
 *      own citation database prints for that RFC;
 *   5. every claim this draft makes about [I-D.psi-agent-01] and about
 *      [I-D.merkle] is true of those documents as published;
 *   6. the table of contents matches the headings and the real page numbers;
 *   7. the dates agree: document date, expiry, novelty date, page furniture;
 *   8. the author address label is the one the author chose.
 *
 *   node scripts/ietf-draft-audit.mjs
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = "draft-singh-psi-agent-03";
const REGISTRY_EXPIRY_DAYS = 185;

const failures = [];
const fail = (message) => failures.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

const draft = read(`public/ietf/${DOC}.txt`);
const agent01 = read("public/ietf/published/draft-singh-psi-agent-01.txt");
const merkle01 = read("public/ietf/published/draft-singh-psi-merkle-01.txt");

/**
 * The two published drafts are the oracle: the -03 makes claims about what
 * they say. Those copies must be the bytes the registry holds, or the claims
 * are being checked against something else.
 */
const PUBLISHED = {
  "public/ietf/published/draft-singh-psi-agent-01.txt": "2dbc7dac6d34eabb82803297b0769067175de3a3b8213d60f25f0596e4316bf6",
  "public/ietf/published/draft-singh-psi-merkle-01.txt": "6b039761a144621b0be8a0e873619fd887d82d5536d7d27efd067080eec05d59",
};
for (const [file, digest] of Object.entries(PUBLISHED)) {
  const got = createHash("sha256").update(read(file), "utf8").digest("hex");
  check(got === digest, `the vendored copy of ${path.basename(file)} is not the published bytes`);
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** The draft as prose: no page furniture, no table of contents. */
function prose(text) {
  const out = [];
  let inToc = false;
  for (const line of text.split("\n")) {
    if (inToc) {
      if (/^\d+\.\s/.test(line)) inToc = false;
      else continue;
    }
    if (line.includes("\f")) continue;
    if (/^Internet-Draft {2,}PSI Agent {2,}[A-Z][a-z]+ \d{4}$/.test(line)) continue;
    if (/^Singh {2,}Expires \d{1,2} [A-Z][a-z]+ \d{4} {2,}\[Page \d+\]$/.test(line)) continue;
    if (line === "Table of Contents") {
      inToc = true;
      continue;
    }
    out.push(line);
  }
  return out;
}

const lines = prose(draft);
const flat = collapse(lines.join(" "));

/* -------------------------------------------------------- page integrity */

/**
 * No paragraph may straddle a page break.
 *
 * The registry's checker reads a plaintext draft and ends a paragraph at a
 * form feed, so a paragraph that runs across a page break is two paragraphs
 * to it. The -03 was submitted on 16 November 2026 with the Trust's
 * paragraph cut in half by a page break, and idnits 2.17.1 answered "the
 * document seems to lack a License Notice ... however, there's a paragraph
 * with a matching beginning".
 *
 * The prose above cannot see this: it joins a paragraph a page break has
 * split. So the check is made on the raw bytes, word by word, with every
 * word carrying the page it is printed on.
 */
function wordsByPage(text) {
  const words = [];
  text.split("\f").forEach((page, pageIndex) => {
    for (const line of page.split("\n")) {
      if (line.trim() === "") continue;
      for (const word of line.trim().split(/\s+/)) words.push({ word, page: pageIndex });
    }
  });
  return words;
}

const TRUST_NOTICE =
  "This document is subject to BCP 78 and the IETF Trust's Legal Provisions " +
  "Relating to IETF Documents (https://trustee.ietf.org/license-info) in effect " +
  "on the date of publication of this document. Please review these documents " +
  "carefully, as they describe your rights and restrictions with respect to this document. " +
  "Code Components extracted from this document must include Revised BSD License text " +
  "as described in Section 4.e of the Trust Legal Provisions and are provided without " +
  "warranty as described in the Revised BSD License.";

{
  const words = wordsByPage(draft);
  const flow = words.map((w) => w.word).join(" ");
  const at = flow.indexOf(TRUST_NOTICE);
  check(at >= 0, "the Copyright Notice is not the Trust's paragraph, word for word");
  if (at >= 0) {
    const first = flow.slice(0, at).split(" ").length - 1;
    const pages = new Set(words.slice(first, first + TRUST_NOTICE.split(" ").length).map((w) => w.page));
    check(
      pages.size === 1,
      `the License Notice runs across pages ${[...pages].map((p) => p + 1).join(" and ")}`
    );
  }
}

// The published draft is the layout of the prose file and nothing else. A
// paragraph that a page break had cut comes back as a paragraph break, so
// this is what catches a split paragraph anywhere in the draft.
{
  const proseFile = read(`drafts/ietf/${DOC}.prose.txt`);
  const collapsed = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (collapsed[collapsed.length - 1] !== "") collapsed.push("");
      continue;
    }
    collapsed.push(line);
  }
  while (collapsed.length && collapsed[0] === "") collapsed.shift();
  while (collapsed.length && collapsed[collapsed.length - 1] === "") collapsed.pop();
  const source = proseFile.split("\n");
  while (source.length && source[source.length - 1] === "") source.pop();
  const at = collapsed.findIndex((line, i) => line !== source[i]);
  check(
    collapsed.length === source.length && at === -1,
    `the published draft is not the layout of the prose file: line ${at + 1} reads ${JSON.stringify(collapsed[at])} and the prose reads ${JSON.stringify(source[at])}`
  );
}

/* ---------------------------------------------------------------- dates */

const headerDate = (lines.find((l) => l.startsWith("Intended status:")) || "")
  .trim().split(/\s+/).slice(-3).join(" ");
const expiry = (lines.find((l) => l.startsWith("Expires:")) || "")
  .replace(/^Expires:\s*/, "").trim();

const months = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const toIso = (dmy) => {
  const [d, m, y] = dmy.split(" ");
  return `${y}-${String(months.indexOf(m) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

check(/^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(headerDate), `the document date reads "${headerDate}"`);
check(
  addDays(toIso(headerDate), REGISTRY_EXPIRY_DAYS) === toIso(expiry),
  `the expiry says ${expiry}, but ${headerDate} + ${REGISTRY_EXPIRY_DAYS} days is ${addDays(toIso(headerDate), REGISTRY_EXPIRY_DAYS)}`
);
check(flat.includes(`will expire on ${expiry}.`), `Status of This Memo does not say the draft expires on ${expiry}`);

const novelty = /as at (\d{1,2} [A-Z][a-z]+ \d{4}) specifies/.exec(flat);
check(Boolean(novelty), "the novelty statement does not say what date it is made as at");
if (novelty) {
  check(
    novelty[1] === headerDate,
    `the novelty statement is made as at ${novelty[1]}, but the document is dated ${headerDate}`
  );
}

const pages = draft.split("\f");
check(pages[0].includes(`Expires: ${expiry}`), "the first page does not carry the expiry date");
check(pages[pages.length - 1].includes(`Expires ${expiry}`), "the last page does not carry the expiry date");

/* ------------------------------------------------------------ references */

const referencesAt = lines.findIndex((l) => /^10\.\s+References/.test(l));
check(referencesAt >= 0, "no References section");
const referenceLines = lines.slice(referencesAt);
const referenceText = referenceLines.join("\n");

const defined = new Set();
for (const line of referenceLines) {
  const at = /^\s{3}\[([^\]]+)\]/.exec(line);
  if (at) defined.add(at[1]);
}

const used = new Set();
const bodyText = collapse(lines.slice(0, referencesAt).join(" "));
for (const m of bodyText.matchAll(/\[([A-Za-z0-9][A-Za-z0-9.\-]*)\]/g)) used.add(m[1]);

for (const label of used) {
  check(defined.has(label), `the reference [${label}] is used in the text and never defined`);
}
for (const label of defined) {
  check(used.has(label), `the reference [${label}] is defined and never used`);
}

/** The citation entry of one label, collapsed to one line. */
function citation(label, from = referenceLines) {
  const at = from.findIndex((l) => new RegExp(`^\\s{3}\\[${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`).test(l));
  if (at < 0) return null;
  const entry = [];
  for (let i = at; i < from.length; i++) {
    const line = from[i];
    if (i > at && /^\s{3}\[/.test(line)) break;
    if (i > at && /^\d+(\.\d+)*\.\s/.test(line)) break;
    entry.push(line);
  }
  return collapse(entry.join(" "));
}

/**
 * The RFC Editor's own record, read from
 * https://bib.ietf.org/public/rfc/bibxml/reference.RFCNNNN.xml on
 * 16 November 2026. This is the database xml2rfc itself cites from, so a
 * citation that differs from it differs from what the tooling would print.
 *
 * The filed -02 carried three citations the registry does not agree with:
 * RFC 2026 was credited to Peterson (its author is Bradner) and its title
 * was missing the leading "The"; RFC 9421 was credited to "Backman, M."
 * (its first author is Annabelle Backman, "A."); RFC 8032's second author
 * was printed "Liusvaara, I." where the tooling prints "I. Liusvaara".
 */
const RFC_TRUTH = {
  RFC2026: { authors: "Bradner, S.", title: "The Internet Standards Process -- Revision 3", series: "BCP 9", date: "October 1996" },
  RFC2119: { authors: "Bradner, S.", title: "Key words for use in RFCs to Indicate Requirement Levels", series: "BCP 14", date: "March 1997" },
  RFC3339: { authors: "Klyne, G. and Newman, C.", title: "Date and Time on the Internet: Timestamps", series: "", date: "July 2002" },
  RFC4648: { authors: "Josefsson, S.", title: "The Base16, Base32, and Base64 Data Encodings", series: "", date: "October 2006" },
  RFC8032: { authors: "Josefsson, S. and I. Liusvaara", title: "Edwards-Curve Digital Signature Algorithm (EdDSA)", series: "", date: "January 2017" },
  RFC8174: { authors: "Leiba, B.", title: "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", series: "BCP 14", date: "May 2017" },
  RFC8785: { authors: "Rundgren, A., Jordan, B., and S. Erdtman", title: "JSON Canonicalization Scheme (JCS)", series: "", date: "June 2020" },
  RFC9162: { authors: "Laurie, B., Messeri, E., and R. Stradling", title: "Certificate Transparency Version 2.0", series: "", date: "December 2021" },
  RFC9421: { authors: "Backman, A., Ed., Richer, J., Ed., and M. Sporny", title: "HTTP Message Signatures", series: "", date: "February 2024" },
};

/** The citation as the RFC Editor's tooling prints it. */
function expectedCitation(label, t) {
  const number = label.slice(3);
  const parts = [`[${label}] ${t.authors}, "${t.title}",`];
  if (t.series) parts.push(`${t.series},`);
  parts.push(`RFC ${number},`);
  parts.push(`DOI 10.17487/RFC${number},`);
  parts.push(`${t.date},`);
  parts.push(`<https://www.rfc-editor.org/info/rfc${number}>.`);
  return parts.join(" ");
}

for (const [label, truth] of Object.entries(RFC_TRUTH)) {
  const entry = citation(label);
  if (!entry) {
    fail(`the reference [${label}] is not in the References section`);
    continue;
  }
  const expected = expectedCitation(label, truth);
  if (entry !== expected) {
    fail(`[${label}] does not match the RFC Editor's record`);
    fail(`    ours:     ${entry}`);
    fail(`    expected: ${expected}`);
  }
}

/**
 * FIPS 204 is not an RFC, so it has no bibxml record. Its DOI resolves to
 * the NIST publication, whose metadata was read on 16 November 2026:
 * "Module-lattice-based digital signature standard", issued 13 August 2024.
 */
{
  const entry = citation("FIPS204");
  if (!entry) {
    fail("the reference [FIPS204] is not in the References section");
  } else {
    check(entry.includes('"Module-Lattice-Based Digital Signature Standard"'),
      "[FIPS204] does not carry the NIST title");
    check(entry.includes("August 2024"), "[FIPS204] does not carry the NIST month and year");
    check(entry.includes("<https://doi.org/10.6028/NIST.FIPS.204>"),
      "[FIPS204] does not carry the NIST DOI");
  }
}

/* ------------------------------------------------- claims about our drafts */

const agent01Flat = collapse(agent01);
const merkleFlat = collapse(merkle01);

check(agent01Flat.includes("MUST contain event (for example llm_end, tool_end, decision), name (the function or tool), and result or outputs"),
  "the published -01 does not define the action record the way this draft says it does");
check(agent01Flat.includes("MAY contain args and prev"), "the published -01 does not make prev optional, as this draft says");
check(!agent01Flat.includes("sixty-four zero digits"), "the published -01 does fix the first prev value, as this draft says it does not");
check(!/\bkid\b/.test(agent01Flat), "the published -01 defines a kid field, which this draft says it does not");
check(!/witness/i.test(agent01Flat), "the published -01 defines a witness, which this draft says it does not");
check(agent01Flat.includes("receipt per [PSI]"), "the published -01 does not issue receipts, which this draft says it does");
check(agent01Flat.includes("A run is chained by including prev"), "the published -01 does not chain a run, which this draft says it does");

check(citation("I-D.psi-agent-01")?.includes('"PSI Receipts for AI Agent Actions"'),
  "the citation of [I-D.psi-agent-01] does not carry the published title of that draft");
check(citation("I-D.psi-agent-01")?.includes("13 October 2026"),
  "the citation of [I-D.psi-agent-01] does not carry the published date of that draft");
check(citation("I-D.merkle")?.includes('"PSI Merkle Commitment Profile (RFC6962-SHA256)"'),
  "the citation of [I-D.merkle] does not carry the published title of that draft");
check(citation("I-D.merkle")?.includes("13 October 2026"),
  "the citation of [I-D.merkle] does not carry the published date of that draft");

check(merkleFlat.includes("32-byte PSI leaf digests"), "the published Merkle profile does not say the leaf is a 32-byte digest");
check(merkleFlat.includes("Section 2.1.1 of [RFC9162]"), "the published Merkle profile does not use the RFC 9162 tree hash");
check(merkleFlat.includes("Section 2.1.3.2 of [RFC9162]"), "the published Merkle profile does not name the inclusion proof algorithm");
check(merkleFlat.includes("at most 256 leaves"), "the published Merkle profile does not bound the window");
check(merkleFlat.includes("RFC6962-SHA256"), "the published Merkle profile does not name its profile value");
check(merkleFlat.includes("merkle_profile"), "the published Merkle profile does not require the merkle_profile member");

for (const phrase of [
  "32-byte digest that the eid carries",
  "Section 2.1.1 of [RFC9162]",
  "Section 2.1.3.2 of [RFC9162]",
  "at most 256 leaves",
  '"RFC6962-SHA256"',
  "merkle_profile",
]) {
  check(flat.includes(phrase), `the anchor section does not carry "${phrase}"`);
}

/* ------------------------------------------------------ section pointers */

const headings = new Set();
for (const line of lines) {
  const numbered = /^(\d+(?:\.\d+)*)\.\s+\S/.exec(line);
  if (numbered) headings.add(numbered[1]);
}
check(headings.size > 0, "no numbered headings found");

for (const m of bodyText.matchAll(/Section (\d+(?:\.\d+)*)(?![\w.])/g)) {
  const pointer = m[1];
  const after = bodyText.slice(m.index + m[0].length, m.index + m[0].length + 6);
  if (after.startsWith(" of [")) continue;
  check(headings.has(pointer), `the text points at Section ${pointer}, which is not a section of this draft`);
}

/* ---------------------------------------------------------- reason codes */

const vocabulary = /The reason codes used below are ([^.]+)\./.exec(flat);
check(Boolean(vocabulary), "the verification section does not list the reason codes");
const declared = new Set(vocabulary ? vocabulary[1].split(",").map((c) => c.trim()) : []);
check(declared.size > 0, "the reason code list is empty");

const usedCodes = new Set();
for (const m of flat.matchAll(/fail with ([a-z_]+(?: or [a-z_]+)?)/gi)) {
  for (const code of m[1].split(" or ")) usedCodes.add(code.trim());
}
for (const code of usedCodes) {
  check(declared.has(code), `the reason code ${code} is used but not declared in the vocabulary`);
}
for (const code of declared) {
  check(usedCodes.has(code), `the reason code ${code} is declared but never used`);
}

/* ------------------------------------------------------ enumerated values */

for (const value of ["allow", "deny", "require_human"]) {
  check(flat.includes(`"${value}"`), `the verdict value "${value}" is not in the text`);
}
for (const value of ["initiated", "authorised", "captured", "settled", "failed", "refunded", "reversed", "disputed"]) {
  check(flat.includes(`"${value}"`), `the settlement status "${value}" is not in the text`);
}
check(flat.includes('"ed25519"') && flat.includes('"ml-dsa-65"'), "the algorithm values are not both named");

/* -------------------------------------------------- table of contents */

const tocLines = [];
let inToc = false;
for (const line of draft.split("\n")) {
  if (line === "Table of Contents") {
    inToc = true;
    continue;
  }
  if (!inToc) continue;
  if (/^\d+\.\s/.test(line)) break;
  if (line.trim() === "") continue;
  tocLines.push(line);
}
check(tocLines.length > 0, "there is no table of contents");

const pageOf = (heading) => {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].split("\n").some((l) => l.trim() === heading)) return i + 1;
  }
  return null;
};

const tocEntries = tocLines.map((line) => {
  const m = /^\s*(\d+(?:\.\d+)*)\.\s+(\S.*?)\s(?:\.\s)+\.*\s*(\d+)\s*$/.exec(line);
  return m ? { label: m[1], title: m[2].trim(), page: Number(m[3]) } : null;
});
check(tocEntries.every(Boolean), "a table of contents line does not parse");

const headingLines = lines.filter((l) => /^\d+(?:\.\d+)*\.\s+\S/.test(l) || l === "Author's Address");
check(tocEntries.length === headingLines.length,
  `the table of contents lists ${tocEntries.length} entries and the draft has ${headingLines.length} headings`);

for (const entry of tocEntries) {
  if (!entry) continue;
  const heading = entry.label ? `${entry.label}.  ${entry.title}` : entry.title;
  check(headingLines.includes(heading), `the table of contents names "${heading}", which is not a heading of this draft`);
  const real = pageOf(heading);
  check(real === entry.page, `the table of contents puts "${heading}" on page ${entry.page}, and it is on page ${real}`);
}

/* ------------------------------------------------------ author address */

check(lines.some((l) => l === "   URL:   https://ai-governance-standard.com"),
  "the author address does not use the URL label the author chose");
check(!lines.some((l) => /^\s*URI:/.test(l)), "the author address still carries the URI label");
check(lines.some((l) => l === "   Email: kawaljeet.singh3008@gmail.com"),
  "the author address does not carry the email");

/* ------------------------------------------------------- copy freshness */

/**
 * The copy must name the revision that is filed, and the digest of its bytes.
 *
 * The -02 was posted on 15 November 2026 and the -03 replaced it the same
 * day. Nothing checked the words around the bytes, so the site went on
 * serving the 6 November text and the copy went on calling a filed draft
 * "prepared, not filed". A layout check cannot see that. This can: the
 * surfaces below are read against the file that is published now.
 */

const publishedBytes = readFileSync(path.join(ROOT, `public/ietf/${DOC}.txt`));
const publishedDigest = createHash("sha256").update(publishedBytes).digest("hex");

/** The digests of the revisions this one replaces. */
const SUPERSEDED_DIGESTS = {
  "2592edc5dd4634d2ba6ee1c459d45d7372e0c6be358c2d3afe8e6353c43b68a1":
    "the 6 November 2026 text",
  "853c7d1db88ad9d2036258e934eaa8517155faf6df5151b8a904a6ff74d01ec5":
    "draft-singh-psi-agent-02",
};

const identity = JSON.parse(read(`public/ietf/${DOC}.identity.json`));
check(identity.sha256 === publishedDigest,
  `the fingerprint file records sha256 ${identity.sha256}, and the published bytes hash to ${publishedDigest}`);
check(identity.bytes === publishedBytes.length,
  `the fingerprint file records ${identity.bytes} bytes, and the published file is ${publishedBytes.length}`);
check(identity.lines === publishedBytes.toString("utf8").split("\n").length - 1,
  `the fingerprint file records ${identity.lines} lines, and the published file has ${publishedBytes.toString("utf8").split("\n").length - 1}`);
check(identity.pages === pages.length,
  `the fingerprint file records ${identity.pages} pages, and the published file has ${pages.length}`);
check(identity.document_date === toIso(headerDate),
  `the fingerprint file records the document date ${identity.document_date}, and the draft says ${toIso(headerDate)}`);
check(identity.expiry === toIso(expiry),
  `the fingerprint file records the expiry ${identity.expiry}, and the draft says ${toIso(expiry)}`);
check(!/not posted yet/i.test(identity.status),
  "the fingerprint file still says the draft was not posted");
check(identity.filing?.registry_copy?.includes("draft-singh-psi-agent-03.txt"),
  "the fingerprint file does not point at the registry's copy of this revision");

/** The copy surfaces, and whether each one carries the digest. */
const COPY_SURFACES = [
  { file: "public/llms.txt", digest: true },
  { file: "public/llms-full.txt", digest: true },
  { file: "public/.well-known/apex-protocol.json", digest: true },
  { file: "src/pages/Drafts.tsx", digest: true },
  { file: "src/components/AgentSpecAnchor.tsx", digest: true },
  { file: "src/components/GrandHero.tsx", digest: false },
  { file: "src/pages/AgentPaymentRecipe.tsx", digest: false },
  { file: "public/ietf/submission/UPLOAD.md", digest: true },
];

for (const { file, digest } of COPY_SURFACES) {
  const text = read(file);
  check(text.includes(DOC), `${file} does not name ${DOC}`);
  for (const [stale, what] of Object.entries(SUPERSEDED_DIGESTS)) {
    check(!text.includes(stale), `${file} carries the digest of ${what}`);
  }
  if (digest) {
    check(text.includes(publishedDigest), `${file} does not carry the digest of ${DOC}`);
  }
  check(!/draft-singh-psi-agent-02\.txt/.test(text),
    `${file} links the superseded revision's text`);
  check(!/not yet filed|prepared, not filed/i.test(text),
    `${file} calls a filed draft one that is not filed`);
  check(!/not filed with the IETF/i.test(text),
    `${file} says the draft is not filed with the IETF`);
}

/* ------------------------------------------------------------- verdict */

if (failures.length) {
  console.error(`${DOC} does not pass the word-by-word audit:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`${DOC} passes the word-by-word audit:`);
console.log(`  ${used.size} references used and defined, ${declared.size} reason codes declared and used`);
console.log(`  every "Section N" resolves, every claim about the published -01 and Merkle drafts is true of them`);
console.log(`  the table of contents matches the headings and the page numbers`);
console.log(`  document date ${headerDate}, expiry ${expiry}, novelty statement as at ${novelty[1]}`);
console.log(`  the author address carries the URL label and not the URI label`);
console.log(`  the fingerprint file matches the published bytes, and ${COPY_SURFACES.length} copy surfaces name this revision`);
