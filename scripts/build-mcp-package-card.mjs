#!/usr/bin/env node
/**
 * build-mcp-package-card.mjs — the three public MCP cards are MEASURED, not typed.
 *
 * The estate publishes three machine-readable cards for the npm door:
 * public/.well-known/mcp/local-tools.json (the package's own tool list) and the
 * `alternative_installs` block inside server-card.json and server.json. Each one
 * names a package and a version, and a version a stranger cannot install is a
 * contract broken in public.
 *
 * Measured 19 Nov 2026: all three named apex-psi-mcp 1.2.0 while the registry
 * had been serving 1.2.2 since 17 Nov. The cards also declared every tool
 * read-only — including `seal`, which appends a record to the ledger — while the
 * package's own annotations said readOnlyHint: false. The card a directory
 * scrapes said "this server never writes"; the server writes.
 *
 * So the cards are generated from the registry, by installing the package the
 * registry serves and asking it what it answers:
 *
 *   1. what is the latest release on npm?
 *   2. install exactly that release, from the public registry;
 *   3. initialize the server over stdio and call tools/list;
 *   4. write the tool names, titles, descriptions and annotations we measured;
 *   5. probe the hosted connector and record whether it still answers with the
 *      OAuth challenge, so the card's dates are dates and not hopes.
 *
 * Usage:
 *   node scripts/build-mcp-package-card.mjs            # rewrite the three cards
 *   node scripts/build-mcp-package-card.mjs --check    # fail if they have drifted
 *
 * Exit 0 - the cards match what the registries serve.
 * Exit 1 - they do not, and the reason is named.
 */
import { spawnSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const MCP_DIR = join(repo, "public", ".well-known", "mcp");
const LOCAL_TOOLS = join(MCP_DIR, "local-tools.json");
const HOSTED_CARDS = [join(MCP_DIR, "server-card.json"), join(MCP_DIR, "server.json")];
const NPM_PKG = "apex-psi-mcp";
const REGISTRY = "https://registry.npmjs.org";

const checkOnly = process.argv.includes("--check");
let failures = 0;
function fail(what, detail) {
  failures++;
  console.error(`FAIL ${what}${detail ? ": " + detail : ""}`);
}
function pass(what, detail) {
  console.log(`PASS ${what}${detail ? ": " + detail : ""}`);
}

// Local date, so a card stamped "2026-11-19" means the same day the estate's
// own notes mean. The registry's own timestamps are UTC and are quoted as they
// are when they are quoted at all.
const today = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const isWin = process.platform === "win32";
const NPM = isWin ? "npm.cmd" : "npm";

// ------------------------------------------------------------------ registry

async function registryLatest(pkg) {
  const res = await fetch(`${REGISTRY}/${pkg}`, {
    headers: { "User-Agent": "apex-psi-mcp-card", Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  }).catch((e) => ({ ok: false, status: `network: ${e.message}` }));
  if (!res.ok) throw new Error(`npm ${pkg}: HTTP ${res.status}`);
  const json = await res.json();
  return { latest: json["dist-tags"].latest, versions: Object.keys(json.versions) };
}

// ------------------------------------------------------------------ measure

const { latest: pkgVersion, versions: allVersions } = await registryLatest(NPM_PKG);
if (!pkgVersion) throw new Error(`npm ${NPM_PKG} answered without a version`);
console.log(`npm ${NPM_PKG} latest = ${pkgVersion}`);

// The tarball must actually exist. A registry that advertises a version whose
// tarball 404s breaks every install line we publish, and the manifest does not
// show that — only the tarball does.
const tarball = await fetch(`${REGISTRY}/${NPM_PKG}/-/${NPM_PKG}-${pkgVersion}.tgz`, {
  method: "HEAD",
  signal: AbortSignal.timeout(30_000),
}).catch((e) => ({ ok: false, status: String(e.message) }));
if (!tarball.ok) {
  fail(
    `the tarball for ${NPM_PKG}@${pkgVersion} is downloadable`,
    `HTTP ${tarball.status} — the registry advertises this version but cannot serve it, so every install line for it fails`,
  );
} else {
  pass(`the tarball for ${NPM_PKG}@${pkgVersion} is downloadable`);
}

const work = mkdtempSync(join(tmpdir(), "apex-mcp-card-"));
let measuredTools = [];
let serverInfo = null;
try {
  const install = spawnSync(
    NPM,
    ["install", "--no-audit", "--no-fund", "--prefix", work, `${NPM_PKG}@${pkgVersion}`],
    { encoding: "utf8", shell: isWin, maxBuffer: 32 * 1024 * 1024 },
  );
  if (install.status !== 0) {
    fail(`install ${NPM_PKG}@${pkgVersion}`, (install.stdout || install.stderr || "").slice(-400));
    throw new Error("install failed");
  }
  const entry = join(work, "node_modules", NPM_PKG, "dist", "index.js");
  if (!existsSync(entry)) throw new Error("published package layout changed: dist/index.js missing");

  const child = spawn(process.execPath, [entry], { stdio: ["pipe", "pipe", "pipe"] });
  const rl = createInterface({ input: child.stdout });
  const pending = new Map();
  let nextId = 1;
  let stderr = "";
  child.stderr.on("data", (b) => (stderr += b.toString()));
  rl.on("line", (line) => {
    line = line.trim();
    if (!line.startsWith("{")) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: done } = pending.get(msg.id);
      pending.delete(msg.id);
      done(msg);
    }
  });
  const rpc = (method, params, timeout = 60_000) =>
    new Promise((res, rej) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        rej(new Error(method + " timed out"));
      }, timeout);
      pending.set(id, {
        resolve: (m) => {
          clearTimeout(timer);
          res(m);
        },
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });

  try {
    const init = await rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "apex-mcp-card", version: "1" },
    });
    serverInfo = init.result?.serverInfo ?? null;
    if (!serverInfo) throw new Error(`initialize failed: ${JSON.stringify(init.error || init).slice(0, 200)}`);
    const listed = await rpc("tools/list", {});
    const tools = listed.result?.tools || [];
    if (!tools.length) throw new Error("tools/list returned no tools");
    measuredTools = tools.map((t) => ({
      name: t.name,
      title: t.title ?? t.name,
      description: t.description ?? "",
      // The package states its own hints; a card that contradicts them is a card
      // that lies about the server it describes.
      write: t.annotations?.readOnlyHint === false,
      annotations: {
        readOnlyHint: t.annotations?.readOnlyHint ?? null,
        destructiveHint: t.annotations?.destructiveHint ?? null,
        idempotentHint: t.annotations?.idempotentHint ?? null,
      },
    }));
  } finally {
    child.kill();
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

pass(
  `the published package answers tools/list`,
  `${serverInfo?.name} ${serverInfo?.version} — ${measuredTools.length} tools: ${measuredTools.map((t) => t.name).join(", ")}`,
);
if (serverInfo && serverInfo.version !== pkgVersion) {
  fail("the package reports the version the registry advertised", `${serverInfo.version} vs ${pkgVersion}`);
}
for (const t of measuredTools) {
  if (t.write) {
    pass(`tool ${t.name} declares it can write`, "readOnlyHint false — the card must not call it read-only");
  }
}

// ------------------------------------------------------- the hosted connector

let hostedAnswered = null;
for (const cardPath of HOSTED_CARDS) {
  if (!existsSync(cardPath)) continue;
  const card = JSON.parse(readFileSync(cardPath, "utf8"));
  const url = card?.transport?.url;
  if (!url) continue;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "apex-mcp-card", version: "1" } },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const challenge = res.headers.get("www-authenticate") || "";
    hostedAnswered = res.status === 401 && /resource_metadata=/.test(challenge);
    pass(
      "the hosted connector still answers with the OAuth challenge",
      `HTTP ${res.status}${hostedAnswered ? " with a resource_metadata pointer" : " — no challenge"}`,
    );
    if (!hostedAnswered) {
      fail("the hosted connector still answers with the OAuth challenge", `HTTP ${res.status}`);
    }
  } catch (e) {
    hostedAnswered = false;
    fail("the hosted connector still answers with the OAuth challenge", String(e.message));
  }
  break;
}

// ------------------------------------------------------------------ the cards

const nextLocal = {
  measured_at: today,
  measured_by: `npm install ${NPM_PKG}@${pkgVersion} from the public registry, then a tools/list call over stdio`,
  package: NPM_PKG,
  version: pkgVersion,
  tools: measuredTools,
};

const cardNote = (version) =>
  `A different server with different names: ${measuredTools.map((t) => t.name).join(", ")}. Runs on your machine, no sign-in. ` +
  `Its own card is published with the npm package. Measured against ${NPM_PKG}@${version} on ${today}; the install command takes the registry's current release.`;

const nextHostedCards = HOSTED_CARDS.map((p) => {
  const card = JSON.parse(readFileSync(p, "utf8"));
  const alt = (card.alternative_installs || []).find((a) => a.identifier === NPM_PKG);
  if (alt) {
    alt.version = pkgVersion;
    alt.tools = measuredTools.map((t) => t.name);
    alt.note = cardNote(pkgVersion);
    alt.measured_at = today;
  }
  if (card.measured) {
    card.measured.package_measured_at = today;
    // The remote is only re-dated when it was actually probed this run.
    if (hostedAnswered) card.measured.remote_probed_at = today;
  }
  return { path: p, card };
});

// A date inside a sentence is not drift — the sentence is compared without it.
const stripDate = (s) => (typeof s === "string" ? s.replace(/\d{4}-\d{2}-\d{2}/g, "<date>") : s);

function diffCards(label, current, next, { ignore = [] } = {}) {  const strip = (o) => {
    const clone = JSON.parse(JSON.stringify(o));
    for (const key of ignore) if (key in clone) delete clone[key];
    return JSON.stringify(clone, null, 2);
  };
  if (strip(current) === strip(next)) {
    pass(label, "matches what the registries serve");
    return true;
  }
  fail(label, "the committed card does not match what was measured");
  return false;
}

if (checkOnly) {
  const currentLocal = JSON.parse(readFileSync(LOCAL_TOOLS, "utf8"));
  diffCards("public/.well-known/mcp/local-tools.json", currentLocal, nextLocal, {
    ignore: ["measured_at", "measured_by"],
  });
  for (const { path, card } of nextHostedCards) {
    const label = path.replace(/\\/g, "/");
    const current = JSON.parse(readFileSync(path, "utf8"));
    // The measured block holds dates and the alternative_installs note quotes
    // one, so neither can be compared byte-for-byte. Everything else can.
    diffCards(label, current, card, { ignore: ["measured", "alternative_installs"] });
    const alt = (current.alternative_installs || []).find((a) => a.identifier === NPM_PKG);
    const measuredAlt = (card.alternative_installs || []).find((a) => a.identifier === NPM_PKG);
    if (!alt) fail(`${label} names ${NPM_PKG}`, "the alternative_installs entry is gone");
    else {
      if (alt.version !== pkgVersion) {
        fail(`${label} names the release npm serves`, `card says ${alt.version}, npm serves ${pkgVersion}`);
      } else {
        pass(`${label} names the release npm serves`, pkgVersion);
      }
      const names = measuredTools.map((t) => t.name).join(",");
      if ((alt.tools || []).join(",") !== names) {
        fail(`${label} names the tools the package answers`, `card: ${(alt.tools || []).join(", ")}`);
      } else {
        pass(`${label} names the tools the package answers`, names);
      }
      if (measuredAlt && stripDate(alt.note) !== stripDate(measuredAlt.note)) {
        fail(`${label} describes the npm door from the measurement`, "the note does not match the measured release");
      }
    }
  }
} else {
  writeFileSync(LOCAL_TOOLS, `${JSON.stringify(nextLocal, null, 2)}\n`);
  console.log(`wrote ${LOCAL_TOOLS} (${NPM_PKG}@${pkgVersion}, ${measuredTools.length} tools)`);
  for (const { path, card } of nextHostedCards) {
    writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`);
    console.log(`wrote ${path}`);
  }
}

console.log(
  `\n${failures === 0 ? "MCP-CARD OK" : "MCP-CARD FAILED"}: ${failures} failure(s)` +
    ` — npm ${NPM_PKG} ${pkgVersion} (${allVersions.length} release(s) on the index)`,
);
process.exit(failures === 0 ? 0 : 1);
