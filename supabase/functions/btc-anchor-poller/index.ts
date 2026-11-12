// APEX PSI — Bitcoin anchor confirmation poller.
//
// For every ots_proofs row that has not confirmed, ask the calendar to upgrade
// the stored proof, read the Bitcoin attestation out of it, and ask the chain
// whether the attested transaction is really in the block the attestation
// names.
//
// Three rules, each of which closes a defect that shipped before:
//
//   1. BINDING. The proof must carry the digest it is filed under. The proof we
//      hold for draft-singh-psi-agent-02 does not, so it can never be
//      confirmed — no matter what height it names.
//   2. NO SELF-SUPPORTED CONFIRMATION. The transaction id comes from the
//      attestation, and the chain must list it in that block. The coinbase of
//      a block proves nothing and is never published.
//   3. NO SILENT FLIPS. An API failure leaves the row exactly as it was. A
//      record is never moved to a state the chain has not proven.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  base64ToBytes,
  bytesToBase64,
  proofCoversDigest,
  readBitcoinAttestation,
  upgradeTimestamp,
  verifyAttestedTransaction,
} from "../_shared/ots.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const MEMPOOL = "https://mempool.space/api";

async function tipHeight(): Promise<number | null> {
  try {
    const r = await fetch(`${MEMPOOL}/blocks/tip/height`);
    if (!r.ok) return null;
    const n = Number((await r.text()).trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const summary = {
    checked: 0,
    confirmed: 0,
    still_pending: 0,
    unreachable: 0,
    upgraded: 0,
    upgrade_failed: 0,
    proof_does_not_cover_digest: 0,
    no_attested_transaction: 0,
  };

  try {
    const { data: rows, error } = await supabase
      .from("ots_proofs")
      .select("id, status, target_hash, calendar_url, ots_base64")
      .in("status", ["submitted", "pending"])
      .limit(200);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200,
        headers: cors,
      });
    }

    const tip = await tipHeight();

    for (const row of rows ?? []) {
      summary.checked++;
      const polled = { last_polled_at: new Date().toISOString() };

      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(row.ots_base64 as string);
      } catch {
        summary.unreachable++;
        await supabase.from("ots_proofs").update(polled).eq("id", row.id);
        continue;
      }

      // 1. Ask the calendar for the upgraded proof. The calendar is the only
      //    party that can move a pending timestamp to a Bitcoin attestation.
      try {
        const up = await upgradeTimestamp(
          row.calendar_url ?? "",
          bytes,
          row.target_hash as string,
        );
        if (up.ok && up.bytes && up.bytes.length > bytes.length) {
          bytes = up.bytes;
          summary.upgraded++;
          await supabase
            .from("ots_proofs")
            .update({ ...polled, ots_base64: bytesToBase64(bytes) })
            .eq("id", row.id);
        } else if (!up.ok) {
          summary.upgrade_failed++;
        }
      } catch {
        summary.upgrade_failed++;
      }

      // 2. The proof must carry the digest it is filed under.
      if (!proofCoversDigest(bytes, row.target_hash as string)) {
        summary.proof_does_not_cover_digest++;
        await supabase.from("ots_proofs").update(polled).eq("id", row.id);
        continue;
      }

      // 3. The attestation must name a transaction, not only a block.
      const attestation = readBitcoinAttestation(bytes);
      if (attestation.height === null || !attestation.txid) {
        summary.no_attested_transaction++;
        await supabase.from("ots_proofs").update(polled).eq("id", row.id);
        continue;
      }

      // 4. The chain must list that transaction in that block.
      const check = await verifyAttestedTransaction(attestation.height, attestation.txid);
      if (!check.confirmed) {
        summary.still_pending++;
        await supabase.from("ots_proofs").update(polled).eq("id", row.id);
        continue;
      }

      const confirmations = tip !== null ? Math.max(1, tip - attestation.height + 1) : 1;
      await supabase
        .from("ots_proofs")
        .update({
          ...polled,
          status: "confirmed",
          bitcoin_block_height: attestation.height,
          bitcoin_txid: attestation.txid,
          confirmations,
        })
        .eq("id", row.id);
      summary.confirmed++;
    }

    // Refresh confirmation counts for already-confirmed rows so the public
    // display stays accurate as the chain grows.
    if (tip !== null) {
      const { data: confirmedRows } = await supabase
        .from("ots_proofs")
        .select("id, bitcoin_block_height")
        .eq("status", "confirmed")
        .not("bitcoin_block_height", "is", null)
        .limit(500);
      for (const row of confirmedRows ?? []) {
        const h = row.bitcoin_block_height as number;
        await supabase
          .from("ots_proofs")
          .update({ confirmations: Math.max(1, tip - h + 1), last_polled_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, tip_height: tip, ...summary }), {
      status: 200,
      headers: cors,
    });
  } catch (e) {
    // Never surface a false state on failure.
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), ...summary }),
      { status: 200, headers: cors },
    );
  }
});
