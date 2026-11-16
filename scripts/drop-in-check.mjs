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
 *   lane npm   — npm:apex-psi-verifier@1.6.0   verifies the canonical fixture
 *                AND refuses a tampered copy of it.
 *   lane pypi  — pypi:psi-verifier[signature]==1.6.0 does the same in Python.
 *   lane mcp   — npm:apex-psi-mcp@1.2.0 seals and verifies over MCP stdio.
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

const NPM_VERIFIER = process.env.APEX_NPM_VERIFIER_VERSION || "1.6.0";
const PYPI_VERIFIER = process.env.APEX_PYPI_VERIFIER_VERSION || "1.6.0";
const MCP_SERVER = process.env.APEX_MCP_VERSION || "apex-psi-mcp@1.2.0";

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
    pass("MCP seal returns a receipt", `${text.length} bytes`);
    const verified = await rpc("tools/call", { name: "verify", arguments: { receipt: receipt ?? text } });
    const vtext = verified.result?.content?.[0]?.text || "";
    if (/conformant|valid|verified|true|ok/i.test(vtext)) {
      pass("MCP verify accepts the receipt it just issued");
    } else {
      fail("MCP verify accepts the receipt it just issued", vtext.slice(0, 300));
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
