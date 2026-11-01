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

// Only a SHA-256 fingerprint leaves your process; raw text and prompts are never sent.
async function fingerprint(value: unknown): Promise<string> {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "sha256:" + Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
        decision: await fingerprint(output),
        model_id: "anthropic",
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
