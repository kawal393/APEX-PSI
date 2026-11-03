// Browser-only sealing for the public playground. Ephemeral keys: integrity, not identity.
import { incidentEntryHash } from "../../packages/psi-verifier/src/incident";

export interface PlaygroundSeal {
  format: "APEX-PLAYGROUND/1";
  payload_sha256: string;
  sealed_at: string;
  public_key: string;
  signature: string;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));
export const sha256Hex = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const message = (s: Pick<PlaygroundSeal, "format" | "payload_sha256" | "sealed_at">) =>
  JSON.stringify({ format: s.format, payload_sha256: s.payload_sha256, sealed_at: s.sealed_at });

export async function sealInBrowser(text: string): Promise<PlaygroundSeal> {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const base = { format: "APEX-PLAYGROUND/1" as const, payload_sha256: await sha256Hex(text), sealed_at: new Date().toISOString() };
  const sig = await crypto.subtle.sign("Ed25519", kp.privateKey, new TextEncoder().encode(message(base)));
  return { ...base, public_key: hex(await crypto.subtle.exportKey("raw", kp.publicKey)), signature: hex(sig) };
}

/** Fail-closed: the text must hash to the sealed digest AND the signature must verify. */
export async function verifyPlaygroundSeal(seal: PlaygroundSeal, text: string): Promise<boolean> {
  try {
    if (seal.format !== "APEX-PLAYGROUND/1" || (await sha256Hex(text)) !== seal.payload_sha256) return false;
    const pub = unhex(seal.public_key), sig = unhex(seal.signature);
    if (pub.length !== 32 || sig.length !== 64) return false;
    const key = await crypto.subtle.importKey("raw", pub, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sig, new TextEncoder().encode(message(seal)));
  } catch { return false; }
}

export async function buildIncidentBundle(steps: [string, string][]) {
  const entries: Record<string, unknown>[] = [];
  let prev = "0".repeat(64);
  for (const [kind, payload] of steps) {
    const e: Record<string, unknown> = { seq: entries.length, ts: new Date().toISOString(), kind, payload_sha256: await sha256Hex(payload), prev };
    e.entry_hash = await incidentEntryHash(e);
    prev = e.entry_hash as string;
    entries.push(e);
  }
  return { format: "APEX-INCIDENT/1", hash_alg: "sha256", count: entries.length, head: prev, entries };
}
