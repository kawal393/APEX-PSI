#!/usr/bin/env node
/**
 * sticky-nav-check.mjs — refuses a page wrapper that kills its own sticky bar.
 *
 * `overflow-x: hidden` on an ancestor turns that ancestor into a scroll
 * container (CSS computes the other axis to `auto`), so `position: sticky`
 * inside it resolves against that container instead of the viewport — and the
 * bar scrolls away with the page. Measured 16 Nov 2026 against the live site
 * in headless Chrome at 1280x900: after scrolling 1200px the navigation bar's
 * top sat at -1114 and no bar was on screen. The same page built with
 * `overflow-x: clip` — which clips without creating a scroll container — kept
 * both the nav bar and the view-switcher bar on screen.
 *
 * The defect was written on a laptop branch on 3 October 2026 and never
 * reached the published tree, so nothing would have caught it. This refuses
 * the class, not the instance: any page wrapper that carries `overflow-x-
 * hidden` is rejected, because a scroll container around a sticky bar is
 * never what the page meant.
 *
 *   node scripts/sticky-nav-check.mjs
 *
 * Exits 0 when no page wrapper carries `overflow-x-hidden`.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = path.join(ROOT, "src", "pages");

const findings = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    const text = await readFile(full, "utf8");
    text.split("\n").forEach((line, index) => {
      if (!line.includes("overflow-x-hidden")) return;
      findings.push({
        file: path.relative(ROOT, full),
        line: index + 1,
        text: line.trim(),
      });
    });
  }
}

await walk(PAGES);

if (findings.length) {
  console.error("sticky-nav-check: a page wrapper carries overflow-x-hidden.\n");
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.text}`);
  }
  console.error(
    "\n`overflow-x: hidden` makes the wrapper a scroll container, so a sticky bar\n" +
      "inside it resolves against the wrapper and scrolls away. Use `overflow-x-clip`,\n" +
      "which clips the overflow without creating a scroll container.",
  );
  process.exit(1);
}

console.log("sticky-nav-check: no page wrapper carries overflow-x-hidden.");
