/**
 * @apex/psi-openai
 *
 * Wraps an OpenAI client so every chat.completions.create call produces a
 * Compliance-Receipt (draft-singh-psi-http-01) by notarizing the request +
 * response with the APEX PSI Notary.
 */

export interface WithPSIOptions {
  /** Predicates to evaluate the response against (e.g. "eu-ai-act/art-6"). */
  predicates: string[];
  /** Notary endpoint. Defaults to ai-governance-standard.com. */
  notaryUrl?: string;
  /** Optional API key for higher rate limits. */
  apiKey?: string;
  /** "blocking" throws on violation, "optimistic" only attaches the receipt. */
  mode?: "blocking" | "optimistic";
  /** Called once per request with the parsed receipt header value. */
  onReceipt?: (header: string) => void;
}

const DEFAULT_NOTARY = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

async function notarize(input: unknown, output: unknown, opts: WithPSIOptions): Promise<string | null> {
  try {
    const res = await fetch(opts.notaryUrl ?? DEFAULT_NOTARY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        decision: typeof output === "string" ? output : JSON.stringify(output).slice(0, 8000),
        model_id: "openai",
        context: { input },
        predicate: opts.predicates[0],
      }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    if (!r?.receipt_id || !r?.verify_url) return null;
    const status = r.status_check === "violation" ? "violation" : "compliant";
    if (status === "violation" && opts.mode === "blocking") {
      throw new Error(`PSI predicate violated: ${opts.predicates.join(",")}`);
    }
    const header =
      `v=1; rid=${r.receipt_id}; pred=${opts.predicates.join(",")}; status=${status};` +
      ` sig=ed25519:${r.ed25519_signature ?? ""}; verify=${r.verify_url}`;
    opts.onReceipt?.(header);
    return header;
  } catch (e) {
    if (opts.mode === "blocking") throw e;
    return null;
  }
}

/**
 * Wrap an OpenAI client. The returned client behaves identically; every
 * `chat.completions.create` response gets a `compliance_receipt` field.
 */
export function withPSI<TClient extends { chat: { completions: { create: (...args: any[]) => any } } }>(
  client: TClient,
  options: WithPSIOptions,
): TClient {
  const orig = client.chat.completions.create.bind(client.chat.completions);
  (client.chat.completions as any).create = async (...args: any[]) => {
    const result = await orig(...args);
    const text = result?.choices?.[0]?.message?.content ?? "";
    const header = await notarize(args[0], text, options);
    if (header) (result as any).compliance_receipt = header;
    return result;
  };
  return client;
}
