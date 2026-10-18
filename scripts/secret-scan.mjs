#!/usr/bin/env node
// Secret scanner for CI. Fails on high-confidence live credentials.
//
// It never prints a matched value — only the file, the line number and the name of
// the pattern that fired. That is deliberate: an earlier incident in this estate was
// a Stripe live key committed to this repository, and a scanner that echoes the
// matched text would leak the secret into the build log and then into the API.
//
// Usage:  node scripts/secret-scan.mjs [path...]     (defaults to git-tracked files)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["stripe-live-secret", /\b[rs]k_live_[0-9a-zA-Z]{16,}\b/],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["github-token", /\b(ghp|gho|ghs|ghu|ghr)_[0-9A-Za-z]{20,}\b/],
  ["github-fine-grained-token", /\bgithub_pat_[0-9A-Za-z_]{20,}\b/],
  ["supabase-pat", /\bsbp_[0-9A-Za-z]{20,}\b/],
  ["service-role-assignment", /service_role['"]?\s*[:=]\s*["'`]?[A-Za-z0-9._-]{20,}/],
  ["jwt-with-long-body", /\beyJ[0-9A-Za-z_-]{40,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\b/],
  ["private-key-block", /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["slack-token", /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["sendgrid-key", /\bSG\.[0-9A-Za-z_-]{16,}\.[0-9A-Za-z_-]{16,}\b/],
  ["npm-token", /\bnpm_[0-9A-Za-z]{30,}\b/],
  ["pypi-token", /\bpypi-AgEIcHlwaS5vcmc[0-9A-Za-z_-]{20,}\b/],
  ["supabase-secret-pat", /\bsb_secret_[0-9A-Za-z_-]{20,}\b/],
];

// A Supabase key is a JWT, and its header is shorter than the jwt-with-long-body pattern
// above requires -- so that rule cannot see a Supabase credential at all. Worse, the
// publishable (anon) key and the service-role key share that identical header and differ
// only in one claim inside the payload; on 18 Oct a bot committed the anon key into
// vite.config.ts and the scan correctly stayed quiet, because an anon key is public by
// design. If the same bot commits the service-role one, nothing here would have fired.
// So: decode candidates and judge by the role claim, never by the header shape.
const JWT_CANDIDATE = /\beyJ[\w-]{4,}\.[\w-]{8,}\.[\w-]{8,}\b/g;

function carriesServiceRole(line) {
  for (const token of line.match(JWT_CANDIDATE) ?? []) {
    const payload = token.split(".")[1];
    let claims;
    try {
      claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      continue; // Not decodable JSON: nothing to assert either way.
    }
    const role = String(claims.role ?? "");
    const scope = String(claims.scope ?? "");
    if (role === "service_role" || scope.includes("service_role")) return true;
  }
  return false;
}

// Files deliberately skipped. Keep this empty: a credential file that is tracked has no
// business being exempt, and `.env` is untracked as of this commit (it shipped in the
// repository since 28 Feb 2026, which is how the estate's Stripe key reached GitHub).
const ALLOW = new Set([]);

const fromGit = () =>
  execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);

const targets = process.argv.slice(2).length ? process.argv.slice(2) : fromGit();
const findings = [];

for (const file of targets) {
  if (ALLOW.has(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binary or unreadable: nothing to assert
  }
  if (text.length > 4_000_000) continue;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const [name, re] of PATTERNS) {
      if (re.test(lines[i])) {
        findings.push(`${file}:${i + 1} pattern=${name}`);
        break;
      }
    }
    // Reported by pattern name only, exactly like every other finding here: the value of
    // a service-role key must never reach the build log, which is itself a public surface.
    if (carriesServiceRole(lines[i])) {
      findings.push(`${file}:${i + 1} pattern=supabase-service-role-jwt`);
    }
  }
}

if (findings.length) {
  console.error("SECRET SCAN FAILED — live credential patterns detected (values not printed):");
  for (const f of findings.slice(0, 50)) console.error("  " + f);
  if (findings.length > 50) console.error(`  …and ${findings.length - 50} more`);
  console.error(
    "\nRotate the credential, remove it from the tree, then re-run. Never treat a value that " +
      "reached a public commit as revocable by deletion alone."
  );
  process.exit(1);
}

console.log(`SECRET SCAN OK — ${targets.length} files checked against ${PATTERNS.length} patterns, no live credentials found.`);
