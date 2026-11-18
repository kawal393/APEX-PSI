// The transport half of the hosted door: one JSON-RPC message in, one answer out.
//
// Stateless on purpose. The Model Context Protocol's Streamable HTTP transport
// allows a server to hold no session at all: the server answers `initialize`
// without issuing an Mcp-Session-Id, refuses GET (no standalone SSE stream) and
// refuses DELETE (there is no session to end). That is what makes this door usable
// from a browser tab, a CLI, or a server-to-server call with identical code, and
// what makes it survive a restart with nothing to lose.
//
// It asks for no credential. The stdio server (`npx apex-psi-mcp`) already seals
// and verifies with no account, and this function hands out the same five tools to
// a caller that cannot present one — so the free allowance is enforced by the
// notary, which counts by key-and-IP, rather than by this transport inventing a
// second idea of who is allowed to do what.
//
// Nothing here reaches Deno. Only Web APIs (Request, Response, fetch), which is
// why scripts/hosted-mcp-check.mjs can drive the shipped code under plain Node.

import { TOOLS, type ToolIo } from "./tools.ts";

const PROTOCOL_LATEST = "2025-06-18";
const PROTOCOL_SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

export type HandlerConfig = ToolIo & { maxBodyBytes?: number };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id, x-apex-api-key, x-client-info, apikey",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version, retry-after, x-ratelimit-limit, x-ratelimit-remaining",
  "Access-Control-Max-Age": "86400",
};

const jsonHeaders = (extra: Record<string, string> = {}) => ({
  ...corsHeaders,
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  ...extra,
});

const rpcError = (id: unknown, code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0",
  id: typeof id === "number" || typeof id === "string" ? id : null,
  error: { code, message, ...(data === undefined ? {} : { data }) },
});

const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });

function describeTool(tool: (typeof TOOLS)[number]) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  };
}

export async function handleApexMcp(request: Request, config: HandlerConfig): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify(
        rpcError(
          null,
          METHOD_NOT_FOUND,
          `Method not allowed: this server is stateless and offers no standalone SSE stream (GET) and no session to end (DELETE). POST one JSON-RPC message.`,
        ),
      ),
      { status: 405, headers: jsonHeaders({ Allow: "POST, OPTIONS" }) },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return new Response(
      JSON.stringify(rpcError(null, INVALID_REQUEST, "Content-Type must be application/json")),
      { status: 415, headers: jsonHeaders() },
    );
  }

  const maxBytes = config.maxBodyBytes ?? 1_048_576;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return new Response(
      JSON.stringify(rpcError(null, INVALID_REQUEST, `request body exceeds ${maxBytes} bytes`)),
      { status: 413, headers: jsonHeaders() },
    );
  }

  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify(rpcError(null, PARSE_ERROR, "Parse error: the body is not JSON")),
      { status: 400, headers: jsonHeaders() },
    );
  }

  if (Array.isArray(message)) {
    return new Response(
      JSON.stringify(rpcError(null, INVALID_REQUEST, "batched requests are not supported; send one JSON-RPC message per request")),
      { status: 400, headers: jsonHeaders() },
    );
  }
  if (!message || typeof message !== "object") {
    return new Response(
      JSON.stringify(rpcError(null, INVALID_REQUEST, "expected a JSON-RPC 2.0 object")),
      { status: 400, headers: jsonHeaders() },
    );
  }

  const msg = message as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  const id = msg.id;
  const method = typeof msg.method === "string" ? msg.method : "";
  const params = (msg.params && typeof msg.params === "object" ? msg.params : {}) as Record<string, unknown>;
  const hasId = typeof id === "number" || typeof id === "string";

  // Notifications carry no id and expect no answer. 202 with an empty body is the
  // transport's way of saying received.
  if (!hasId && method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }
  if (!method) {
    return new Response(JSON.stringify(rpcError(id, INVALID_REQUEST, "missing method")), { status: 400, headers: jsonHeaders() });
  }

  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = PROTOCOL_SUPPORTED.includes(requested) ? requested : PROTOCOL_LATEST;
      return new Response(
        JSON.stringify(
          rpcResult(id, {
            protocolVersion,
            capabilities: { tools: {} },
            serverInfo: {
              name: "apex-psi-mcp",
              title: "APEX PSI — hosted, no account",
              version: config.version,
            },
            instructions:
              "Tools for APEX PSI, the open-standard evidence protocol for AI governance. `seal` records content in the append-only ledger and returns a receipt; `verify` and `verify_chain` re-check a receipt's integrity; `anchor` reads whether the ledger's Merkle roots are committed to a real Bitcoin block; `cite` formats a citation for a receipt. No account, no key, no install: the free allowance is 20 operations a minute and 100 a day, and past that the ledger answers with its own terms rather than an error page. A seal proves that content existed and has not changed since its timestamp. It never proves the content is true.",
          }),
        ),
        { status: 200, headers: jsonHeaders() },
      );
    }

    case "ping":
      return new Response(JSON.stringify(rpcResult(id, {})), { status: 200, headers: jsonHeaders() });

    case "tools/list":
      return new Response(
        JSON.stringify(rpcResult(id, { tools: TOOLS.map(describeTool) })),
        { status: 200, headers: jsonHeaders() },
      );

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) {
        return new Response(
          JSON.stringify(rpcError(id, INVALID_PARAMS, `unknown tool '${name}'`, { tools: TOOLS.map((t) => t.name) })),
          { status: 200, headers: jsonHeaders() },
        );
      }
      const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
      try {
        const call = await tool.execute(args, config);
        return new Response(JSON.stringify(rpcResult(id, call)), { status: 200, headers: jsonHeaders() });
      } catch (error) {
        // A tool that throws is a defect, not a refusal: say so with the protocol's
        // own code instead of dressing it up as an application answer.
        return new Response(
          JSON.stringify(rpcError(id, INTERNAL_ERROR, `tool '${name}' raised: ${String((error as Error)?.message || error)}`)),
          { status: 200, headers: jsonHeaders() },
        );
      }
    }

    default:
      return new Response(
        JSON.stringify(rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method}`)),
        { status: 200, headers: jsonHeaders() },
      );
  }
}
