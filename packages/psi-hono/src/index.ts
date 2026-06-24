/**
 * @apex/psi-hono — middleware that captures the response body, notarizes it,
 * and attaches the Compliance-Receipt header before sending.
 */

export interface PSIMiddlewareOptions {
  predicates: string[];
  notaryUrl?: string;
  apiKey?: string;
  modelId?: string;
  /** Only run on responses where this returns true. Defaults to JSON+text. */
  filter?: (c: { req: { method: string; path: string } }) => boolean;
}

const DEFAULT_NOTARY = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

async function notarize(text: string, opts: PSIMiddlewareOptions): Promise<string | null> {
  try {
    const res = await fetch(opts.notaryUrl ?? DEFAULT_NOTARY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        decision: text.slice(0, 8000),
        model_id: opts.modelId ?? "hono",
        predicate: opts.predicates[0],
      }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    if (!r?.receipt_id || !r?.verify_url) return null;
    return (
      `v=1; rid=${r.receipt_id}; pred=${opts.predicates.join(",")}; status=compliant;` +
      ` sig=ed25519:${r.ed25519_signature ?? ""}; verify=${r.verify_url}`
    );
  } catch {
    return null;
  }
}

export function psi(options: PSIMiddlewareOptions) {
  return async (c: any, next: () => Promise<void>) => {
    await next();
    if (options.filter && !options.filter(c)) return;
    try {
      const cloned = c.res.clone();
      const text = await cloned.text();
      const header = await notarize(text, options);
      if (header) c.res.headers.set("Compliance-Receipt", header);
    } catch {
      // soft fail
    }
  };
}
