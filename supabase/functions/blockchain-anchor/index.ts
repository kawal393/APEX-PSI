// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Bitcoin Anchor Layer (REAL, no simulation)
//
// Aggregates unanchored Merkle roots from gallows_ledger into one anchor
// digest, submits that digest to the OpenTimestamps calendars, stores the
// returned .ots proof, and records the anchor as `pending`.
//
// An anchor becomes `confirmed` ONLY when a real Bitcoin block is found for
// it via mempool.space / blockstream.info. No fabricated txids, no fake block
// numbers, no synthetic gas values, no "confirmed" on submission.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  submitDigestToCalendars,
  getBitcoinTip,
  getTransactionStatus,
  extractBitcoinBlockHeight,
  base64ToBytes,
  sha256Hex,
  ESPLORA_ENDPOINTS,
  OTS_CALENDARS,
  buildDetachedProof,
  upgradeTimestamp,
} from "../_shared/ots.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Find the coinbase txid of a real block — the transaction the OTS proof commits into. */
async function getBlockTxid(height: number): Promise<{ txid?: string; block_hash?: string }> {
  for (const base of ESPLORA_ENDPOINTS) {
    try {
      const hashRes = await fetch(`${base}/block-height/${height}`);
      if (!hashRes.ok) continue;
      const blockHash = (await hashRes.text()).trim();
      const txRes = await fetch(`${base}/block/${blockHash}/txids`);
      if (!txRes.ok) continue;
      const txids: string[] = await txRes.json();
      if (Array.isArray(txids) && txids.length > 0) {
        return { txid: txids[0], block_hash: blockHash };
      }
    } catch {
      // try next explorer
    }
  }
  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? new URL(req.url).searchParams.get("action") ?? "history";

    // ── ANCHOR ─────────────────────────────────────────────────────────
    if (action === "anchor") {
      const { data: entries } = await supabase
        .from("gallows_ledger")
        .select("id, merkle_root, commit_id, created_at")
        .not("merkle_root", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!entries || entries.length === 0) {
        return json({ message: "No ledger entries with a Merkle root to anchor", anchored: 0 });
      }

      const merkleRoots = entries.map((e: Record<string, string>) => e.merkle_root).filter(Boolean);
      // Deterministic aggregation digest over the sorted roots.
      const anchorHash = await sha256Hex(merkleRoots.slice().sort().join("|"));

      // Real submission to the OpenTimestamps Bitcoin calendars.
      const ots = await submitDigestToCalendars(anchorHash);
      if (!ots.ok) {
        return json(
          {
            error: "OpenTimestamps calendar submission failed — no anchor was recorded",
            details: ots.error,
          },
          502,
        );
      }

      // Real chain tip at submission time (context only, never used as a proof).
      let tipHeight: number | null = null;
      try {
        tipHeight = (await getBitcoinTip()).height;
      } catch {
        tipHeight = null;
      }

      const { data: proofRow, error: proofErr } = await supabase
        .from("ots_proofs")
        .insert({
          commit_id: `anchor:${anchorHash.slice(0, 16)}`,
          target_hash: anchorHash,
          ots_base64: ots.ots_base64!,
          calendar_url: ots.calendar_url!,
          status: "pending",
        })
        .select()
        .single();
      if (proofErr) throw new Error(`Failed to store .ots proof: ${proofErr.message}`);

      const { data: anchorRow, error: anchorErr } = await supabase
        .from("anchor_records")
        .insert({
          anchor_hash: anchorHash,
          entries_count: entries.length,
          merkle_roots: merkleRoots.slice(0, 20),
          chain: "bitcoin",
          status: "pending",
        })
        .select()
        .single();
      if (anchorErr) throw new Error(`Failed to store anchor record: ${anchorErr.message}`);

      return json({
        success: true,
        anchor: anchorRow,
        ots_proof_id: proofRow.id,
        ots_bytes: ots.ots_bytes_length,
        calendar_url: ots.calendar_url,
        chain_tip_at_submission: tipHeight,
        status: "pending",
        note:
          "Submitted to the OpenTimestamps Bitcoin calendars. This anchor stays pending until a real Bitcoin block includes it — typically within a few hours. Call action=refresh to upgrade it.",
        engine: "APEX PSI Bitcoin Anchor v2.0",
      });
    }

    // ── ANCHOR-COMMIT: timestamp one ledger entry's own Merkle root ──────
    // The batch anchor above aggregates roots, so an individual receipt can't
    // resolve to it. This gives a single commit its own real .ots proof, keyed
    // on its merkle_root so verify-hash can find it.
    if (action === "anchor-commit") {
      const commitId: string = body.commit_id ?? new URL(req.url).searchParams.get("commit_id") ?? "";
      if (!commitId) return json({ error: "commit_id is required" }, 400);

      const { data: entry } = await supabase
        .from("gallows_ledger")
        .select("commit_id, merkle_root")
        .eq("commit_id", commitId)
        .maybeSingle();

      if (!entry) return json({ error: "Commit not found in the ledger" }, 404);
      if (!entry.merkle_root) return json({ error: "Commit has no Merkle root to anchor" }, 400);

      const target = String(entry.merkle_root).replace(/^sha256:/, "");

      const { data: existing } = await supabase
        .from("ots_proofs")
        .select("id, status, calendar_url, bitcoin_block_height, bitcoin_txid")
        .eq("target_hash", target)
        .maybeSingle();
      if (existing) {
        return json({ success: true, already_anchored: true, proof: existing });
      }

      const ots = await submitDigestToCalendars(target);
      if (!ots.ok) {
        return json({ error: "OpenTimestamps calendar submission failed", details: ots.error }, 502);
      }

      const { data: proofRow, error: proofErr } = await supabase
        .from("ots_proofs")
        .insert({
          commit_id: entry.commit_id,
          target_hash: target,
          ots_base64: ots.ots_base64!,
          calendar_url: ots.calendar_url!,
          status: "pending",
        })
        .select("id, status, calendar_url")
        .single();
      if (proofErr) throw new Error(`Failed to store .ots proof: ${proofErr.message}`);

      return json({
        success: true,
        commit_id: entry.commit_id,
        target_hash: target,
        ots_proof_id: proofRow.id,
        ots_bytes: ots.ots_bytes_length,
        calendar_url: ots.calendar_url,
        status: "pending",
        note:
          "Accepted by the OpenTimestamps Bitcoin calendars. It stays pending until a real Bitcoin block includes it.",
      });
    }



    // ── REFRESH: pending → confirmed only on a real block ──────────────
    if (action === "refresh") {
      const { data: pending } = await supabase
        .from("anchor_records")
        .select("*")
        .eq("status", "pending")
        .limit(50);

      const updated: unknown[] = [];
      for (const anchor of pending ?? []) {
        const { data: proof } = await supabase
          .from("ots_proofs")
          .select("*")
          .eq("target_hash", anchor.anchor_hash)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!proof) continue;

        // Upgrade the STORED proof at its own calendar — never re-submit a digest.
        const storedBytes = base64ToBytes(proof.ots_base64);
        const calendar = proof.calendar_url ?? OTS_CALENDARS[0];
        const upgraded = await upgradeTimestamp(calendar, storedBytes);
        const bytes = upgraded.ok ? upgraded.bytes! : storedBytes;
        const height = extractBitcoinBlockHeight(bytes);

        if (upgraded.ok) {
          try {
            const detached = buildDetachedProof(anchor.anchor_hash, upgraded.bytes!);
            if (detached !== proof.ots_base64) {
              await supabase.from("ots_proofs").update({ ots_base64: detached }).eq("id", proof.id);
            }
          } catch (_e) {
            // Malformed digest — leave the stored proof untouched.
          }
        }

        if (!height) continue; // still calendar-pending — leave status alone

        const { txid, block_hash } = await getBlockTxid(height);
        if (!txid) continue;

        const status = await getTransactionStatus(txid);
        if (!status.confirmed) continue; // never confirm without a real block

        await supabase
          .from("anchor_records")
          .update({
            status: "confirmed",
            bitcoin_txid: txid,
            block_height: height,
            explorer_url: `https://mempool.space/tx/${txid}`,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", anchor.id);

        await supabase
          .from("ots_proofs")
          .update({ status: "confirmed", bitcoin_block_height: height, bitcoin_txid: txid })
          .eq("id", proof.id);

        updated.push({ anchor_hash: anchor.anchor_hash, block_height: height, txid, block_hash });
      }

      return json({
        success: true,
        checked: pending?.length ?? 0,
        confirmed: updated.length,
        confirmations: updated,
      });
    }

    // ── HISTORY (real records only) ────────────────────────────────────
    if (action === "history") {
      const { data: anchors } = await supabase
        .from("anchor_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      return json({
        anchors: anchors ?? [],
        confirmed: (anchors ?? []).filter((a: Record<string, string>) => a.status === "confirmed").length,
        pending: (anchors ?? []).filter((a: Record<string, string>) => a.status === "pending").length,
        simulation: false,
      });
    }

    // ── VERIFY a specific txid against the real chain ──────────────────
    if (action === "verify") {
      const txid: string | undefined = body.txid ?? body.tx_id;
      if (!txid) return json({ error: "txid required" }, 400);

      const { data: anchor } = await supabase
        .from("anchor_records")
        .select("*")
        .eq("bitcoin_txid", txid)
        .maybeSingle();

      const chain = await getTransactionStatus(txid);

      return json({
        verified: chain.confirmed && !!anchor,
        on_chain: chain,
        anchor: anchor ?? null,
        message: !anchor
          ? "No APEX anchor references this transaction"
          : chain.confirmed
            ? "Anchor confirmed on the Bitcoin blockchain"
            : "Transaction seen but not yet confirmed in a block",
      });
    }

    return json({ error: "Unknown action. Use anchor | refresh | history | verify" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[blockchain-anchor]", msg);
    return json({ error: msg }, 500);
  }
});
