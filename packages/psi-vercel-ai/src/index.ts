/**
 * @apex/psi-vercel-ai — produce a Compliance-Receipt header from any
 * generateText / streamText result and attach it to an outgoing Response.
 */

export interface PSIReceiptInput {
  prompt?: unknown;
  text: string;
  predicates: string[];
  notaryUrl?: string;
  apiKey?: string;
}

const DEFAULT_NOTARY = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

export async function buildPSIReceiptHeader(input: PSIReceiptInput): Promise<string | null> {
  try {
    const res = await fetch(input.notaryUrl ?? DEFAULT_NOTARY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
      },
      body: JSON.stringify({
        decision: input.text.slice(0, 8000),
        model_id: "vercel-ai",
        context: { prompt: input.prompt },
        predicate: input.predicates[0],
      }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    if (!r?.receipt_id || !r?.verify_url) return null;
    const status = r.status_check === "violation" ? "violation" : "compliant";
    return (
      `v=1; rid=${r.receipt_id}; pred=${input.predicates.join(",")}; status=${status};` +
      ` sig=ed25519:${r.ed25519_signature ?? ""}; verify=${r.verify_url}`
    );
  } catch {
    return null;
  }
}

/** Attach Compliance-Receipt to an existing Response (creates a copy). */
export function attachPSIReceipt(response: Response, header: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Compliance-Receipt", header);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
