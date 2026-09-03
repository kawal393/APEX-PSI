// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — Server-Side Persistence Layer
// ALL mutations go through Edge Functions for tamper-proof verification
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { CommitRecord, MerkleProofPath } from "./engine-engine";

export interface LedgerEntry {
  id: string;
  commit_id: string;
  user_id: string | null;
  action: string;
  predicate_id: string;
  phase: string;
  status: string | null;
  commit_hash: string;
  merkle_leaf_hash: string;
  challenge_hash: string | null;
  proof_hash: string | null;
  merkle_root: string | null;
  merkle_proof: MerkleProofPath | null;
  violation_found: string | null;
  verification_time_ms: number | null;
  challenged_at: string | null;
  proven_at: string | null;
  created_at: string;
}

export interface ServerCommitResponse {
  success: boolean;
  commit_id?: string;
  commit_hash?: string;
  merkle_leaf_hash?: string;
  timestamp?: string;
  hash_verified_server_side?: boolean;
  hash_mismatch_detected?: boolean;
  rate_limit_remaining?: number;
  error?: string;
}

export interface ServerChallengeResponse {
  success: boolean;
  commit_id?: string;
  phase?: string;
  challenge_hash?: string;
  challenged_at?: string;
  error?: string;
}

export interface ServerProveResponse {
  success: boolean;
  commit_id?: string;
  phase?: string;
  status?: 'APPROVED' | 'BLOCKED';
  proof_hash?: string;
  merkle_root?: string;
  merkle_proof?: MerkleProofPath;
  violation_found?: string | null;
  verification_time_ms?: number;
  proven_at?: string;
  leaf_count?: number;
  external_anchoring?: {
    success: boolean;
    ots_url?: string;
    error?: string;
  };
  error?: string;
}

/**
 * Persist a commit via server-side Edge Function
 * Server re-computes hashes to prevent client-side tampering
 */
export async function persistCommit(record: CommitRecord): Promise<ServerCommitResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('commit-action', {
      body: {
        action: record.action,
        predicate_id: record.predicateId,
        client_commit_hash: record.commitHash,
        client_leaf_hash: record.merkleLeafHash,
      },
    });

    if (error) {
      console.error('[Engine Persistence] Server commit failed:', error.message);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      commit_id: data.commit_id,
      commit_hash: data.commit_hash,
      merkle_leaf_hash: data.merkle_leaf_hash,
      timestamp: data.timestamp,
      hash_verified_server_side: data.hash_verified_server_side,
      hash_mismatch_detected: data.hash_mismatch_detected,
      rate_limit_remaining: data.rate_limit_remaining,
    };
  } catch (e: any) {
    console.error('[Engine Persistence] Commit failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Challenge a commit via server-side Edge Function
 * Server generates and persists challenge hash
 */
export async function challengeCommitServer(commitId: string): Promise<ServerChallengeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('challenge-action', {
      body: { commit_id: commitId },
    });

    if (error) {
      console.error('[Engine Persistence] Server challenge failed:', error.message);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      commit_id: data.commit_id,
      phase: data.phase,
      challenge_hash: data.challenge_hash,
      challenged_at: data.challenged_at,
    };
  } catch (e: any) {
    console.error('[Engine Persistence] Challenge failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Prove a commit via server-side Edge Function
 * Server builds Merkle tree, generates proof, anchors to OpenTimestamps
 */
export async function proveCommitServer(commitId: string): Promise<ServerProveResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('prove-action', {
      body: { commit_id: commitId },
    });

    if (error) {
      console.error('[Engine Persistence] Server prove failed:', error.message);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      commit_id: data.commit_id,
      phase: data.phase,
      status: data.status,
      proof_hash: data.proof_hash,
      merkle_root: data.merkle_root,
      merkle_proof: data.merkle_proof,
      violation_found: data.violation_found,
      verification_time_ms: data.verification_time_ms,
      proven_at: data.proven_at,
      leaf_count: data.leaf_count,
      external_anchoring: data.external_anchoring,
    };
  } catch (e: any) {
    console.error('[Engine Persistence] Prove failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Fetch all ledger entries (public audit trail)
 * Sorted by created_at ascending for tree reconstruction
 */
export async function fetchLedger(limit = 500): Promise<LedgerEntry[]> {
  const { data, error } = await (supabase.from('gallows_public_ledger' as any) as any)
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Engine Persistence] Fetch failed:', error.message);
    return [];
  }

  return (data ?? []) as LedgerEntry[];
}

/**
 * Fetch ledger entries sorted descending for display
 */
export async function fetchLedgerDescending(limit = 100): Promise<LedgerEntry[]> {
  const { data, error } = await (supabase.from('gallows_public_ledger' as any) as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Engine Persistence] Fetch failed:', error.message);
    return [];
  }

  return (data ?? []) as LedgerEntry[];
}

/**
 * Verify a hash against the public ledger
 */
export async function verifyHashInLedger(hash: string): Promise<{
  found: boolean;
  entry?: LedgerEntry;
}> {
  const { data, error } = await (supabase.from('gallows_public_ledger' as any) as any)
    .select('*')
    .or(`commit_hash.eq.${hash},merkle_leaf_hash.eq.${hash},proof_hash.eq.${hash},challenge_hash.eq.${hash}`)
    .limit(1);

  if (error || !data || data.length === 0) {
    return { found: false };
  }

  return { found: true, entry: data[0] as LedgerEntry };
}

/**
 * Get current Merkle root from the latest verified entry
 */
export async function getLatestMerkleRoot(): Promise<string | null> {
  const { data, error } = await (supabase.from('gallows_public_ledger' as any) as any)
    .select('merkle_root')
    .not('merkle_root', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return (data[0] as { merkle_root: string }).merkle_root;
}

/**
 * Subscribe to realtime ledger updates (INSERT events only)
 */
export function subscribeLedger(callback: (entry: LedgerEntry) => void) {
  const channel = supabase
    .channel('gallows_ledger_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'gallows_ledger',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as unknown as LedgerEntry);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all ledger changes (INSERT, UPDATE)
 */
export function subscribeLedgerAll(callback: (entry: LedgerEntry, event: string) => void) {
  const channel = supabase
    .channel('gallows_ledger_all_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gallows_ledger',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as unknown as LedgerEntry, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
