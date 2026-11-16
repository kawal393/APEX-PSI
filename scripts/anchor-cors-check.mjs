// Refuse a trust anchor that a browser on another origin cannot read.
//
// Measured 17 November 2026: ai-governance-standard.com and
// apex-infrastructure.com are served statically behind Cloudflare. The
// cross-origin GET of /.well-known/apex-psi-trust-anchor.json comes back with
// no Access-Control-Allow-Origin, and so does the OPTIONS preflight. A
// verifier in someone else's browser therefore cannot fetch the anchor at all,
// and fails closed for a reason that has nothing to do with the signature.
//
// Two checks:
//   1. Source — the edge function that serves the anchor with CORS must set
//      Access-Control-Allow-Origin, and must not keep a second copy of the
//      anchor bytes. A second copy of a trust anchor is a second thing to trust.
//   2. Live — the canonical URL must answer a cross-origin request with the
//      header, and the bytes it serves must match the repository.
//
// Usage:  node scripts/anchor-cors-check.mjs [--live]
// Exit 0 — the anchor is readable cross-origin from one source of truth.
// Exit 1 — a violation, with the file and line.
//
// --live also reports the state of the published edge function and the two
// static hosts. It is deliberately not wired into CI: the static hosts are
// fronted by Cloudflare, and only an account holder can add the response
// header there. This script is how you see that it landed.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const LIVE = process.argv.includes("--live");

const CANONICAL_ANCHOR_URL = "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json";
const MIRROR_ANCHOR_URL = "https://apex-infrastructure.com/.well-known/apex-psi-trust-anchor.json";
const FUNCTION_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/trust-anchor";

const violations = [];
const notes = [];

// ---------------------------------------------------------------- 1. source

const functionPath = join(ROOT, "supabase", "functions", "trust-anchor", "index.ts");
let source = "";
try {
  source = readFileSync(functionPath, "utf8");
} catch {
  violations.push({
    file: "supabase/functions/trust-anchor/index.ts",
    line: 0,
    what: "the edge function that serves the anchor with CORS does not exist",
  });
}

if (source) {
  const lines = source.split(/\r?\n/);
  const acao = lines.findIndex((l) => /"Access-Control-Allow-Origin"\s*:\s*"\*"/.test(l));
  if (acao === -1) {
    violations.push({
      file: "supabase/functions/trust-anchor/index.ts",
      line: 0,
      what: 'no "Access-Control-Allow-Origin": "*" — the function would not be readable cross-origin',
    });
  }
  if (!source.includes(CANONICAL_ANCHOR_URL)) {
    violations.push({
      file: "supabase/functions/trust-anchor/index.ts",
      line: 0,
      what: "the function does not name the canonical anchor URL it serves",
    });
  }
  // Key material must never be restated in the function: 64 hex characters is
  // the shape of both public keys, and a second copy of either is a second
  // thing to trust.
  lines.forEach((line, i) => {
    const longHex = line.match(/["'][0-9a-fA-F]{64,}["']/);
    if (longHex) {
      violations.push({
        file: "supabase/functions/trust-anchor/index.ts",
        line: i + 1,
        what: "public key material is restated here — the anchor has one source of truth",
      });
    }
  });
}

// ---------------------------------------------------------------- 2. live

if (LIVE) {
  const localPath = join(ROOT, "public", ".well-known", "apex-psi-trust-anchor.json");
  let localDigest = "";
  try {
    const local = JSON.parse(readFileSync(localPath, "utf8"));
    localDigest = `${local.ed25519_public_key ?? "none"}`;
  } catch {
    violations.push({ file: "public/.well-known/apex-psi-trust-anchor.json", line: 0, what: "unreadable" });
  }

  const probe = async (label, url) => {
    try {
      const res = await fetch(url, { headers: { origin: "https://example.com", accept: "application/json" } });
      const acao = res.headers.get("access-control-allow-origin");
      const body = await res.text();
      let sameKey = "no";
      if (localDigest && localDigest !== "none" && res.status === 200) {
        try {
          const doc = JSON.parse(body);
          sameKey = doc.ed25519_public_key === localDigest ? "yes" : "NO — the live anchor names a different key";
        } catch {
          sameKey = "not JSON";
        }
      } else if (res.status !== 200) {
        sameKey = `nothing to compare (status ${res.status})`;
      }
      notes.push(
        `${label}\n    status ${res.status} | Access-Control-Allow-Origin: ${acao ?? "(absent)"} | same key as the repository: ${sameKey}\n    ${url}`,
      );
      return { acao, status: res.status, sameKey };
    } catch (e) {
      notes.push(`${label}\n    unreachable: ${e instanceof Error ? e.message : String(e)}\n    ${url}`);
      return { acao: null, status: 0, sameKey: "unknown" };
    }
  };

  const canonical = await probe("canonical anchor", CANONICAL_ANCHOR_URL);
  const mirror = await probe("commerce mirror of the anchor", MIRROR_ANCHOR_URL);
  const fn = await probe("edge function", FUNCTION_URL);

  if (canonical.acao !== "*") {
    notes.push(
      "canonical anchor is still unreadable cross-origin.\n" +
        "    Cloudflare -> Rules -> Transform Rules -> Modify Response Header, on\n" +
        `      (http.host eq "ai-governance-standard.com" and http.request.uri.path eq "/.well-known/apex-psi-trust-anchor.json")\n` +
        "    set: Access-Control-Allow-Origin: *\n" +
        "    set: Access-Control-Allow-Methods: GET, HEAD, OPTIONS\n" +
        "    set: Access-Control-Max-Age: 86400",
    );
  }
  if (mirror.acao !== "*") {
    notes.push(
      "commerce mirror of the anchor is still unreadable cross-origin.\n" +
        "    the same rule, with http.host eq \"apex-infrastructure.com\"",
    );
  }
  if (fn.acao !== "*") {
    notes.push("edge function has not been published yet — the URL answers nothing yet");
  }
}

// ---------------------------------------------------------------- report

for (const note of notes) console.log(note);

if (violations.length) {
  console.error("\nanchor-cors-check failed:");
  for (const v of violations) console.error(`  ${v.file}${v.line ? `:${v.line}` : ""} — ${v.what}`);
  process.exit(1);
}

console.log("\nanchor-cors-check: the anchor is served from one source of truth.");
