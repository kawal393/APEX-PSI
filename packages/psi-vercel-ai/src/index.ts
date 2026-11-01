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

// Only a SHA-256 fingerprint leaves your process; raw text and prompts are never sent.
async function fingerprint(value: unknown): Promise<string> {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "sha256:" + Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
        decision: await fingerprint(input.text),
        model_id: "vercel-ai",
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
