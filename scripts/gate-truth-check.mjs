#!/usr/bin/env node
/**
 * gate-truth-check.mjs — the agent doors must agree with the example they publish.
 *
 * What went wrong on 25 Nov 2026, in three separate places, all of them
 * invisible to a green build:
 *
 *   1. The published example let four cases share one proposal id, and two
 *      payment cases share another. A proposal has ONE use: on a door with a
 *      durable replay store, the first case posted spends it and the rest
 *      answer `replay`. The example was therefore untestable at the money
 *      door beyond its first case.
 *
 *   2. The conformance door keyed its replay store on the proposal id ALONE,
 *      so the example's one valid case was spent for good and every later
 *      visitor was told `replay`. And with no session the door kept no replay
 *      memory at all, so the same signed request could be posted again and
 *      again and be allowed every time.
 *
 *   3. The money door never bound the payment tool and never applied the
 *      mandate's spend limit, because the receiver gate checks a limit only
 *      against a settlement and a payment request carries no settlement.
 *
 * A door that cannot be tested against its own example is a door nobody is
 * looking at. This guard compiles the site's own vendored gate (the TypeScript
 * that Deno will run, with only the import suffix rewritten), runs it over
 * every case in the example the site publishes, and checks that the two
 * copies of that example are the same bytes.
 *
 * Usage:
 *   node scripts/gate-truth-check.mjs
 *   GATE_TSC=/path/to/tsc node scripts/gate-truth-check.mjs   (a compiler elsewhere)
 *
 * Exit 0 - the doors and the example agree.
 * Exit 1 - they do not.
 * Exit 2 - the check could not run.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const work = join(root, ".gate-truth-check");

let failures = 0;
function pass(what, detail) {
  console.log(`PASS ${what}${detail ? ": " + detail : ""}`);
}
function fail(what, detail) {
  failures++;
  console.error(`FAIL ${what}${detail ? ": " + detail : ""}`);
}

// The tiers the door sells. The price id is the server's; only the ceiling and
// the currency are rules, so those are what this guard checks.
const TIERS = {
  pro: { priceId: "price_pro_placeholder", label: "Pro", currency: "USD", maxMinor: 200000 },
  ultra: { priceId: "price_ultra_placeholder", label: "Ultra", currency: "USD", maxMinor: 2000000 },
};

const vendoredDir = join(root, "supabase", "functions", "_shared", "psi-agent");
const agentDoor = join(root, "supabase", "functions", "agent-checkout", "index.ts");
const conformanceDoor = join(root, "supabase", "functions", "machine-checkout", "index.ts");
const publishedExample = join(root, "public", "conformance", "agent-03-example.json");
const functionExample = join(root, "supabase", "functions", "machine-checkout", "agent-03-example.json");

for (const [what, path] of [
  ["the vendored gate", vendoredDir],
  ["the money door", agentDoor],
  ["the conformance door", conformanceDoor],
  ["the published example", publishedExample],
  ["the function's copy of the example", functionExample],
]) {
  if (!existsSync(path)) {
    console.error(`STOP: ${what} is missing at ${path}`);
    process.exit(2);
  }
}

// 1. The rules the two doors must carry, read out of their own source.
{
  const agent = readFileSync(agentDoor, "utf8");
  const conformance = readFileSync(conformanceDoor, "utf8");
  const agentRules = [
    ["calls the payment rules", "evaluatePayment("],
    ["binds the payment tool", "PAYMENT_TOOL"],
    ["spends the proposal id alone", "replay_key: pid"],
    ["reports the keyring fingerprint", "keyring_fingerprint"],
    ["creates the session last", "stripe.checkout.sessions.create"],
  ];
  for (const [what, needle] of agentRules) {
    if (agent.includes(needle)) pass(`the money door ${what}`);
    else fail(`the money door ${what}`, `no "${needle}" in ${agentDoor}`);
  }
  const conformanceRules = [
    ["scopes the replay key to the session", "conformance:${session}:${pid}"],
    ["requires a session", "session_required"],
  ];
  for (const [what, needle] of conformanceRules) {
    if (conformance.includes(needle)) pass(`the conformance door ${what}`);
    else fail(`the conformance door ${what}`, `no "${needle}" in ${conformanceDoor}`);
  }
}

// 2. The two copies of the example must be the same bytes: the function reads
// its own copy for the keyring, and the page fetches the published one.
{
  const a = readFileSync(publishedExample);
  const b = readFileSync(functionExample);
  if (a.equals(b)) {
    pass("the published example and the function's copy are byte-identical", `${a.length} bytes`);
  } else {
    fail("the published example and the function's copy are byte-identical", `${a.length} vs ${b.length} bytes`);
  }
}

// 3. The example's keyring fingerprint must be the fingerprint of its keyring.
{
  const doc = JSON.parse(readFileSync(publishedExample, "utf8"));
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(doc.keyring ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
  );
  const fingerprint = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
  if (fingerprint === doc.keyring_fingerprint) {
    pass("the example's keyring fingerprint matches its keyring", fingerprint);
  } else {
    fail("the example's keyring fingerprint matches its keyring", `file says ${doc.keyring_fingerprint}, keyring hashes to ${fingerprint}`);
  }
}

// 4. No two cases may share a proposal id.
{
  const doc = JSON.parse(readFileSync(publishedExample, "utf8"));
  const owners = new Map();
  let count = 0;
  const claim = (label, entry) => {
    const pid = entry?.request?.proposal?.pid;
    if (typeof pid !== "string") return;
    count++;
    if (!owners.has(pid)) owners.set(pid, []);
    owners.get(pid).push(label);
  };
  claim("allow.request", doc.allow);
  (doc.refusals ?? []).forEach((e, i) => claim(`refusals[${i}] ${e.case}`, e));
  claim("payment.allow", doc.payment?.allow);
  (doc.payment?.refusals ?? []).forEach((e, i) => claim(`payment.refusals[${i}] ${e.case}`, e));
  const shared = [...owners.values()].filter((names) => names.length > 1);
  if (shared.length === 0) {
    pass("every case owns its own proposal", `${count} cases, ${owners.size} distinct proposal ids`);
  } else {
    for (const names of shared) fail("every case owns its own proposal", names.join(" and "));
  }
}

// 5. The compiler. The vendored sources are the TypeScript Deno will run, so
// this compiles them and then RUNS them over the example. The only change is
// the import suffix: Deno resolves "./agent.ts", Node resolves "./agent.js".
const tsc = process.env.GATE_TSC ?? join(root, "node_modules", "typescript", "bin", "tsc");
if (!existsSync(tsc)) {
  console.error(`STOP: no compiler at ${tsc}. Run npm ci, or set GATE_TSC to a typescript install.`);
  process.exit(2);
}

rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, "src"), { recursive: true });
for (const file of readdirSync(vendoredDir).filter((f) => f.endsWith(".ts"))) {
  const body = readFileSync(join(vendoredDir, file), "utf8").replace(/from "\.\/([A-Za-z0-9_-]+)\.ts"/g, 'from "./$1.js"');
  writeFileSync(join(work, "src", file), body, "utf8");
}
writeFileSync(join(work, "package.json"), JSON.stringify({ type: "module" }, null, 2), "utf8");
// The type roots: this repository's own, or the ones beside the compiler that
// was used. A compiler borrowed from another checkout still finds its types.
const typeRootCandidates = [
  join(root, "node_modules", "@types"),
  join(dirname(dirname(dirname(tsc))), "@types"),
].filter((p) => existsSync(p));

writeFileSync(
  join(work, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        lib: ["ES2022"],
        strict: true,
        outDir: "dist",
        skipLibCheck: true,
        types: ["node"],
        typeRoots: typeRootCandidates,
      },
      include: ["src/**/*.ts"],
    },
    null,
    2,
  ),
  "utf8",
);

const build = spawnSync(process.execPath, [tsc, "-p", join(work, "tsconfig.json")], {
  encoding: "utf8",
  cwd: work,
});
if (build.status !== 0) {
  fail("the vendored gate compiles", `${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(0, 6).join(" | "));
} else {
  pass("the vendored gate compiles");
}

if (build.status === 0) {
  const { createReceiverGate } = await import(pathToFileURL(join(work, "dist/receiver.js")).href);
  const { evaluatePayment } = await import(pathToFileURL(join(work, "dist/payment.js")).href);
  const { createPublicKey } = await import("node:crypto");

  const doc = JSON.parse(readFileSync(publishedExample, "utf8"));
  const resolveKey = (kid) => {
    const spki = doc.keyring?.[kid];
    if (!spki) return null;
    return createPublicKey({ key: Buffer.from(spki, "base64"), format: "der", type: "spki" });
  };
  const gateFor = () => createReceiverGate({ resolveKey, mode: "enforce" });

  const allow = await gateFor().authorize(doc.allow.request);
  if (allow.allowed) pass("the example's valid run is permitted");
  else fail("the example's valid run is permitted", `reason=${allow.reason}`);

  for (const entry of doc.refusals ?? []) {
    if (entry.expected_reason === "replay") {
      const gate = gateFor();
      const first = await gate.authorize(entry.request);
      const second = await gate.authorize(entry.request);
      if (first.allowed && !second.allowed && second.reason === "replay") pass(`refuses ${entry.case}: replay`);
      else fail(`refuses ${entry.case}: replay`, `first=${first.allowed} second=${second.reason}`);
      continue;
    }
    const r = await gateFor().authorize(entry.request);
    if (!r.allowed && r.reason === entry.expected_reason) pass(`refuses ${entry.case}: ${entry.expected_reason}`);
    else fail(`refuses ${entry.case}: ${entry.expected_reason}`, `got ${r.reason}`);
  }

  const payAllow = doc.payment?.allow?.request;
  if (payAllow) {
    const g = await gateFor().authorize(payAllow);
    const v = evaluatePayment({ tool: payAllow.tool, args: payAllow.args, mandate: payAllow.mandate }, TIERS);
    if (g.allowed && v.allowed) pass("the example's permitted payment is permitted", `${v.tier} ${v.amountMinor}`);
    else fail("the example's permitted payment is permitted", `gate=${g.reason} door=${v.reason}`);
  }
  for (const entry of doc.payment?.refusals ?? []) {
    const req = entry.request;
    if (entry.expected_reason === "replay") {
      const gate = gateFor();
      const first = await gate.authorize(req);
      const second = await gate.authorize(req);
      if (first.allowed && !second.allowed && second.reason === "replay") pass(`refuses ${entry.case}: replay`);
      else fail(`refuses ${entry.case}: replay`, `first=${first.allowed} second=${second.reason}`);
      continue;
    }
    const g = await gateFor().authorize(req);
    const v = evaluatePayment({ tool: req.tool, args: req.args, mandate: req.mandate }, TIERS);
    if (entry.checked_by === "gate") {
      if (!g.allowed && g.reason === entry.expected_reason) pass(`refuses ${entry.case}: ${entry.expected_reason} (gate)`);
      else fail(`refuses ${entry.case}: ${entry.expected_reason} (gate)`, `got ${g.reason}`);
    } else {
      if (g.allowed && !v.allowed && v.reason === entry.expected_reason) pass(`refuses ${entry.case}: ${entry.expected_reason} (door)`);
      else fail(`refuses ${entry.case}: ${entry.expected_reason} (door)`, `gate=${g.reason} door=${v.reason}`);
    }
  }
}

rmSync(work, { recursive: true, force: true });

if (failures) {
  console.error(`\nGATE TRUTH FAILED: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nGATE TRUTH OK: the doors and the published example agree.");
process.exit(0);
