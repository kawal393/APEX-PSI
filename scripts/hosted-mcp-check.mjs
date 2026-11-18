// hosted-mcp-check — the binaries the key-free hosted door must print.
//
// It loads the SAME modules the deployed function loads
// (supabase/functions/apex-psi-mcp/handler.ts and tools.ts) and drives them with
// real Request objects under plain Node, so a green run means the shipped code
// answers the way this file says it answers. Only Web APIs are used, which is why
// no Deno and no compiler is needed.
//
// Nothing here touches the network. The ledger is a stub that records every call
// it receives, so the run also proves what the door does NOT send: no
// Authorization header, ever, from a caller who presented none.
//
// What a green run does NOT prove, printed at the end on its own lines:
//   - that the function is deployed. The flagship's production environment
//     requires a named reviewer, so only Master can turn this green into live.
//   - that a real MCP client (VS Code, Cursor, Codex, Claude) completes the
//     handshake against the live URL. That needs the deployment.
//   - the notary's own answers for allowance and payment. They are stubbed here.
//   - that the wording of each tool description still matches the npm package:
//     this run compares the tool NAMES against the sibling repository when it is
//     present on disk, and says so either way.
//
// Usage: node --experimental-strip-types scripts/hosted-mcp-check.mjs
// Exit 0 = every check PASS. Exit 1 = any FAIL. Exit 2 = could not load the door.

import { readFile } from "node:fs/promises";

let handleApexMcp, TOOLS;
try {
  ({ handleApexMcp } = await import("../supabase/functions/apex-psi-mcp/handler.ts"));
  ({ TOOLS } = await import("../supabase/functions/apex-psi-mcp/tools.ts"));
} catch (error) {
  console.error("could not load the hosted door:", error);
  process.exit(2);
}

const results = [];
function record(name, pass, measured = []) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  for (const line of measured) console.log(`        ${line}`);
}

const CONFIG_BASE = {
  apiBase: "https://stub.invalid/functions/v1",
  siteBase: "https://stub.invalid",
  version: "1.2.2",
};

// A ledger that answers like the notary and keeps every request it saw.
function stubLedger(responses = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url: String(url), method: init.method || "GET", body, headers: init.headers || {} });
    const path = new URL(String(url)).pathname;
    // Keys are matched by suffix, because the door calls the notary under
    // /functions/v1/... and a test that silently falls through to the default
    // answer is how a scripted refusal stops being a test.
    const scripted = Object.entries(responses).find(([key]) => path.endsWith(key))?.[1];
    if (scripted) {
      const { status = 200, json, text, headers = {} } = scripted;
      return new Response(text ?? (json === undefined ? "" : JSON.stringify(json)), {
        status,
        headers: { "content-type": "application/json", ...headers },
      });
    }
    if (new URL(String(url)).pathname.endsWith("/notarize")) {
      return new Response(JSON.stringify({
        success: true,
        receipt_id: "APEX-NTR-STUB0000000001",
        decision_hash: "sha256:" + "ab".repeat(32),
        merkle_root: "sha256:" + "cd".repeat(32),
        algorithm: "Ed25519+ML-DSA-65",
        timestamp: "2026-11-18T00:00:00.000Z",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (new URL(String(url)).pathname.endsWith("/verify-hash")) {
      const hash = new URL(String(url)).searchParams.get("hash");
      const known = hash === "ab".repeat(32);
      return new Response(JSON.stringify({
        verified: known,
        found: known,
        message: known ? "Seal verified" : "Hash not found in the APEX PSI immutable ledger",
        queried_hash: hash,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (new URL(String(url)).pathname.endsWith("/blockchain-anchor")) {
      return new Response(JSON.stringify({ action: body?.action, anchors: [] }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "stub has no answer for this path" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

const post = (body, headers = {}) =>
  new Request("https://hosted.invalid/functions/v1/apex-psi-mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const get = (path = "/") =>
  new Request(`https://hosted.invalid/functions/v1/apex-psi-mcp${path}`, { method: "GET" });

async function rpc(config, method, params = {}, id = 1) {
  const res = await handleApexMcp(post({ jsonrpc: "2.0", id, method, params }), config);
  let json = null;
  try { json = await res.clone().json(); } catch { /* empty body */ }
  return { res, json };
}

async function callTool(config, name, args, id = 7) {
  const { res, json } = await rpc(config, "tools/call", { name, arguments: args }, id);
  const text = json?.result?.content?.[0]?.text;
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* tool errors are JSON by contract, but assert anyway */ }
  return { res, json, payload: parsed, text, isError: json?.result?.isError === true };
}

// ---------------------------------------------------------------- transport

{
  const cfg = { ...CONFIG_BASE, fetch: stubLedger().fetch };

  const opt = await handleApexMcp(
    new Request("https://hosted.invalid/functions/v1/apex-psi-mcp", { method: "OPTIONS" }),
    cfg,
  );
  record("OPTIONS preflight answers 204 with CORS",
    opt.status === 204 && opt.headers.get("access-control-allow-origin") === "*"
      && (opt.headers.get("access-control-allow-headers") || "").includes("mcp-session-id"),
    [`status=${opt.status} ACAO=${opt.headers.get("access-control-allow-origin")}`]);

  const getRes = await handleApexMcp(get(), cfg);
  const getJson = await getRes.clone().json().catch(() => ({}));
  record("GET is refused as a stateless server, with Allow",
    getRes.status === 405 && getRes.headers.get("allow") === "POST, OPTIONS" && getJson.error?.code === -32601,
    [`status=${getRes.status} Allow=${getRes.headers.get("allow")} code=${getJson.error?.code}`]);

  const badJson = await handleApexMcp(post("{not json"), cfg);
  const badJsonBody = await badJson.clone().json().catch(() => ({}));
  record("a body that is not JSON answers the parse error",
    badJson.status === 400 && badJsonBody.error?.code === -32700,
    [`status=${badJson.status} code=${badJsonBody.error?.code}`]);

  const notJson = await handleApexMcp(
    new Request("https://hosted.invalid/functions/v1/apex-psi-mcp", {
      method: "POST", headers: { "content-type": "text/plain" }, body: "hello",
    }),
    cfg,
  );
  record("a non-JSON Content-Type is refused, not guessed", notJson.status === 415, [`status=${notJson.status}`]);

  const batch = await handleApexMcp(post([{ jsonrpc: "2.0", id: 1, method: "ping" }]), cfg);
  record("batched requests are refused with a reason", batch.status === 400, [`status=${batch.status}`]);

  const notif = await handleApexMcp(post({ jsonrpc: "2.0", method: "notifications/initialized" }), cfg);
  const notifBody = await notif.text();
  record("a notification is accepted with 202 and no body", notif.status === 202 && notifBody.length === 0,
    [`status=${notif.status} bytes=${notifBody.length}`]);

  const unknown = await rpc(cfg, "methods/we/do/not/have");
  record("an unknown method answers method-not-found", unknown.json?.error?.code === -32601,
    [`code=${unknown.json?.error?.code}`]);
}

// ---------------------------------------------------------------- handshake

{
  const cfg = { ...CONFIG_BASE, fetch: stubLedger().fetch };

  const init = await rpc(cfg, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "selftest", version: "0" },
  });
  const sid = init.res.headers.get("mcp-session-id");
  record("initialize is answered without a session and without a credential",
    init.json?.result?.protocolVersion === "2025-06-18" && sid === null
      && init.json.result.serverInfo?.name === "apex-psi-mcp" && init.json.result.capabilities?.tools !== undefined,
    [`protocol=${init.json?.result?.protocolVersion} Mcp-Session-Id=${String(sid)} name=${init.json?.result?.serverInfo?.name}`]);

  const odd = await rpc(cfg, "initialize", { protocolVersion: "1999-01-01" });
  record("an unknown protocol version is met with ours, not with silence",
    odd.json?.result?.protocolVersion === "2025-06-18", [`answered ${odd.json?.result?.protocolVersion}`]);

  const old = await rpc(cfg, "initialize", { protocolVersion: "2024-11-05" });
  record("a client on 2024-11-05 is served 2024-11-05",
    old.json?.result?.protocolVersion === "2024-11-05", [`answered ${old.json?.result?.protocolVersion}`]);

  const ping = await rpc(cfg, "ping");
  record("ping answers an empty result", ping.json?.result && Object.keys(ping.json.result).length === 0);

  const list = await rpc(cfg, "tools/list");
  const tools = list.json?.result?.tools || [];
  const names = tools.map((t) => t.name);
  record("tools/list advertises the five tools of the shipped server",
    JSON.stringify(names) === JSON.stringify(["seal", "verify", "anchor", "cite", "verify_chain"]),
    [`advertised: ${names.join(", ")}`]);

  const malformed = tools.filter(
    (t) => t.inputSchema?.type !== "object" || typeof t.description !== "string" || t.description.length < 40
      || typeof t.title !== "string" || !t.annotations,
  );
  record("every advertised tool carries a JSON Schema object, a title, a description and annotations",
    malformed.length === 0, malformed.map((t) => `malformed: ${t.name}`));
}

// ---------------------------------------------------------------- seal

{
  const ledger = stubLedger();
  const cfg = { ...CONFIG_BASE, fetch: ledger.fetch };
  const sealed = await callTool(cfg, "seal", { content: "the decision I took" });
  const sent = ledger.calls[0] || {};
  record("seal reaches the notary with the stdio server's own defaults",
    sealed.payload?.success === true
      && /\/notarize$/.test(String(sent.url)) && sent.method === "POST"
      && sent.body?.decision === "the decision I took"
      && sent.body?.context === "mcp-seal" && sent.body?.predicate === "sealed-via-mcp"
      && String(sent.body?.model_id).startsWith("apex-psi-mcp/"),
    [`sent ${JSON.stringify(sent.body)}`]);

  record("no caller credential is invented on the outbound call",
    ledger.calls.every((c) => c.headers.authorization === undefined),
    [`authorization seen on ${ledger.calls.filter((c) => c.headers.authorization).length} of ${ledger.calls.length} calls`]);

  const checkUrl = sealed.payload?.verify_url;
  record("the receipt hands back a page a person can open and an API a machine can call",
    checkUrl === "https://stub.invalid/verify?hash=" + "ab".repeat(32)
      && sealed.payload?.verify_api_url === `https://stub.invalid/functions/v1/verify-hash?hash=${"ab".repeat(32)}`,
    [`${checkUrl}`]);

  const empty = await callTool(cfg, "seal", {});
  record("seal without content is a tool error, not a crash",
    empty.isError && empty.payload?.success === false, [empty.text]);

  const capped = stubLedger({ "/notarize": { status: 429, json: { error: "Daily free limit reached", used: 100, limit: 100 } } });
  const cappedCall = await callTool({ ...CONFIG_BASE, fetch: capped.fetch }, "seal", { content: "one more" });
  record("the notary's 429 is passed through as the allowance answer",
    cappedCall.isError && cappedCall.payload?.http_status === 429
      && String(cappedCall.payload?.allowance).includes("Daily free limit reached"),
    [cappedCall.text]);

  const armed = stubLedger({
    "/notarize": {
      status: 402,
      json: { error: "Allowance reached — pay for this call instead", pay_with: { protocol: "x402", price_atomic_units: "10000" } },
    },
  });
  const armedCall = await callTool({ ...CONFIG_BASE, fetch: armed.fetch }, "seal", { content: "one more" });
  record("a priced refusal reaches the agent as a price, not as a mystery",
    armedCall.isError && armedCall.payload?.http_status === 402
      && JSON.parse(armedCall.payload.payment_required).pay_with.protocol === "x402",
    [armedCall.text]);
}

// ---------------------------------------------------------------- verify, chain, cite, anchor

{
  const cfg = { ...CONFIG_BASE, fetch: stubLedger().fetch };

  const prefixed = await callTool(cfg, "verify", { hash: "sha256:" + "ab".repeat(32) });
  record("verify strips the sha256: prefix before asking the ledger",
    prefixed.payload?.success === true && prefixed.payload?.hash === "ab".repeat(32)
      && prefixed.payload?.verification?.verified === true,
    [prefixed.text]);

  const envelope = await callTool(cfg, "verify", {
    receipt: { success: true, receipt: { decision_hash: "sha256:" + "ab".repeat(32) } },
  });
  record("a seal piped straight back into verify resolves through the envelope",
    envelope.payload?.hash === "ab".repeat(32), [`hash used: ${envelope.payload?.hash}`]);

  const bare = await callTool(cfg, "verify", { receipt: { decision_hash: "ab".repeat(32) } });
  record("a bare receipt works identically", bare.payload?.hash === "ab".repeat(32));

  const neither = await callTool(cfg, "verify", {});
  record("verify with neither hash nor receipt says what to provide",
    neither.isError && String(neither.payload?.error).includes("either a hash or a receipt"));

  const chain = await callTool(cfg, "verify_chain", {
    receipts: [
      { decision_hash: "sha256:" + "ab".repeat(32) },
      { decision_hash: "sha256:" + "ee".repeat(32) },
    ],
  });
  const report = chain.payload?.verification_report;
  record("verify_chain counts found and missing and calls the chain broken on a missing link",
    report?.total === 2 && report?.verified === 1 && report?.failed === 1 && report?.chainIntact === false,
    [`verified ${report?.verified}/${report?.total}, chainIntact=${report?.chainIntact}`]);

  const cited = await callTool(cfg, "cite", {
    receipt: {
      receipt_id: "APEX-NTR-TEST", decision_hash: "sha256:" + "ab".repeat(32),
      timestamp: "2026-11-18T10:00:00.000Z", algorithm: "Ed25519+ML-DSA-65",
    },
    format: "bibtex",
  });
  const citation = String(cited.payload?.citation);
  record("cite names only the algorithms the receipt itself names",
    citation.includes("Ed25519+ML-DSA-65") && citation.includes("@misc{apex-ntr-test")
      && citation.includes("https://stub.invalid/verify?hash=" + "ab".repeat(32)),
    [citation.split("\n").map((l) => l.trim()).join(" ")]);

  const silent = await callTool(cfg, "cite", {
    receipt: { receipt_id: "APEX-NTR-SILENT", decision_hash: "sha256:" + "ab".repeat(32), timestamp: "2026-11-18T10:00:00.000Z" },
    format: "apa",
  });
  record("a receipt that states no algorithm is cited as stating none",
    String(silent.payload?.citation).includes("algorithms not stated in this receipt"),
    [String(silent.payload?.citation)]);

  const hashless = await callTool(cfg, "cite", { receipt: { receipt_id: "APEX-NTR-NOHASH", timestamp: "2026-11-18T10:00:00.000Z" } });
  record("a receipt with no hash is refused, not cited with a placeholder id",
    hashless.isError === true
      && hashless.payload?.citation === undefined
      && /no hash/.test(String(hashless.payload?.error)),
    [JSON.stringify(hashless.json?.result).slice(0, 240)]);

  const anchorCfg = stubLedger();
  const anchored = await callTool({ ...CONFIG_BASE, fetch: anchorCfg.fetch }, "anchor", {});
  record("a routine anchor call asks for history, never for a batch write",
    anchored.payload?.action === "history" && anchorCfg.calls[0]?.body?.action === "history",
    [`sent action=${anchorCfg.calls[0]?.body?.action}`]);

  const needsTxid = await callTool(cfg, "anchor", { action: "verify" });
  record("anchor verify without a txid says what it needs",
    needsTxid.isError && String(needsTxid.payload?.error).includes("needs a txid"));

  const ghost = await rpc(cfg, "tools/call", { name: "no_such_tool", arguments: {} });
  record("an unknown tool is an invalid-params answer that lists the real ones",
    ghost.json?.error?.code === -32602 && Array.isArray(ghost.json?.error?.data?.tools),
    [`code=${ghost.json?.error?.code} tools=${(ghost.json?.error?.data?.tools || []).join(",")}`]);
}

// ---------------------------------------------------------------- npm contract parity

function npmBlocks(source) {
  const blocks = [];
  const marker = "server.registerTool(";
  let at = 0;
  while ((at = source.indexOf(marker, at)) !== -1) {
    const name = source.slice(at).match(/server\.registerTool\(\s*"([a-z_]+)"/)?.[1];
    if (!name) break;
    const schemaAt = source.indexOf("inputSchema", at);
    const open = schemaAt === -1 ? -1 : source.indexOf("{", schemaAt);
    blocks.push({ name, keys: open === -1 ? [] : topLevelKeys(balanced(source, open)) });
    at = at + marker.length;
  }
  return blocks;
}

// The text inside the braces that open at openAt, string-aware, brace-matched.
function balanced(text, openAt) {
  let depth = 0;
  let quote = null;
  for (let i = openAt; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(openAt + 1, i);
    }
  }
  return "";
}

// { key: expression, … } -> [{ key, required }] for the keys at this level only.
function topLevelKeys(block) {
  const keys = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  const flush = () => {
    const match = cur.match(/^\s*([A-Za-z_]\w*)\s*:/);
    if (match) keys.push({ key: match[1], required: !/\.optional\(\)/.test(cur) });
    cur = "";
  };
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (quote) {
      cur += ch;
      if (ch === "\\") { cur += block[++i] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; cur += ch; continue; }
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    if (ch === "}" || ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) { flush(); continue; }
    cur += ch;
  }
  flush();
  return keys;
}

{
  const sibling = "../../apex-psi-mcp-server/src/index.ts";
  let source = null;
  try {
    source = await readFile(new URL(sibling, import.meta.url), "utf8");
  } catch {
    source = null;
  }
  if (source) {
    const found = [...source.matchAll(/server\.registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
    const hosted = TOOLS.map((t) => t.name);
    record("the hosted door advertises exactly the tools the npm server registers",
      JSON.stringify(found) === JSON.stringify(hosted),
      [`npm registers: ${found.join(", ")} | hosted advertises: ${hosted.join(", ")}`]);

    // Names agreeing is not the contract. An agent that switches from `npx
    // apex-psi-mcp` to the hosted URL must be able to send the same arguments and
    // get the same refusals, so every argument name and every required/optional
    // marking is compared too. This is what caught the `cite` divergence on 18 Nov:
    // the npm server refused a receipt with no hash, the hosted door printed a
    // placeholder citation for a seal that does not exist.
    const npmShapes = new Map(npmBlocks(source).map((b) => [b.name, b.keys]));
    for (const tool of TOOLS) {
      const theirs = npmShapes.get(tool.name);
      if (!theirs) {
        record(`npm argument shape for ${tool.name} could be parsed`, false, ["no registerTool block found"]);
        continue;
      }
      const ours = Object.entries(tool.inputSchema.properties || {}).map(([key, schema]) => ({
        key,
        required: (tool.inputSchema.required || []).includes(key),
      }));
      const shape = (list) => list.map((p) => `${p.key}${p.required ? "!" : ""}`).sort().join(",");
      record(`${tool.name}: same arguments and same required marks as the npm server`,
        shape(theirs) === shape(ours),
        [`npm: ${shape(theirs)} | hosted: ${shape(ours)}`]);
    }
  } else {
    console.log("NOTE  the npm package's source is not present at ../apex-psi-mcp-server;");
    console.log("      tool names and arguments were asserted against the literals above, not the server.");
  }
}

// ---------------------------------------------------------------- verdict

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks pass.`);
console.log("A green run does NOT prove: the function is deployed (the production");
console.log("environment needs a named reviewer); a real MCP client completes the");
console.log("handshake against the live URL; the notary's own allowance and payment");
console.log("answers, which are stubbed here; or that every description still matches");
console.log("the npm package word for word.");
if (failed.length) {
  console.log("FAILED: " + failed.map((f) => f.name).join(" | "));
  process.exit(1);
}
