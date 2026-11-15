#!/usr/bin/env node
/**
 * Lay out draft-singh-psi-agent-02 as a plain-text Internet-Draft.
 *
 * The registry's checker (idnits) rejected the first submission of this draft
 * on 15 November 2026 for two reasons, both measured from the datatracker's
 * own check output:
 *
 *   1. The License Notice was split across two paragraphs. The IETF Trust
 *      provisions of 28 Dec 2009 section 6.b(ii) paragraph 3 are ONE
 *      paragraph; a blank line between its two sentences ends it early.
 *   2. idnits3 wants the expiry date on the first and the last page. The
 *      filed draft-singh-psi-agent-01 (accepted 13 October 2026) carries a
 *      footer on every page reading "Singh   Expires <date>   [Page N]";
 *      this draft carried no page furniture at all.
 *
 * So this script does what xml2rfc does for a text draft: it puts the running
 * header, the footer and the form feeds in, keeps paragraphs whole across a
 * page break, and refuses to write a file whose bytes fail a check.
 *
 * The page geometry is copied from the accepted -01: 72 columns, the expiry
 * centred, the page marker right-aligned, 56 lines on the first page and 55
 * on every page after it.
 *
 *   node scripts/ietf-plaintext-layout.mjs          write the upload artifact
 *   node scripts/ietf-plaintext-layout.mjs --check  fail if it is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "public/ietf/draft-singh-psi-agent-02.txt");
const ARTIFACT = path.join(ROOT, "public/ietf/submission/draft-singh-psi-agent-02.txt");
const PAGE_WIDTH = 72;
const FIRST_PAGE_LINES = 56;
const PAGE_LINES = 55;
const AUTHOR = "Singh";
const SHORT_NAME = "PSI Agent";
const REGISTRY_EXPIRY_DAYS = 185;

/**
 * The paragraph idnits expects, quoted verbatim from the rejection:
 * "IETF Trust Legal Provisions of 28-dec-2009, Section 6.b(ii), paragraph 3".
 */
const TRUST_PARAGRAPH_3 =
  "This document is subject to BCP 78 and the IETF Trust's Legal Provisions " +
  "Relating to IETF Documents (https://trustee.ietf.org/license-info) in effect " +
  "on the date of publication of this document. Please review these documents " +
  "carefully, as they describe your rights and restrictions with respect to this document.";

const TRUST_CODE_SENTENCE =
  "Code Components extracted from this document must include Revised BSD License text " +
  "as described in Section 4.e of the Trust Legal Provisions and are provided without " +
  "warranty as described in the Revised BSD License.";

const failures = [];
const fail = (message) => failures.push(message);

const isRunningHeader = (line) =>
  /^Internet-Draft {2,}PSI Agent {2,}[A-Z][a-z]+ \d{4}$/.test(line);
const isFooter = (line) =>
  /^Singh {2,}Expires \d{1,2} [A-Z][a-z]+ \d{4} {2,}\[Page \d+\]$/.test(line);

/** Remove page furniture, so the text can be read as prose again. */
function stripPagination(text) {
  const out = [];
  let blanks = 0;
  for (const line of text.split("\n")) {
    if (line.includes("\f")) continue;
    if (isRunningHeader(line) || isFooter(line)) continue;
    // The blank lines a page break leaves behind are padding, not prose: a
    // paragraph in this draft is separated by one blank line and no more.
    if (line.trim() === "") {
      blanks++;
      if (blanks > 1) continue;
    } else {
      blanks = 0;
    }
    out.push(line);
  }
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** Paragraphs of the prose, with the page furniture already removed. */
function paragraphs(lines) {
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length) blocks.push(current.join(" "));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join(" "));
  return blocks.map(collapse);
}

function centre(text) {
  return Math.round((PAGE_WIDTH - text.length) / 2);
}

function footer(page, expiryText) {
  const marker = `[Page ${page}]`;
  const left = AUTHOR.padEnd(centre(expiryText), " ");
  const middle = expiryText;
  const right = " ".repeat(PAGE_WIDTH - marker.length - (left.length + middle.length)) + marker;
  const line = left + middle + right;
  if (line.length !== PAGE_WIDTH) throw new Error(`footer is ${line.length} columns`);
  return line;
}

function runningHeader(monthYear) {
  const left = "Internet-Draft";
  const gap = " ".repeat(centre(SHORT_NAME) - left.length);
  const middle = SHORT_NAME;
  const right = " ".repeat(PAGE_WIDTH - monthYear.length - (left.length + gap.length + middle.length)) + monthYear;
  const line = left + gap + middle + right;
  if (line.length !== PAGE_WIDTH) throw new Error(`running header is ${line.length} columns`);
  return line;
}

/** Split the prose into the front matter and the body that flows onto pages. */
function splitFrontMatter(lines) {
  const abstractAt = lines.findIndex((l) => l === "Abstract");
  if (abstractAt < 0) throw new Error("no Abstract heading found");
  let end = abstractAt + 1;
  while (end < lines.length && lines[end] === "") end++;
  return { front: lines.slice(0, end), body: lines.slice(end) };
}

/**
 * Fill pages without ever cutting a paragraph in half: a page break falls
 * between paragraphs, and the gap left by the break is padded with blanks so
 * the footer lands at the foot of the page.
 */
function paginate(front, body, expiryText, monthYear) {
  const pages = [];
  let rest = body.slice();
  let first = true;
  let guard = 0;
  while (rest.length) {
    if (guard++ > 500) throw new Error("pagination did not terminate");
    const header = first ? front : [runningHeader(monthYear), "", ""];
    const height = first ? FIRST_PAGE_LINES : PAGE_LINES;
    const capacity = height - header.length - 1;
    let take = Math.min(capacity, rest.length);
    if (take < rest.length) {
      let cut = take;
      while (cut > 0 && !(rest[cut - 1] === "" && rest[cut] !== "")) cut--;
      if (cut === 0) cut = take;
      take = cut;
    }
    let chunk = rest.slice(0, take);
    rest = rest.slice(take);
    while (chunk.length && chunk[0] === "") chunk.shift();
    while (chunk.length && chunk[chunk.length - 1] === "") chunk.pop();
    const page = [...header, ...chunk];
    while (page.length < height - 1) page.push("");
    page.push(footer(pages.length + 1, expiryText));
    pages.push(page);
    first = false;
  }
  return pages;
}

function parseHeader(lines) {
  const dateLine = lines.find((l) => l.startsWith("Intended status:"));
  const expiresLine = lines.find((l) => l.startsWith("Expires:"));
  if (!dateLine || !expiresLine) throw new Error("header block is missing");
  const documentDate = dateLine.trim().split(/\s{2,}|\s+/).slice(-3).join(" ");
  const expiry = expiresLine.replace(/^Expires:\s*/, "").trim();
  const monthYear = documentDate.split(" ").slice(1).join(" ");
  return { documentDate, expiry, monthYear };
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toIso(dayMonthYear) {
  const months = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const [d, m, y] = dayMonthYear.split(" ");
  return `${y}-${String(months.indexOf(m) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function checkBytes(text) {
  if (text.includes("\r")) fail("the file contains CR: the digest must be computed on LF bytes");
  if (text.includes("\t")) fail("the file contains a tab");
  if (/[^\x0a\x0c\x20-\x7e]/.test(text)) fail("the file contains a non-ASCII character");
  for (const [i, line] of text.split("\n").entries()) {
    if (/[ \t]+$/.test(line)) fail(`line ${i + 1} has trailing whitespace`);
    if (line.length > PAGE_WIDTH) fail(`line ${i + 1} is ${line.length} columns, over ${PAGE_WIDTH}`);
  }
  if (!text.endsWith("\n")) fail("the file does not end with a newline");
  if (text.endsWith("\n\n")) fail("the file ends with a blank line");
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const raw = readFileSync(SOURCE, "utf8");
  checkBytes(raw);

  const lines = stripPagination(raw);
  const { documentDate, expiry, monthYear } = parseHeader(lines);
  const expiryText = `Expires ${expiry}`;

  // The registry sets the expiry itself: the served -01 is dated 13 October
  // 2026 and expires 16 April 2027, which is 185 days later.
  const registryExpiry = addDays(toIso(documentDate), REGISTRY_EXPIRY_DAYS);
  const stated = new Date(`${toIso(expiry)}T00:00:00Z`);
  const computed = new Date(`${registryExpiry}T00:00:00Z`);
  if (stated.getTime() !== computed.getTime()) {
    fail(`the expiry says ${expiry}, but ${documentDate} + ${REGISTRY_EXPIRY_DAYS} days is ${registryExpiry}`);
  }
  if (!lines.some((l) => l.includes(`will expire on ${expiry}.`))) {
    fail(`Status of This Memo does not say the draft expires on ${expiry}`);
  }

  // The License Notice: one paragraph, not two.
  const blocks = paragraphs(lines);
  const trust = blocks.find((b) => b.startsWith(TRUST_PARAGRAPH_3));
  if (!trust) {
    fail("the License Notice paragraph is not the one the registry expects: the BCP 78 sentence and the 'Please review' sentence must be ONE paragraph");
  } else if (!trust.includes(TRUST_CODE_SENTENCE)) {
    fail("the License Notice paragraph is missing the Revised BSD License sentence the filed -01 carries");
  }
  const copyrightAt = lines.findIndex((l) => l === "Copyright Notice");
  if (copyrightAt < 0) fail("no Copyright Notice section");

  const { front, body } = splitFrontMatter(lines);
  const pages = paginate(front, body, expiryText, monthYear);
  const artifact = pages.map((p) => p.join("\n")).join("\n\f\n") + "\n";
  checkBytes(artifact);

  const firstPage = pages[0].join("\n");
  const lastPage = pages[pages.length - 1].join("\n");
  if (!firstPage.includes(`Expires: ${expiry}`)) fail("the first page does not carry the expiry date");
  if (!lastPage.includes(expiryText)) fail("the last page does not carry the expiry date");
  if (!pages.every((p) => isFooter(p[p.length - 1]))) fail("a page does not end with a footer");
  if (pages.slice(1).some((p) => !isRunningHeader(p[0]))) fail("a page after the first does not start with the running header");

  if (failures.length) {
    console.error("the draft is not ready to upload:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  const digest = createHash("sha256").update(artifact, "utf8").digest("hex");
  const bytes = Buffer.byteLength(artifact, "utf8");

  if (checkOnly) {
    const stale = [];
    for (const [label, file] of [["published copy", SOURCE], ["upload artifact", ARTIFACT]]) {
      let existing = null;
      try {
        existing = readFileSync(file, "utf8");
      } catch {
        existing = null;
      }
      if (existing !== artifact) stale.push(label);
    }
    if (stale.length) {
      console.error(`the ${stale.join(" and the ")} is stale: run \`node scripts/ietf-plaintext-layout.mjs\` and commit the result`);
      process.exit(1);
    }
    console.log(`upload artifact is current: ${bytes} bytes, sha256 ${digest}, ${pages.length} pages`);
    return;
  }

  // The published copy and the upload artifact are the same bytes: the site
  // serves the draft the registry holds, so a stranger can recompute one
  // digest and get the same answer from either door.
  writeFileSync(SOURCE, artifact, "utf8");
  writeFileSync(ARTIFACT, artifact, "utf8");
  console.log(`wrote ${path.relative(ROOT, ARTIFACT)} and ${path.relative(ROOT, SOURCE)}`);
  console.log(`  ${bytes} bytes, ${artifact.split("\n").length} lines, ${pages.length} pages`);
  console.log(`  sha256 ${digest}`);
  console.log(`  document date ${documentDate}, expiry ${expiry} (document date + ${REGISTRY_EXPIRY_DAYS} days)`);
  console.log("  checks passed: LF bytes, ASCII, no tabs, no trailing whitespace, <= 72 columns,");
  console.log("    one License Notice paragraph, expiry on the first and last page, footer on every page");
}

main();
