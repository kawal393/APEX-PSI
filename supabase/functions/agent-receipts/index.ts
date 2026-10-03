// agent-receipts — runs one small AI agent task for a signed-in member and
// fingerprints every step (task, each tool call, each tool result, final
// answer) into a SHA-256 hash chain. The chain head is then sealed through the
// normal notarize service, so it counts against the same public allowance and
// is attributed to the member. The receipt proves what the agent did and in
// what order — never that its answer is correct.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "npm:ai";
import { z } from "npm:zod@3";
import canonicalize from "npm:canonicalize@2";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const RUN_ID = "X-Lovable-AIG-Run-ID";

const sha = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const Body = z.object({ task: z.string().trim().min(3).max(2000) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = req.headers.get("authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await db.auth.getUser(auth.replace("Bearer ", ""));
  if (!user) return json({ error: "Sign in to run the agent." }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Task must be 3–2000 characters." }, 400);
  const task = parsed.data.task;

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "AI is not configured." }, 500);

  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY, apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      if (runId) h.set(RUN_ID, runId);
      const r = await fetch(input, { ...init, headers: h });
      runId ??= r.headers.get(RUN_ID) ?? undefined;
      return r;
    },
  });

  const tools = {
    sha256: tool({
      description: "Compute the SHA-256 hex digest of a UTF-8 text.",
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => ({ sha256: await sha(text) }),
    }),
    lookup_receipt: tool({
      description: "Look up a public APEX receipt by its id (APEX-NTR-...) and return its public fingerprints.",
      inputSchema: z.object({ receipt_id: z.string() }),
      execute: async ({ receipt_id }) => {
        const { data } = await db.from("gallows_ledger")
          .select("commit_id,merkle_leaf_hash,merkle_root,predicate_id,created_at")
          .eq("commit_id", receipt_id.trim()).maybeSingle();
        return data ?? { found: false };
      },
    }),
  };

  let text: string;
  let steps: Awaited<ReturnType<typeof streamText>>["steps"] extends Promise<infer S> ? S : never;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: "You are a careful assistant. Use tools when they help. Answer in under 200 words. Never claim legal certainty.",
      prompt: task,
      tools,
      stopWhen: stepCountIs(50),
      abortSignal: req.signal,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    text = await result.text;
    steps = await result.steps;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 500;
    console.error("[agent-receipts]", e);
    const msg = status === 402 ? "AI credits are used up for now." : status === 429 ? "Too many requests — try again in a minute." : "The agent could not finish.";
    return json({ error: msg }, status === 402 || status === 429 || status === 403 ? status : 502);
  }

  // Build the hash chain: each link = sha256(prev | sha256(JCS(event))).
  const events: { kind: string; detail: unknown }[] = [{ kind: "task", detail: { task } }];
  for (const s of steps) {
    for (const c of s.toolCalls ?? []) events.push({ kind: "tool_call", detail: { tool: c.toolName, input: c.input } });
    for (const r of s.toolResults ?? []) events.push({ kind: "tool_result", detail: { tool: r.toolName, output: r.output } });
  }
  events.push({ kind: "answer", detail: { text } });

  let prev = "0".repeat(64);
  const chain = [];
  for (let i = 0; i < events.length; i++) {
    const event_hash = await sha(canonicalize(events[i])!);
    const link = await sha(`${prev}|${event_hash}`);
    chain.push({ index: i, ...events[i], event_hash, link });
    prev = link;
  }

  const n = await fetch(`${url}/functions/v1/notarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
    body: JSON.stringify({ decision: `AGENT-RUN chain_head=sha256:${prev} steps=${chain.length}`, model_id: MODEL, predicate: "AGENT_ACTION_CHAIN" }),
  });
  const receipt = await n.json().catch(() => null);

  return json({ answer: text, chain, chain_head: prev, receipt: n.ok ? receipt : null, seal_error: n.ok ? null : receipt?.error ?? "Sealing failed" });
});
