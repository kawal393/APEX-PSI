/**
 * @apex/psi-anthropic — wraps Anthropic messages.create with a PSI receipt.
 */

export interface WithPSIOptions {
  predicates: string[];
  notaryUrl?: string;
  apiKey?: string;
  mode?: "blocking" | "optimistic";
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
        model_id: "anthropic",
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

export function withPSI<T extends { messages: { create: (...args: any[]) => any } }>(
  client: T,
  options: WithPSIOptions,
): T {
  const orig = client.messages.create.bind(client.messages);
  (client.messages as any).create = async (...args: any[]) => {
    const result = await orig(...args);
    const text = Array.isArray(result?.content)
      ? result.content.map((b: any) => b?.text ?? "").join("\n")
      : "";
    const header = await notarize(args[0], text, options);
    if (header) (result as any).compliance_receipt = header;
    return result;
  };
  return client;
}
