// APEX PSI — self-custody crypto payment watcher.
//
// Runs on cron. For every open invoice it asks a public chain source whether the
// exact quoted amount arrived at the invoice address. States only ever move
// forward on evidence: an API failure is logged and skipped, never converted into
// a false "paid". Provisioning happens once, at the required confirmation depth.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { CRYPTO_ITEMS, REQUIRED_CONFIRMATIONS, type CryptoAsset } from "../_shared/cryptoCatalog.ts";
import { USDC_CONTRACT } from "../_shared/cryptoChain.ts";
import { grantEntitlement } from "../_shared/commerceProvisioning.ts";

const MEMPOOL = "https://mempool.space/api";
const ETH_RPC = Deno.env.get("ETH_RPC_URL") ?? "https://ethereum-rpc.publicnode.com";
const MAX_ETH_BLOCK_SPAN = 200;
const SCAN_STATE_KEY = "__eth_scan_block";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type Invoice = {
  id: string;
  invoice_ref: string;
  user_id: string;
  item_key: string;
  asset: CryptoAsset;
  address: string;
  amount_atomic: string;
  status: string;
  confirmations: number;
  txid: string | null;
  expires_at: string;
  provisioned: boolean;
};

type Observation = { txid: string; atomic: bigint; confirmations: number };

async function jsonFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("fetch failed", url, error instanceof Error ? error.message : error);
    return null;
  }
}

async function rpc(method: string, params: unknown[]): Promise<any | null> {
  try {
    const res = await fetch(ETH_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.error) {
      console.error("rpc error", method, body.error?.message);
      return null;
    }
    return body?.result ?? null;
  } catch (error) {
    console.error("rpc failed", method, error instanceof Error ? error.message : error);
    return null;
  }
}

async function btcTipHeight(): Promise<number | null> {
  try {
    const res = await fetch(`${MEMPOOL}/blocks/tip/height`);
    if (!res.ok) return null;
    const n = Number((await res.text()).trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Finds a transaction paying at least the quoted amount to the invoice address. */
async function observeBtc(invoice: Invoice, tip: number | null): Promise<Observation | null> {
  const txs = await jsonFetch(`${MEMPOOL}/address/${invoice.address}/txs`);
  if (!Array.isArray(txs)) return null;
  const want = BigInt(invoice.amount_atomic);

  for (const tx of txs) {
    const paid = (tx?.vout ?? []).reduce((sum: bigint, out: any) => (
      out?.scriptpubkey_address === invoice.address ? sum + BigInt(out?.value ?? 0) : sum
    ), 0n);
    if (paid < want) continue;
    const confirmed = tx?.status?.confirmed === true;
    const height = Number(tx?.status?.block_height);
    const confirmations = confirmed && tip && Number.isFinite(height) ? tip - height + 1 : 0;
    return { txid: String(tx.txid), atomic: paid, confirmations: Math.max(confirmations, 0) };
  }
  return null;
}

function hexToBigInt(value: unknown): bigint {
  if (typeof value !== "string" || !value.startsWith("0x")) return 0n;
  return BigInt(value);
}

/** Scans a bounded block window for native ETH transfers to the receive address. */
async function scanEthTransfers(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<Array<{ txid: string; atomic: bigint; block: number }>> {
  const found: Array<{ txid: string; atomic: bigint; block: number }> = [];
  const target = address.toLowerCase();
  for (let b = fromBlock; b <= toBlock; b += 1) {
    const block = await rpc("eth_getBlockByNumber", [`0x${b.toString(16)}`, true]);
    if (!block?.transactions) continue;
    for (const tx of block.transactions) {
      if (String(tx?.to ?? "").toLowerCase() !== target) continue;
      const atomic = hexToBigInt(tx?.value);
      if (atomic > 0n) found.push({ txid: String(tx.hash), atomic, block: b });
    }
  }
  return found;
}

/** One eth_getLogs call covers every USDC transfer to the receive address. */
async function scanUsdcTransfers(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<Array<{ txid: string; atomic: bigint; block: number }>> {
  const padded = `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
  const logs = await rpc("eth_getLogs", [{
    address: USDC_CONTRACT,
    topics: [TRANSFER_TOPIC, null, padded],
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
  }]);
  if (!Array.isArray(logs)) return [];
  return logs.map((log: any) => ({
    txid: String(log.transactionHash),
    atomic: hexToBigInt(log.data),
    block: Number(log.blockNumber),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const backend = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const summary = { checked: 0, seen: 0, paid: 0, expired: 0, underpaid: 0, failed: 0 };

  // The watcher is dormant until receive addresses are configured. Report that
  // honestly with a 200 instead of failing the cron run every few minutes.
  if (!Deno.env.get("BTC_XPUB") && !Deno.env.get("ETH_RECEIVE_ADDRESS")) {
    return Response.json(
      { ok: true, dormant: true, reason: "no receive addresses configured", ...summary },
      { headers: corsHeaders },
    );
  }

  try {
    const { data: invoices, error } = await backend
      .from("crypto_invoices")
      .select(
        "id, invoice_ref, user_id, item_key, asset, address, amount_atomic, status, confirmations, txid, expires_at, provisioned",
      )
      .in("status", ["awaiting", "seen", "confirming"])
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;

    const open = (invoices ?? []) as Invoice[];
    summary.checked = open.length;
    const tip = open.some((i) => i.asset === "BTC") ? await btcTipHeight() : null;

    let ethTip: number | null = null;
    let ethFrom = 0;
    let ethTransfers: Array<{ txid: string; atomic: bigint; block: number }> = [];
    let usdcTransfers: Array<{ txid: string; atomic: bigint; block: number }> = [];
    const ethAddress = Deno.env.get("ETH_RECEIVE_ADDRESS");
    const needsEth = open.some((i) => i.asset !== "BTC");

    if (needsEth && ethAddress) {
      const tipHex = await rpc("eth_blockNumber", []);
      ethTip = tipHex ? Number(hexToBigInt(tipHex)) : null;
      if (ethTip) {
        const { data: state } = await backend
          .from("crypto_rate_cache")
          .select("usd")
          .eq("asset", SCAN_STATE_KEY)
          .maybeSingle();
        const stored = Number(state?.usd ?? 0);
        ethFrom = stored > 0 ? stored + 1 : ethTip - MAX_ETH_BLOCK_SPAN;
        if (ethTip - ethFrom > MAX_ETH_BLOCK_SPAN) ethFrom = ethTip - MAX_ETH_BLOCK_SPAN;
        if (ethFrom < 0) ethFrom = 0;

        if (open.some((i) => i.asset === "ETH")) {
          ethTransfers = await scanEthTransfers(ethAddress, ethFrom, ethTip);
        }
        if (open.some((i) => i.asset === "USDC")) {
          usdcTransfers = await scanUsdcTransfers(ethAddress, ethFrom, ethTip);
        }
        await backend.from("crypto_rate_cache").upsert({
          asset: SCAN_STATE_KEY,
          usd: ethTip,
          source: "eth-scan-cursor",
          fetched_at: new Date().toISOString(),
        }, { onConflict: "asset" });
      }
    }

    for (const invoice of open) {
      try {
      const want = BigInt(invoice.amount_atomic);
      let observation: Observation | null = null;

      if (invoice.asset === "BTC") {
        observation = await observeBtc(invoice, tip);
      } else {
        const pool = invoice.asset === "ETH" ? ethTransfers : usdcTransfers;
        const match = pool.find((t) => t.atomic >= want);
        if (match && ethTip) {
          observation = {
            txid: match.txid,
            atomic: match.atomic,
            confirmations: Math.max(ethTip - match.block + 1, 0),
          };
        }
      }

      if (!observation) {
        if (Date.parse(invoice.expires_at) < Date.now() && invoice.status === "awaiting") {
          await backend.from("crypto_invoices").update({ status: "expired" }).eq("id", invoice.id);
          summary.expired += 1;
        }
        continue;
      }

      if (observation.atomic < want) {
        await backend.from("crypto_invoices").update({
          status: "underpaid",
          txid: observation.txid,
          confirmations: observation.confirmations,
          seen_at: new Date().toISOString(),
        }).eq("id", invoice.id);
        summary.underpaid += 1;
        continue;
      }

      const required = REQUIRED_CONFIRMATIONS[invoice.asset];
      const isPaid = observation.confirmations >= required;
      const status = isPaid ? "paid" : observation.confirmations > 0 ? "confirming" : "seen";

      if (isPaid && !invoice.provisioned) {
        const item = CRYPTO_ITEMS[invoice.item_key];
        if (item) {
          await grantEntitlement(backend, {
            userId: invoice.user_id,
            serviceKey: item.serviceKey,
            quantity: item.quantity,
            months: item.months,
            metadata: {
              paid_with: invoice.asset,
              invoice_ref: invoice.invoice_ref,
              payment_txid: observation.txid,
            },
          });
        }
      }

      await backend.from("crypto_invoices").update({
        status,
        txid: observation.txid,
        confirmations: observation.confirmations,
        seen_at: new Date().toISOString(),
        paid_at: isPaid ? new Date().toISOString() : null,
        provisioned: isPaid ? true : invoice.provisioned,
      }).eq("id", invoice.id);

      if (isPaid) summary.paid += 1;
      else summary.seen += 1;
      } catch (invoiceError) {
        // One bad invoice must never abort the whole scan.
        summary.failed += 1;
        console.error(
          "crypto-watcher: invoice failed",
          invoice.id,
          invoiceError instanceof Error ? invoiceError.message : JSON.stringify(invoiceError),
        );
      }
    }

    // Sweep quotes that lapsed without any payment at all.
    const { count } = await backend
      .from("crypto_invoices")
      .update({ status: "expired" }, { count: "exact" })
      .eq("status", "awaiting")
      .lt("expires_at", new Date().toISOString())
      .select("id");
    summary.expired += count ?? 0;

    return Response.json({ ok: true, ...summary }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : `watcher failed: ${JSON.stringify(error)}`;
    console.error("crypto-watcher:", message, error);
    return Response.json({ ok: false, error: message, ...summary }, { status: 500, headers: corsHeaders });
  }
});
