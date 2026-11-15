#!/usr/bin/env node
/**
 * Lay out an APEX Internet-Draft as a plain-text document.
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
 * page break, writes the table of contents with the page numbers the layout
 * actually produced, and refuses to write a file whose bytes fail a check.
 *
 * The page geometry is copied from the accepted -01: 72 columns, the expiry
 * centred, the page marker right-aligned, 56 lines on the first page and 55
 * on every page after it.
 *
 * The input is the prose, in drafts/ietf/<draft>.prose.txt. It was not
 * always. The first -03 was laid out from the published file, by stripping
 * the page furniture off it and laying it out again, and that round trip
 * lost two paragraphs: a page break that ran through a paragraph came back
 * as a paragraph break, and the Trust's paragraph was cut in half. The
 * published file is now the output of this script and nothing else, and the
 * script proves it: what it lays out, when the furniture is taken off
 * again, must be the prose it was given, word for word.
 *
 *   node scripts/ietf-plaintext-layout.mjs                       lay out -02 and -03
 *   node scripts/ietf-plaintext-layout.mjs --doc draft-singh-psi-agent-03
 *   node scripts/ietf-plaintext-layout.mjs --check               fail if stale
 *   node scripts/ietf-plaintext-layout.mjs --doc=... --prose      print the prose
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROSE_DIR = path.join(ROOT, "drafts/ietf");
const PAGE_WIDTH = 72;
const FIRST_PAGE_LINES = 56;
const PAGE_LINES = 55;
const AUTHOR = "Singh";
const SHORT_NAME = "PSI Agent";
const REGISTRY_EXPIRY_DAYS = 185;

/**
 * The Copyright Notice, quoted from the Trust's Legal Provisions Relating to
 * IETF Documents and from the rendering the XML pipeline produces. The first
 * sentence and the second are one paragraph, and the Revised BSD License
 * sentence belongs to the same paragraph.
 */
const TRUST_NOTICE =
  "This document is subject to BCP 78 and the IETF Trust's Legal Provisions " +
  "Relating to IETF Documents (https://trustee.ietf.org/license-info) in effect " +
  "on the date of publication of this document. Please review these documents " +
  "carefully, as they describe your rights and restrictions with respect to this document. " +
  "Code Components extracted from this document must include Revised BSD License text " +
  "as described in Section 4.e of the Trust Legal Provisions and are provided without " +
  "warranty as described in the Revised BSD License.";

/**
 * Each draft has its own layout rules, and the rules are part of its
 * published bytes. draft-singh-psi-agent-02 is filed and published: its
 * bytes are recorded, and the rules below reproduce them exactly.
 * draft-singh-psi-agent-03 carries a table of contents.
 *
 * Both keep the Trust's paragraph whole. The registry's checker reads a
 * plaintext draft and ends a paragraph at a page break: the -03 was first
 * submitted on 16 November 2026 with the paragraph broken across pages 1
 * and 2, and idnits 2.17.1 returned one error, "the document seems to lack
 * a License Notice ... however, there's a paragraph with a matching
 * beginning". The filed -01 has the same break in its served text, but it
 * was submitted as xml2rfc XML, so the checker read the source and not the
 * rendering. A plaintext submission must not break the paragraph.
 */
const DOCS = {
  "draft-singh-psi-agent-02": { toc: false },
  "draft-singh-psi-agent-03": { toc: true },
};

const failures = [];
const fail = (message) => failures.push(message);

const isRunningHeader = (line) =>
  /^Internet-Draft {2,}PSI Agent {2,}[A-Z][a-z]+ \d{4}$/.test(line);
const isFooter = (line) =>
  /^Singh {2,}Expires \d{1,2} [A-Z][a-z]+ \d{4} {2,}\[Page \d+\]$/.test(line);

/** Remove page furniture and the table of contents, so the text reads as prose. */
function stripPagination(text) {
  const raw = text.split("\n");
  const out = [];
  let inToc = false;
  let blanks = 0;
  for (const line of raw) {
    if (inToc) {
      // The table of contents runs from its heading to the first numbered
      // section heading, which is the first thing after it.
      if (/^\d+\.\s/.test(line)) inToc = false;
      else continue;
    }
    if (line.includes("\f")) continue;
    if (isRunningHeader(line) || isFooter(line)) continue;
    if (line === "Table of Contents") {
      inToc = true;
      continue;
    }
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

/** The numbered sections and the Author's Address, in document order. */
function headings(lines) {
  const found = [];
  for (const line of lines) {
    const numbered = /^(\d+(?:\.\d+)*\.)\s+(\S.*)$/.exec(line);
    if (numbered) {
      const label = numbered[1];
      const title = numbered[2];
      found.push({ label, title, full: `${label}  ${title}`, indent: label.includes(".") ? 5 : 3 });
      continue;
    }
    if (line === "Author's Address") found.push({ label: "", title: line, full: line, indent: 3 });
  }
  return found;
}

/** One table-of-contents line: the title, dot leaders, then the page number. */
function tocLine(entry, page) {
  const head = `${" ".repeat(entry.indent)}${entry.label ? entry.label + "  " : ""}${entry.title}`;
  const pageText = String(page);
  const budget = PAGE_WIDTH - pageText.length;
  let line = head + "  ";
  while (line.length + 3 <= budget - 1) line += ". ";
  if (line.length > budget - 1) line = line.slice(0, budget - 1);
  return line.padEnd(budget) + pageText;
}

/** A line that opens a section: it must not be the last line of a page. */
const isHeading = (line) =>
  /^\d+(?:\.\d+)*\.\s+\S/.test(line) ||
  ["Abstract", "Status of This Memo", "Copyright Notice", "Table of Contents", "Author's Address"].includes(line.trim());

/**
 * Fill pages without ever cutting a paragraph in half: a page break falls
 * between paragraphs, and the gap left by the break is padded with blanks so
 * the footer lands at the foot of the page. Two rules remain:
 *
 *   - The table of contents is not split across pages.
 *   - A heading is never the last line of a page.
 *
 * A paragraph may not straddle a page break. The registry's checker ends a
 * paragraph at a form feed, so a paragraph that straddles one is two
 * paragraphs to it, and the Trust's paragraph stops being the Trust's
 * paragraph.
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
      const tocAt = rest.indexOf("Table of Contents");
      let tocEnd = -1;
      if (tocAt >= 0) {
        tocEnd = tocAt;
        while (tocEnd < rest.length && !isHeading(rest[tocEnd])) tocEnd++;
      }
      if (tocAt >= 0 && tocAt < take && take - tocAt < tocEnd - tocAt) {
        // The table of contents does not fit: it moves whole to the next page.
        take = tocAt;
      } else {
        // The page ends at a paragraph boundary: a blank line, then text.
        // The registry's checker ends a paragraph at a form feed, so a
        // paragraph that straddles a page break is two paragraphs to it, and
        // the Trust's paragraph stops being the Trust's paragraph.
        const floor = tocAt >= 0 && tocAt < take ? tocEnd : 0;
        let cut = take;
        while (cut > floor && !(rest[cut - 1] === "" && rest[cut] !== "")) cut--;
        if (cut <= floor) cut = floor > 0 ? floor : take;
        take = cut;
      }
      // A heading must not be left alone at the foot of a page.
      while (take > 1 && isHeading(rest[take - 1])) {
        let cut = take - 1;
        while (cut > 0 && !(rest[cut - 1] === "" && rest[cut] !== "")) cut--;
        if (cut === 0) break;
        take = cut;
      }
      if (take <= 0) take = Math.min(capacity, rest.length);
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

/** The page each heading lands on, read back from the laid-out pages. */
function pageOfHeadings(pages, entries) {
  const found = new Map();
  for (const page of pages) {
    for (const line of page) {
      const trimmed = line.trim();
      for (const entry of entries) {
        if (found.has(entry.full)) continue;
        if (trimmed === entry.full) found.set(entry.full, page);
      }
    }
  }
  return found;
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




/**
 * The License Notice, read the way the registry's checker reads a plaintext
 * submission: a form feed ends a paragraph.
 *
 * The -03 was rejected on 16 November 2026 for exactly this. Its Trust
 * paragraph ran across a page break, and idnits 2.17.1 answered "the
 * document seems to lack a License Notice ... however, there's a paragraph
 * with a matching beginning". The filed -01 carries the same break in its
 * served text, but it was submitted as xml2rfc XML, so the checker read the
 * source and not the rendering. A plaintext submission must not break it.
 *
 * So the notice must sit inside one page, and be one paragraph. The words
 * are wrapped across lines, so the check is made word by word, and every
 * word remembers the page it is printed on.
 */
function licenseNotice(raw) {
  const copyrightSentence =
    "Copyright (c) 2026 IETF Trust and the persons identified as the document authors. All rights reserved.";

  // Every word of the document, with the page it is printed on.
  const words = [];
  const breaks = [];
  raw.split("\f").forEach((page, pageIndex) => {
    for (const line of page.split("\n")) {
      if (line.trim() === "") {
        breaks.push(words.length);
        continue;
      }
      for (const word of line.trim().split(/\s+/)) words.push({ word, page: pageIndex });
    }
  });
  const flow = words.map((w) => w.word).join(" ");

  const at = (needle) => {
    const at = flow.indexOf(needle);
    return at < 0 ? -1 : flow.slice(0, at).split(" ").length - 1;
  };
  const copyrightAt = at(copyrightSentence);
  if (copyrightAt < 0) return { ok: false, why: "the copyright line is missing" };
  const noticeAt = at(TRUST_NOTICE);
  if (noticeAt < 0) return { ok: false, why: "the Copyright Notice is not the Trust's paragraph, word for word" };

  const copyrightWords = copyrightSentence.split(" ").length;
  const noticeWords = TRUST_NOTICE.split(" ").length;

  const copyrightPages = new Set(words.slice(copyrightAt, copyrightAt + copyrightWords).map((w) => w.page));
  if (copyrightPages.size !== 1) {
    return { ok: false, why: "the copyright line runs across a page break" };
  }
  const noticePages = new Set(words.slice(noticeAt, noticeAt + noticeWords).map((w) => w.page));
  if (noticePages.size !== 1) {
    const span = [...noticePages].sort((a, b) => a - b);
    return {
      ok: false,
      why: `the License Notice runs across pages ${span[0] + 1} and ${span[span.length - 1] + 1}`,
    };
  }
  const inside = breaks.filter((b) => b > noticeAt && b < noticeAt + noticeWords);
  if (inside.length) return { ok: false, why: `the License Notice is ${inside.length + 1} paragraphs, not one` };
  return { ok: true };
}

/** Build the pages of one draft, with the table of contents page numbers. */
function layout(doc, lines, expiryText, monthYear, rules) {
  const { front, body } = splitFrontMatter(lines);
  const entries = headings(lines);

  let toc = [];
  let pages = null;
  for (let round = 0; round < 6; round++) {
    const withToc = rules.toc ? insertToc(body, toc) : body;
    pages = paginate(front, withToc, expiryText, monthYear);
    if (!rules.toc) break;
    const placed = pageOfHeadings(pages, entries);
    const next = entries.map((entry) => {
      const page = placed.get(entry.full);
      if (!page) throw new Error(`the heading "${entry.full}" is not on any page`);
      return tocLine(entry, pages.indexOf(page) + 1);
    });
    const same = next.length === toc.length && next.every((l, i) => l === toc[i]);
    toc = next;
    if (same) break;
  }
  return { pages, toc };
}

/** Put the table of contents between the Copyright Notice and section 1. */
function insertToc(body, toc) {
  const at = body.findIndex((l) => /^1\.\s/.test(l));
  if (at < 0) throw new Error("no section 1 heading found");
  if (!toc.length) return body;
  const block = ["Table of Contents", "", ...toc, ""];
  return [...body.slice(0, at), ...block, ...body.slice(at)];
}

function build(doc) {
  const rules = DOCS[doc];
  if (!rules) throw new Error(`unknown draft: ${doc}`);
  const source = path.join(ROOT, `public/ietf/${doc}.txt`);
  const artifact = path.join(ROOT, `public/ietf/submission/${doc}.txt`);
  const proseFile = path.join(PROSE_DIR, `${doc}.prose.txt`);

  if (process.argv.includes("--prose")) {
    const published = readFileSync(source, "utf8");
    process.stdout.write(stripPagination(published).join("\n") + "\n");
    return;
  }

  const prose = readFileSync(proseFile, "utf8");
  checkBytes(prose);
  const lines = prose.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
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

  const { pages } = layout(doc, lines, expiryText, monthYear, rules);
  const artifactText = pages.map((p) => p.join("\n")).join("\n\f\n") + "\n";
  checkBytes(artifactText);
  const notice = licenseNotice(artifactText);
  if (!notice.ok) fail(`the License Notice is not right: ${notice.why}`);

  // The round trip. What the script lays out, when the page furniture comes
  // off again, must be the prose it was given, word for word. A page break
  // that ran through a paragraph would come back as a paragraph break, and
  // that is how the Trust's paragraph was cut in half.
  const roundTrip = stripPagination(artifactText);
  if (roundTrip.join("\n") !== lines.join("\n")) {
    const at = roundTrip.findIndex((line, i) => line !== lines[i]);
    fail(`the layout does not reproduce the prose: line ${at + 1} reads ${JSON.stringify(roundTrip[at])} and the prose reads ${JSON.stringify(lines[at])}`);
  }

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

  const digest = createHash("sha256").update(artifactText, "utf8").digest("hex");
  const bytes = Buffer.byteLength(artifactText, "utf8");

  if (process.argv.includes("--check")) {
    const stale = [];
    for (const [label, file] of [["published copy", source], ["upload artifact", artifact]]) {
      let existing = null;
      try {
        existing = readFileSync(file, "utf8");
      } catch {
        existing = null;
      }
      if (existing !== artifactText) stale.push(label);
    }
    if (stale.length) {
      console.error(`the ${stale.join(" and the ")} is stale: run \`node scripts/ietf-plaintext-layout.mjs\` and commit the result`);
      process.exit(1);
    }
    console.log(`${doc}: upload artifact is current: ${bytes} bytes, sha256 ${digest}, ${pages.length} pages`);
    return;
  }

  // The published copy and the upload artifact are the same bytes: the site
  // serves the draft the registry holds, so a stranger can recompute one
  // digest and get the same answer from either door.
  writeFileSync(source, artifactText, "utf8");
  writeFileSync(artifact, artifactText, "utf8");
  console.log(`wrote public/ietf/${doc}.txt and public/ietf/submission/${doc}.txt`);
  console.log(`  ${bytes} bytes, ${artifactText.split("\n").length} lines, ${pages.length} pages`);
  console.log(`  sha256 ${digest}`);
  console.log(`  document date ${documentDate}, expiry ${expiry} (document date + ${REGISTRY_EXPIRY_DAYS} days)`);
}

const only = process.argv.find((a) => a.startsWith("--doc="));
const wanted = only ? only.slice("--doc=".length) : null;
for (const doc of Object.keys(DOCS)) {
  if (wanted && doc !== wanted) continue;
  build(doc);
}
