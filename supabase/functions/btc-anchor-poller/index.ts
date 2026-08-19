// APEX PSI — Bitcoin anchor confirmation poller.
//
// For every ots_proofs row still marked `submitted` (or pending) that carries a
// txid, ask mempool.space whether a real Bitcoin block includes it. A row is
// promoted to `confirmed` ONLY on a confirmed API response. Any API failure is
// swallowed: a record is never flipped to a state the chain has not proven.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

interface TxStatus {
  confirmed: boolean;
  block_height?: number | null;
}

async function txStatus(txid: string): Promise<TxStatus | null> {
  try {
    const r = await fetch(`${MEMPOOL}/tx/${txid}`);
    if (!r.ok) return null;
    const body = await r.json();
    const s = body?.status;
    if (!s || typeof s.confirmed !== "boolean") return null;
    return { confirmed: s.confirmed, block_height: s.block_height ?? null };
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

  const summary = { checked: 0, confirmed: 0, still_submitted: 0, unreachable: 0 };

  try {
    const { data: rows, error } = await supabase
      .from("ots_proofs")
      .select("id, status, bitcoin_txid, bitcoin_block_height, confirmations")
      .in("status", ["submitted", "pending"])
      .not("bitcoin_txid", "is", null)
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
      const status = await txStatus(row.bitcoin_txid as string);
      const polled = { last_polled_at: new Date().toISOString() };

      if (!status) {
        summary.unreachable++;
        // API unreachable or malformed: record the attempt only. No state change.
        await supabase.from("ots_proofs").update(polled).eq("id", row.id);
        continue;
      }

      if (status.confirmed && typeof status.block_height === "number") {
        const confirmations = tip !== null ? Math.max(1, tip - status.block_height + 1) : 1;
        await supabase
          .from("ots_proofs")
          .update({
            ...polled,
            status: "confirmed",
            bitcoin_block_height: status.block_height,
            confirmations,
          })
          .eq("id", row.id);
        summary.confirmed++;
      } else {
        summary.still_submitted++;
        await supabase.from("ots_proofs").update({ ...polled, status: "submitted" }).eq("id", row.id);
      }
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
