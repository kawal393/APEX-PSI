/**
 * APEX-INCIDENT/1 — offline check of an agent flight-recorder hash chain.
 * Fail-closed: any reorder, edit, gap, insertion or truncation → valid:false.
 * Scope: proves the file is internally intact; it does not authenticate the
 * author or the time. Seal `head` with the hosted notary for that.
 */
export const INCIDENT_FORMAT = "APEX-INCIDENT/1";
const GENESIS = "0".repeat(64);

export interface IncidentResult { valid: boolean; errors: string[]; count: number; head: string | null }

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canon(e: Record<string, unknown>): string {
  const keys = ["kind", "payload_sha256", "prev", "seq", "ts"];
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(e[k])).join(",") + "}";
}

export async function incidentEntryHash(e: Record<string, unknown>): Promise<string> {
  return sha256Hex(canon(e));
}

export async function verifyIncidentBundle(bundle: unknown): Promise<IncidentResult> {
  const b = bundle as { format?: unknown; entries?: unknown; count?: unknown; head?: unknown } | null;
  if (!b || typeof b !== "object" || b.format !== INCIDENT_FORMAT)
    return { valid: false, errors: ["format is not APEX-INCIDENT/1"], count: 0, head: null };
  if (!Array.isArray(b.entries) || b.entries.length === 0)
    return { valid: false, errors: ["no entries"], count: 0, head: null };
  const errors: string[] = [];
  let prev: string | null = GENESIS;
  for (let i = 0; i < b.entries.length; i++) {
    const e = b.entries[i] as Record<string, unknown>;
    if (!e || typeof e !== "object" || typeof e.entry_hash !== "string" || !Number.isInteger(e.seq) ||
        typeof e.ts !== "string" || typeof e.kind !== "string" || typeof e.prev !== "string" ||
        typeof e.payload_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.payload_sha256)) {
      errors.push(`entry ${i}: malformed`); prev = null; continue;
    }
    if (e.seq !== i) errors.push(`entry ${i}: sequence gap or reorder`);
    if (e.prev !== prev) errors.push(`entry ${i}: broken link to previous entry`);
    if ((await incidentEntryHash(e)) !== e.entry_hash) errors.push(`entry ${i}: content altered`);
    prev = e.entry_hash;
  }
  if (b.count !== b.entries.length) errors.push("count does not match entries (truncated?)");
  if (b.head !== prev) errors.push("head does not match last entry (truncated or altered)");
  return { valid: errors.length === 0, errors, count: b.entries.length, head: prev };
}
