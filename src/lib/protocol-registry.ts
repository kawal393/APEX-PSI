import { useEffect, useState } from "react";

export interface ProtocolStandard {
  id: string;
  title: string;
  status: "filed" | "ready" | string;
  draft?: string;
  jurisdiction: string;
  description: string;
}

export interface ProtocolDraft {
  name: string;
  title: string;
  url: string;
  text_url?: string;
  expires: string;
  status?: string;
}

export interface ProtocolRegistry {
  protocol: string;
  version: string;
  canonical_domain: string;
  ietf_drafts: ProtocolDraft[];
  standards: ProtocolStandard[];
  pq_signature_algs: string[];
  canonicalization: string;
  hash: string;
  regulatory_scope: string[];
  mcp?: { server_json: string; endpoint: string; tools: string[] };
  ecosystem?: Record<string, string>;
  license: string;
}

/**
 * Single source of truth for the published protocol registry.
 * The page never hardcodes draft status: it reads
 * /.well-known/apex-protocol.json, so filing a new draft only
 * requires updating that file and every standards surface follows.
 */
export function useProtocolRegistry() {
  const [data, setData] = useState<ProtocolRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/.well-known/apex-protocol.json", { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`registry returned ${r.status}`);
        return r.json();
      })
      .then((json) => active && setData(json as ProtocolRegistry))
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, []);

  return { registry: data, error, loading: !data && !error };
}

export function draftFor(registry: ProtocolRegistry | null, name?: string) {
  if (!registry || !name) return undefined;
  return registry.ietf_drafts.find((d) => d.name.startsWith(name));
}
