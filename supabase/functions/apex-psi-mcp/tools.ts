// The tool table the hosted door advertises and runs.
//
// These five tools are the ones in the npm package `apex-psi-mcp` (src/index.ts,
// 1.2.2). They are copied here deliberately rather than imported: a browser-side
// MCP client and a `npx` process must be handed the same contract, and the only
// way to be sure is to state it once per surface and fail the build when the two
// stop agreeing (scripts/hosted-mcp-check.mjs).
//
// The schemas are JSON Schema, not zod, because tools/list answers with JSON
// Schema and this function must not pull an npm dependency to say what it does.
//
// Policy lives in the notary, not here. Free allowance, the daily cap and the
// machine-payment door are the notary's own answers (20/min, 100/day, then 402
// when armed and 429 when not), and this table passes them through untouched. A
// transport that invented its own quota would be a second place to lie.

export type ToolIo = {
  apiBase: string;
  siteBase: string;
  version: string;
  fetch: typeof fetch;
};

export type ToolCall = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type Tool = {
  name: string;
  title: string;
  description: string;
  annotations: Record<string, boolean>;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>, io: ToolIo) => Promise<ToolCall>;
};

const ok = (result: unknown): ToolCall => ({
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
});

const fail = (message: string, extra: Record<string, unknown> = {}): ToolCall => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({ success: false, error: message, ...extra }, null, 2),
    },
  ],
  isError: true,
});

export function stripHashPrefix(value: unknown): string {
  return typeof value === "string" ? value.replace(/^sha256:/i, "") : "";
}

// Accept either a bare receipt or the whole envelope `seal` returns. Readers that
// assumed a flat receipt reported "chain broken" with an empty hash for a seal
// piped straight back in — the same defect the stdio server fixed on 16 Nov.
export function asReceipt(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  const nested = obj.receipt;
  if (obj.decision_hash === undefined && nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return obj;
}

export function receiptHash(value: unknown): string {
  const r = asReceipt(value);
  const raw = r.decision_hash ?? r.merkle_leaf ?? r.merkle_root ?? r.verify_hash ?? r.hash;
  const hash = stripHashPrefix(raw);
  if (!hash) {
    throw new Error(
      "This receipt carries no hash (looked for decision_hash, merkle_leaf, merkle_root) — pass the object exactly as the seal tool returned it",
    );
  }
  return hash;
}

const verifyPageUrl = (io: ToolIo, hash: string) => `${io.siteBase}/verify?hash=${encodeURIComponent(hash)}`;

// One call to the ledger, with the notary's own refusal carried through: an
// allowance or a payment question is an answer, not a transport failure.
async function callLedger(
  io: ToolIo,
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  let response: Response;
  try {
    response = await io.fetch(`${io.apiBase}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    return { ok: false, status: 0, detail: `the ledger could not be reached: ${String(cause)}` };
  }
  const text = await response.text();
  if (!response.ok) {
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { /* not JSON */ }
    return {
      ok: false,
      status: response.status,
      detail: parsed ? JSON.stringify(parsed) : text.slice(0, 300),
    };
  }
  try {
    return { ok: true, json: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { ok: false, status: response.status, detail: "the ledger answered with a body that is not JSON" };
  }
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.length ? value : undefined;

export const TOOLS: Tool[] = [
  {
    name: "seal",
    title: "Seal content",
    description:
      "Record content in the APEX PSI append-only ledger and return a receipt: SHA-256 hash, an Ed25519 signature over the Merkle leaf, and post-quantum ML-DSA-65 (plus LMS-W4-SHA256 when a slot is available — the receipt's own algorithm field states which). Proves that this content existed and has not changed since the timestamp. It never proves the contents are true. Free tier: 20 operations/minute, 100/day, no account needed. Side effect: it appends one record to the public ledger; nothing is edited or deleted. Output: a receipt in JSON, with the hash, the signature algorithms that receipt carries, and a URL anyone can check. A failure returns a tool error whose text is JSON: { success: false, error }.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", maxLength: 10000, description: "The content to seal (text, up to 10000 characters)" },
        context: { type: "string", description: "Optional context label (e.g. document name, case ID)" },
        predicate: { type: "string", description: "Optional predicate describing why this is sealed" },
        model_id: { type: "string", description: "Optional model/agent identifier producing the seal" },
      },
      required: ["content"],
    },
    async execute(args, io) {
      const content = str(args.content);
      if (!content) return fail("Provide 'content' — the text to seal.");
      const called = await callLedger(io, "/notarize", "POST", {
        decision: content,
        model_id: str(args.model_id) || `apex-psi-mcp/${io.version}`,
        context: str(args.context) || "mcp-seal",
        predicate: str(args.predicate) || "sealed-via-mcp",
      });
      if (!called.ok) {
        const extra: Record<string, unknown> = { http_status: called.status };
        if (called.status === 402) extra.payment_required = called.detail;
        if (called.status === 429) extra.allowance = called.detail;
        return fail(`the ledger refused the seal (${called.status || "unreachable"}): ${called.detail}`, extra);
      }
      const receipt = called.json;
      const decisionHash = stripHashPrefix(receipt.decision_hash);
      return ok({
        success: true,
        receipt,
        receipt_id: receipt.receipt_id,
        verify_hash: decisionHash,
        verify_url: verifyPageUrl(io, decisionHash),
        verify_api_url: `${io.apiBase}/verify-hash?hash=${decisionHash}`,
        message: "Content sealed in the APEX PSI append-only ledger",
      });
    },
  },
  {
    name: "verify",
    title: "Verify a receipt",
    description:
      "Confirm a seal's integrity against the APEX PSI append-only ledger. Accepts a receipt object (from the seal tool) or a raw SHA-256 hash. Reports whether the hash is present and anchored — integrity, not the truth of the original content. Read-only: nothing is written and no record changes. Output: a JSON report stating whether the hash was found and whether it is anchored. A failure returns a tool error whose text is JSON: { success: false, error }.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        hash: { type: "string", description: "A SHA-256 hash to look up in the ledger (with or without 'sha256:' prefix)" },
        receipt: { type: "object", additionalProperties: true, description: "A receipt object as returned by the seal tool" },
      },
    },
    async execute(args, io) {
      let lookup = stripHashPrefix(args.hash);
      if (!lookup && args.receipt !== undefined) {
        try { lookup = receiptHash(args.receipt); } catch (error) { return fail(String((error as Error).message)); }
      }
      if (!lookup) return fail("Provide either a hash or a receipt object");
      const called = await callLedger(io, `/verify-hash?hash=${encodeURIComponent(lookup)}`);
      if (!called.ok) return fail(`the ledger could not be read (${called.status || "unreachable"}): ${called.detail}`, { http_status: called.status });
      const result = called.json;
      return ok({
        success: true,
        hash: lookup,
        verification: result,
        verify_url: verifyPageUrl(io, lookup),
        message: result.verified
          ? "Seal verified — hash is present in the APEX PSI append-only ledger"
          : "Hash not found in the ledger",
      });
    },
  },
  {
    name: "anchor",
    title: "Bitcoin anchoring history",
    description:
      "Read the Bitcoin (OpenTimestamps) anchoring record for the ledger's Merkle roots. Defaults to action:'history', which is read-only and returns each anchor transaction with its txid, block height, confirmation state and how many ledger entries it covers. Pass action:'verify' with a txid to check one transaction, or action:'anchor' to explicitly request that pending roots be aggregated and submitted to the OTS calendars. Defaults to 'history' so a routine call never triggers a batch write. An anchor counts as confirmed only when a real Bitcoin block contains it. Read-only for action 'history' and 'verify'; only action 'anchor' writes, by submitting pending roots to the OTS calendars. Output: a JSON list of anchor transactions with txid, block height and confirmation state. A failure returns a tool error whose text is JSON: { success: false, error }.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["history", "verify", "anchor"],
          description: "'history' reads the anchored transactions (default); 'verify' checks one txid; 'anchor' explicitly requests anchoring of pending roots",
        },
        txid: { type: "string", description: "Bitcoin transaction id — required only when action is 'verify'" },
      },
    },
    async execute(args, io) {
      const action = str(args.action) || "history";
      const txid = str(args.txid);
      if (action === "verify" && !txid) return fail("action 'verify' needs a txid to check");
      const called = await callLedger(io, "/blockchain-anchor", "POST", { action, ...(txid ? { txid } : {}) });
      if (!called.ok) return fail(`the anchor service could not be read (${called.status || "unreachable"}): ${called.detail}`, { http_status: called.status });
      return ok({
        success: true,
        anchorResult: called.json,
        action,
        message:
          action === "anchor"
            ? "Bitcoin anchoring requested for pending roots (OpenTimestamps); confirmation follows only on a real block"
            : action === "verify"
              ? `Bitcoin transaction ${String(txid).slice(0, 16)}… checked against the anchor record`
              : "Read the anchored Bitcoin transactions (OpenTimestamps)",
      });
    },
  },
  {
    name: "cite",
    title: "Generate citation",
    description:
      "Generate a citation for a sealed receipt in APA, BibTeX, or MLA format, citing the APEX PSI ledger entry. Read-only and entirely local: it formats a citation from the receipt you pass in and makes no network call. Output: the citation string in the format you asked for.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        receipt: { type: "object", additionalProperties: true, description: "A receipt object as returned by the seal tool" },
        format: { type: "string", enum: ["apa", "bibtex", "mla"], description: "Citation format (default: apa)" },
      },
      required: ["receipt"],
    },
    async execute(args, io) {
      const fmt = str(args.format) || "apa";
      const r = asReceipt(args.receipt);
      const receiptId = String(r.receipt_id || "APEX-PSI-RECEIPT");
      const timestamp = String(r.timestamp || new Date().toISOString());
      let hash: string;
      try {
        hash = receiptHash(args.receipt);
      } catch (error) {
        // A citation with no hash behind it would name a receipt that does not
        // exist and point at a page that verifies nothing. The npm server refuses
        // here; a softer door would be a second place to overstate.
        return fail(String((error as Error).message));
      }
      const verifyUrl = verifyPageUrl(io, hash);
      // Only name the algorithms the receipt itself names; the ledger attaches
      // LMS-W4-SHA256 only when a slot is available.
      const stated = typeof r.algorithm === "string" ? r.algorithm.trim() : "";
      const algorithm = stated || "algorithms not stated in this receipt";
      const year = timestamp.slice(0, 4);
      const date = timestamp.slice(0, 10);

      let citation: string;
      if (fmt === "bibtex") {
        citation = [
          `@misc{${receiptId.toLowerCase()},`,
          "  author       = {APEX PSI Notary},",
          `  title        = {Cryptographic Seal ${receiptId}},`,
          `  year         = {${year}},`,
          `  howpublished = {APEX PSI Append-Only Ledger (${algorithm})},`,
          `  note         = {Receipt ${receiptId}, sealed ${date}},`,
          `  url          = {${verifyUrl}}`,
          "}",
        ].join("\n");
      } else if (fmt === "mla") {
        citation = `"Cryptographic Seal ${receiptId}." APEX PSI Append-Only Ledger, ${date}, ${verifyUrl}. ${algorithm}.`;
      } else {
        citation = `APEX PSI Notary. (${year}). Cryptographic seal ${receiptId} [APEX PSI append-only ledger entry; ${algorithm}]. Retrieved from ${verifyUrl}`;
      }
      return ok({ success: true, citation, format: fmt, receipt_id: receiptId, message: `Citation generated in ${fmt} format` });
    },
  },
  {
    name: "verify_chain",
    title: "Verify a receipt chain",
    description:
      "Independently verify a chain of receipts against the APEX PSI ledger. Recomputes each hash's presence and integrity and reports Merkle chain continuity. Returns a verification report — a recomputation result, not an opinion or a certification. Read-only: it only looks receipts up and recomputes the chain; nothing is written. Output: a JSON report per receipt (found, verified) and an overall chain-intact verdict. A failure returns a tool error whose text is JSON: { success: false, error }.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        receipts: {
          type: "array",
          items: { type: "object", additionalProperties: true },
          minItems: 1,
          description: "Array of receipt objects to verify (in order)",
        },
      },
      required: ["receipts"],
    },
    async execute(args, io) {
      const receipts = Array.isArray(args.receipts) ? args.receipts : [];
      if (!receipts.length) return fail("Provide 'receipts' — an array of at least one receipt object");
      const results: Array<Record<string, unknown>> = [];
      let chainIntact = true;

      for (let i = 0; i < receipts.length; i++) {
        const r = asReceipt(receipts[i]);
        let hash = "";
        try {
          hash = receiptHash(r);
        } catch {
          results.push({ index: i, receipt_id: String(r.receipt_id || "?"), verified: false, found: false, hash: "" });
          chainIntact = false;
          continue;
        }
        const called = await callLedger(io, `/verify-hash?hash=${encodeURIComponent(hash)}`);
        const verified = called.ok && called.json.verified === true;
        const found = called.ok && called.json.found === true;
        // An unreadable ledger and a receipt that is not in it both break the
        // chain: the verdict a caller acts on is "every link is present and
        // verified", so a report of failed links with chainIntact true is a lie.
        if (!verified) chainIntact = false;
        results.push({ index: i, receipt_id: String(r.receipt_id || "?"), verified, found, hash });
      }

      const verifiedCount = results.filter((f) => f.verified).length;
      return ok({
        success: true,
        verification_report: {
          total: receipts.length,
          verified: verifiedCount,
          failed: receipts.length - verifiedCount,
          chainIntact,
          results,
          verified_at: new Date().toISOString(),
        },
        message: `Chain verification complete: ${verifiedCount}/${receipts.length} receipts verified${chainIntact ? ", chain intact" : ", chain broken"}`,
      });
    },
  },
];
