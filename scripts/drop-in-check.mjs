#!/usr/bin/env node
/**
 * drop-in-check.mjs — proves the 15-second drop-in against the PUBLISHED
 * packages, not against this source tree.
 *
 * A drop-in is a promise to a stranger: "install this one line and you can
 * check a receipt". That promise is only worth anything if the package the
 * registry serves actually answers the question. So this script installs the
 * published packages from the public indexes and runs a real document through
 * them:
 *
 *   lane npm   — npm:apex-psi-verifier@<latest>   verifies the canonical fixture
 *                AND refuses a tampered copy of it.
 *   lane pypi  — pypi:psi-verifier[signature]==<latest> does the same in Python.
 *   lane mcp   — npm:apex-psi-mcp@<latest> seals and verifies over MCP stdio.
 *
 * <latest> is read from the index at run time, and each lane refuses to prove a
 * release docs/DROP-IN.md does not advertise. See resolvePins().
 *
 * The fixture is packages/psi-verifier/test/fixtures/psi-seal-envelope.json.
 *
 * Usage: node scripts/drop-in-check.mjs [--lane npm|pypi|mcp] [--keep]
 */
import { spawnSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const FIXTURE = join(repo, "packages", "psi-verifier", "test", "fixtures", "psi-seal-envelope.json");

// Which build each lane proves. Literals here are a second set of pins that
// nothing guarded: this file proved apex-psi-mcp@1.2.0 — the release before the
// tool annotations — while docs/DROP-IN.md told strangers to install 1.2.2, and
// the version-truth guard that catches stale pins reads public/, src/ and docs/,
// never scripts/. The pin is now read from the index the lane installs from and
// checked against the document that advertises it, so the guard proves the
// artifact a stranger would actually get. An env override still pins a release
// on purpose.
let NPM_VERIFIER = process.env.APEX_NPM_VERIFIER_VERSION || null;
let PYPI_VERIFIER = process.env.APEX_PYPI_VERIFIER_VERSION || null;
let MCP_SERVER = process.env.APEX_MCP_VERSION || null;

// The notary's own address, from the project this repository is linked to.
const LEDGER_BASE = (ref) => `https://${ref}.supabase.co/functions/v1`;

async function readIndex(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}
async function npmLatest(name) {
  const doc = await readIndex(`https://registry.npmjs.org/${name}`);
  const version = doc["dist-tags"].latest;
  return { version, deprecated: doc.versions?.[version]?.deprecated ?? null };
}
async function pypiLatest(name) {
  const doc = await readIndex(`https://pypi.org/pypi/${name}/json`);
  const version = doc.info.version;
  const file = (doc.releases?.[version] || [])[0] || {};
  return { version, deprecated: file.yanked || doc.info.yanked || null };
}

// Every version each package is pinned to inside the drop-in document. A name
// carrying two different versions in one document is the 19 Oct defect class.
function advertisedPins() {
  const doc = readFileSync(join(repo, "docs", "DROP-IN.md"), "utf8");
  const pins = new Map();
  for (const m of doc.matchAll(/\b(apex-psi-mcp|apex-psi-verifier|psi-verifier)@(\d+\.\d+\.\d+)/g)) {
    if (!pins.has(m[1])) pins.set(m[1], new Set());
    pins.get(m[1]).add(m[2]);
  }
  return pins;
}

async function resolvePins() {
  let index = null;
  try {
    index = {
      "apex-psi-verifier": await npmLatest("apex-psi-verifier"),
      "apex-psi-mcp": await npmLatest("apex-psi-mcp"),
      "psi-verifier": await pypiLatest("psi-verifier"),
    };
  } catch (error) {
    fail("each lane's pin was read from the index it installs from", String(error?.message || error));
    console.log("\nDROP-IN FAILED: a pin could not be read, so nothing was proved about a real build.");
    process.exit(1);
  }

  for (const [name, info] of Object.entries(index)) {
    if (info.deprecated) {
      fail(`${name}@${info.version} is not marked deprecated by its index`,
        `the registry itself says: ${String(info.deprecated).slice(0, 120)}`);
    }
  }

  NPM_VERIFIER = NPM_VERIFIER ?? index["apex-psi-verifier"].version;
  PYPI_VERIFIER = PYPI_VERIFIER ?? index["psi-verifier"].version;
  MCP_SERVER = MCP_SERVER ?? `apex-psi-mcp@${index["apex-psi-mcp"].version}`;

  const advertised = advertisedPins();
  const proved = {
    "apex-psi-verifier": NPM_VERIFIER,
    "psi-verifier": PYPI_VERIFIER,
    "apex-psi-mcp": MCP_SERVER.includes("@") ? MCP_SERVER.split("@")[1] : MCP_SERVER,
  };
  for (const [name, versions] of advertised) {
    const list = [...versions];
    if (list.length > 1) {
      fail(`docs/DROP-IN.md names one ${name} release`, `it pins ${list.join(" and ")}`);
      continue;
    }
    if (list[0] !== proved[name]) {
      fail(`this run proves the same ${name} release docs/DROP-IN.md advertises`,
        `document says @${list[0]}, this run installs @${proved[name]}`);
    }
  }
  const overrides = [
    process.env.APEX_NPM_VERIFIER_VERSION && "npm",
    process.env.APEX_PYPI_VERIFIER_VERSION && "pypi",
    process.env.APEX_MCP_VERSION && "mcp",
  ].filter(Boolean);
  pass("each lane's pin came from its index and matches docs/DROP-IN.md",
    `npm:${proved["apex-psi-verifier"]} pypi:${proved["psi-verifier"]} mcp:${proved["apex-psi-mcp"]}`
      + (overrides.length ? `  (env pinned: ${overrides.join(", ")})` : ""));
}

const argv = process.argv.slice(2);
const laneArg = argv.includes("--lane") ? argv[argv.indexOf("--lane") + 1] : "all";
const keep = argv.includes("--keep");

const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
const work = mkdtempSync(join(tmpdir(), "apex-dropin-"));
let failures = 0;

const isWin = process.platform === "win32";
const NPM = isWin ? "npm.cmd" : "npm";
const NPX = isWin ? "npx.cmd" : "npx";
const PYTHON = isWin ? "python" : "python3";

function fail(what, detail) {
  failures++;
  console.error(`FAIL ${what}${detail ? ": " + detail : ""}`);
}
function pass(what, detail) {
  console.log(`PASS ${what}${detail ? ": " + detail : ""}`);
}
function run(cmd, args, opts = {}) {
  // Node refuses to spawn a .cmd without a shell on Windows (CVE-2024-27980),
  // and the shell needs every argument quoted.
  const useShell = isWin && /\.(cmd|bat)$/i.test(cmd);
  const argv = useShell ? args.map((a) => (/[\s"^&|<>]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args;
  const r = spawnSync(cmd, argv, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: useShell,
    ...opts,
  });
  return {
    status: r.status,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
    out: (r.stdout || "") + (r.stderr || "") + (r.error ? "\n" + r.error.message : ""),
  };
}

function tampered() {
  const copy = JSON.parse(JSON.stringify(fixture.envelope));
  copy.hash = copy.hash.replace(/^./, (c) => (c === "a" ? "b" : "a"));
  return copy;
}

// ---------------------------------------------------------------- npm lane
async function laneNpm() {
  console.log(`\n=== lane npm: npm:${NPM_VERIFIER} from the public registry ===`);
  const dir = join(work, "npm");
  const install = run(NPM, ["install", "--no-audit", "--no-fund", "--prefix", dir, `apex-psi-verifier@${NPM_VERIFIER}`]);
  if (install.status !== 0) {
    fail("npm install apex-psi-verifier", install.out.slice(-400));
    return;
  }
  const entry = join(dir, "node_modules", "apex-psi-verifier", "dist", "index.js");
  if (!existsSync(entry)) {
    fail("published npm package layout", "dist/index.js missing");
    return;
  }
  const pkg = JSON.parse(readFileSync(join(dir, "node_modules", "apex-psi-verifier", "package.json"), "utf8"));
  const mod = await import(`file://${entry.replace(/\\/g, "/")}`);
  pass("published npm package installed", `${pkg.name}@${pkg.version}`);

  const good = await mod.verifySeal(fixture.envelope, {
    trustRoots: [{ public_key: fixture.public_key, key_id: "drop-in-vector" }],
  });
  if (good.conformant && good.signature_status === "verified" && good.failures.length === 0) {
    pass("npm verifier accepts the canonical fixture", `signature_status=${good.signature_status}`);
  } else {
    fail("npm verifier accepts the canonical fixture", JSON.stringify(good.failures || good).slice(0, 300));
  }

  const bad = await mod.verifySeal(tampered(), {
    trustRoots: [{ public_key: fixture.public_key, key_id: "drop-in-vector" }],
  });
  if (!bad.conformant) {
    pass("npm verifier refuses a tampered receipt", `failures=${(bad.failures || []).length}`);
  } else {
    fail("npm verifier refuses a tampered receipt", "it reported the tampered receipt conformant");
  }
}

// --------------------------------------------------------------- pypi lane
async function lanePypi() {
  console.log(`\n=== lane pypi: pypi:psi-verifier[signature]==${PYPI_VERIFIER} ===`);
  const dir = join(work, "py");
  const install = run(PYTHON, ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", "--target", dir, `psi-verifier[signature]==${PYPI_VERIFIER}`]);
  if (install.status !== 0) {
    fail("pip install psi-verifier[signature]", install.out.slice(-400));
    return;
  }
  const script = join(work, "check.py");
  writeFileSync(
    script,
    [
      "import json, sys",
      "from psi_verifier import verify_seal, __version__",
      `fx = json.load(open(r"""${FIXTURE}""", encoding="utf-8"))`,
      "roots = [{'public_key': fx['public_key'], 'key_id': 'drop-in-vector'}]",
      "good = verify_seal(fx['envelope'], roots)",
      "bad_env = json.loads(json.dumps(fx['envelope']))",
      "bad_env['hash'] = ('b' if bad_env['hash'][0] == 'a' else 'a') + bad_env['hash'][1:]",
      "bad = verify_seal(bad_env, roots)",
      "print(json.dumps({",
      "  'version': __version__,",
      "  'conformant': good.conformant,",
      "  'signature_status': good.signature_status,",
      "  'failures': good.failures,",
      "  'tampered_conformant': bad.conformant,",
      "}))",
    ].join("\n"),
  );
  const py = run(PYTHON, [script], { env: { ...process.env, PYTHONPATH: dir } });
  if (py.status !== 0) {
    fail("published PyPI verifier run", py.out.slice(-400));
    return;
  }
  let out;
  try {
    out = JSON.parse(py.stdout.split("\n").filter((l) => l.trim().startsWith("{")).pop());
  } catch {
    fail("published PyPI verifier run", "no JSON verdict: " + py.stdout.slice(0, 200));
    return;
  }
  if (out.version !== PYPI_VERIFIER) {
    fail("published PyPI version", `expected ${PYPI_VERIFIER}, got ${out.version}`);
    return;
  }
  pass("published PyPI package installed", `psi-verifier==${out.version}`);
  if (out.conformant && out.signature_status === "verified") {
    pass("PyPI verifier accepts the canonical fixture", `signature_status=${out.signature_status}`);
  } else {
    fail("PyPI verifier accepts the canonical fixture", JSON.stringify(out.failures).slice(0, 300));
  }
  if (out.tampered_conformant === false) {
    pass("PyPI verifier refuses a tampered receipt");
  } else {
    fail("PyPI verifier refuses a tampered receipt", "it reported the tampered receipt conformant");
  }
}

// ---------------------------------------------------------------- mcp lane
async function laneMcp() {
  console.log(`\n=== lane mcp: npm:${MCP_SERVER} over stdio ===`);
  const child = spawn(NPX, ["-y", MCP_SERVER], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: isWin,
  });
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
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  });
  const rpc = (method, params, timeout = 120000) =>
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
      clientInfo: { name: "apex-drop-in-check", version: "1" },
    });
    const serverInfo = init.result?.serverInfo;
    if (!serverInfo) {
      fail("MCP initialize", JSON.stringify(init.error || init).slice(0, 300));
      child.kill();
      return;
    }
    pass("published MCP door answers", `${serverInfo.name} ${serverInfo.version}`);
    const tools = await rpc("tools/list", {});
    const names = (tools.result?.tools || []).map((t) => t.name);
    for (const want of ["seal", "verify"]) {
      if (names.includes(want)) pass(`MCP tool present: ${want}`);
      else fail(`MCP tool present: ${want}`, "tools/list returned " + names.join(", "));
    }
    const content = "APEX PSI drop-in proof " + new Date().toISOString();

    // The promise a stranger reads is "install one package and check a receipt",
    // so the read leg is proved against a row the public ledger really holds — not
    // against a receipt this run was allowed to mint. When the notary refuses
    // writes, as it did on 19 Nov, the seal below fails; this line still says
    // whether an installed verifier can check what is already in the record.
    const projectRef = (readFileSync(join(repo, "supabase", "config.toml"), "utf8")
      .match(/project_id\s*=\s*"([^"]+)"/) || [])[1];
    if (!projectRef) {
      fail("the ledger's own address was read from supabase/config.toml", "no project_id found");
    } else {
      let realHash = null;
      try {
        const mirror = await fetch(`${LEDGER_BASE(projectRef)}/audit-mirror`, { signal: AbortSignal.timeout(30_000) });
        const first = (await mirror.text()).split(/\r?\n/).find(Boolean);
        realHash = String(JSON.parse(first || "{}").commit_hash || "");
      } catch (error) {
        fail("the public mirror served a row to verify", String(error?.message || error));
      }
      if (/^[0-9a-f]{64}$/.test(realHash)) {
        const onLedger = await rpc("tools/call", { name: "verify", arguments: { hash: realHash } });
        const otext = onLedger.result?.content?.[0]?.text || "";
        let oj = null;
        try { oj = JSON.parse(otext); } catch { /* asserted below */ }
        if (onLedger.result?.isError === true || oj?.verification?.verified !== true) {
          fail("the installed MCP door verifies a receipt the ledger already holds",
            `sha256:${realHash.slice(0, 16)}… :: ${otext.replace(/\s+/g, " ").slice(0, 260)}`);
        } else {
          pass("the installed MCP door verifies a receipt the ledger already holds",
            `sha256:${realHash.slice(0, 16)}… commit_id=${oj.verification?.commit_id ?? "?"}`);
        }
      }
    }

    const sealed = await rpc("tools/call", { name: "seal", arguments: { content } });
    const text = sealed.result?.content?.[0]?.text || "";
    if (!text) {
      fail("MCP seal", JSON.stringify(sealed.error || "no text").slice(0, 300));
      child.kill();
      return;
    }
    let receipt = null;
    try {
      receipt = JSON.parse(text);
    } catch {
      /* not JSON */
    }

    // Any text at all used to be a receipt. That is how this line printed
    // "MCP seal returns a receipt: 119 bytes" on 19 Nov for the payload
    // {"success": false, "error": "API call failed: 500 …"} — the guard read the
    // notary's refusal as our own receipt, and then the regex below read the
    // refusal that followed as acceptance. A receipt is a decision hash.
    const hash = String(
      receipt?.receipt?.decision_hash ?? receipt?.decision_hash ?? receipt?.hash ?? "",
    ).replace(/^sha256:/, "");
    if (sealed.result?.isError === true || receipt?.success !== true || !/^[0-9a-f]{64}$/.test(hash)) {
      fail("MCP seal issues a receipt carrying a decision hash",
        `isError=${String(sealed.result?.isError)} success=${String(receipt?.success)} `
        + `hash=${hash || "absent"} :: the door answered ${text.replace(/\s+/g, " ").slice(0, 240)}`);
      child.kill();
      return;
    }
    pass("MCP seal issues a receipt carrying a decision hash", `sha256:${hash.slice(0, 16)}…`);

    const verified = await rpc("tools/call", { name: "verify", arguments: { receipt } });
    const vtext = verified.result?.content?.[0]?.text || "";
    let verdict = null;
    try { verdict = JSON.parse(vtext); } catch { /* asserted below */ }
    // "valid", "true" and "ok" all appear inside refusals; the verdict is read
    // from the fields the ledger sets, never from the prose around them.
    const accepted =
      verified.result?.isError !== true &&
      (verdict?.verification?.verified === true || verdict?.verified === true) &&
      String(verdict?.hash ?? verdict?.verification?.queried_hash ?? hash).replace(/^sha256:/, "") === hash;
    if (!accepted) {
      fail("MCP verify accepts the receipt it just issued",
        `isError=${String(verified.result?.isError)} :: ${vtext.replace(/\s+/g, " ").slice(0, 260)}`);
    } else {
      pass("MCP verify accepts the receipt it just issued", `sha256:${hash.slice(0, 16)}… verified`);
    }
    // Informational, never a gate: whether the door's own receipt is a
    // canonical PSI-SEAL/1 envelope. Today it is not. When the emitter is
    // fixed this line flips and the gate below can be tightened.
    if (receipt && receipt.schema === "PSI-SEAL/1.0.0") {
      console.log(`INFO MCP receipt is a canonical PSI-SEAL/1 envelope (schema=${receipt.schema})`);
    } else {
      console.log(
        `INFO MCP receipt is NOT a canonical PSI-SEAL/1 envelope (schema=${receipt?.schema ?? "absent"}); ` +
          `the canonical verifier will refuse it. Emitter work, not a drop-in defect.`,
      );
    }
  } finally {
    child.kill();
  }
}

// ------------------------------------------------------------------- run
try {
  await resolvePins();
  if (laneArg === "all" || laneArg === "npm") await laneNpm();
  if (laneArg === "all" || laneArg === "pypi") await lanePypi();
  if (laneArg === "all" || laneArg === "mcp") await laneMcp();
} catch (e) {
  fail("drop-in check crashed", e?.stack || String(e));
} finally {
  if (!keep) rmSync(work, { recursive: true, force: true });
  else console.log(`\nwork dir kept: ${work}`);
}

console.log(`\n${failures === 0 ? "DROP-IN OK" : "DROP-IN FAILED"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
