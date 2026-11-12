// Only the creator of an engine commit may challenge or prove it.
// Signed-in commits belong to their user; anonymous commits carry a one-time
// control token returned once by commit-action and stored only as SHA-256.
import { type Caller, sha256Hex } from "./caller.ts";

export function newControlToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return "ctl_" + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function mayAdvanceCommit(
  caller: Caller,
  commit: { user_id: string | null; control_token_hash: string | null },
  controlToken: unknown,
): Promise<boolean> {
  if (caller.service || caller.isAdmin) return true;
  if (commit.user_id && caller.userId && caller.userId === commit.user_id) return true;
  if (
    typeof controlToken === "string" &&
    /^ctl_[0-9a-f]{64}$/.test(controlToken) &&
    commit.control_token_hash
  ) {
    return (await sha256Hex(controlToken)) === commit.control_token_hash;
  }
  return false;
}
