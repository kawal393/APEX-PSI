import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { ArrowRight, Bitcoin, Check, Copy, Loader2, ShieldCheck, Timer } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CRYPTO_ASSETS, CRYPTO_ITEMS, type CryptoAssetId, type CryptoItemKey } from "@/lib/commerce";
import { SITE_URL } from "@/lib/site";

type Invoice = {
  invoice_ref: string;
  item_key: string;
  asset: CryptoAssetId;
  address: string;
  amount_asset: number;
  amount_atomic: string;
  fiat_amount_cents: number;
  rate_usd: number;
  rate_source: string;
  status: string;
  txid: string | null;
  confirmations: number;
  expires_at: string;
};

const REQUIRED: Record<CryptoAssetId, number> = { BTC: 3, ETH: 12, USDC: 12 };

const STATUS_COPY: Record<string, { label: string; tone: string; body: string }> = {
  awaiting: {
    label: "AWAITING PAYMENT",
    tone: "text-muted-foreground border-border",
    body: "No transaction observed on-chain yet. Send the exact amount shown.",
  },
  seen: {
    label: "SEEN IN MEMPOOL",
    tone: "text-gold border-gold/40",
    body: "A matching transaction is visible but has no confirmations yet.",
  },
  confirming: {
    label: "CONFIRMING",
    tone: "text-gold border-gold/40",
    body: "Confirmations are accumulating. Your purchase activates at the required depth.",
  },
  paid: {
    label: "PAID — ACTIVATED",
    tone: "text-emerald-400 border-emerald-500/40",
    body: "Confirmed on-chain and credited to your account.",
  },
  underpaid: {
    label: "UNDERPAID",
    tone: "text-destructive border-destructive/40",
    body: "The amount received is below the quoted amount. Contact us with your invoice reference.",
  },
  expired: {
    label: "QUOTE EXPIRED",
    tone: "text-muted-foreground border-border",
    body: "The rate lock lapsed with no payment observed. Request a new quote.",
  },
};

function explorerTx(asset: CryptoAssetId, txid: string) {
  return asset === "BTC" ? `https://mempool.space/tx/${txid}` : `https://etherscan.io/tx/${txid}`;
}

function paymentUri(invoice: Invoice) {
  if (invoice.asset === "BTC") return `bitcoin:${invoice.address}?amount=${invoice.amount_asset}`;
  if (invoice.asset === "ETH") return `ethereum:${invoice.address}@1?value=${invoice.amount_atomic}`;
  return `ethereum:${invoice.address}`;
}

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <code className="font-mono text-sm text-foreground break-all flex-1">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

const CryptoCheckout = () => {
  const { ref } = useParams<{ ref?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<CryptoItemKey>("receipt_1");
  const [asset, setAsset] = useState<CryptoAssetId>("BTC");
  const [creating, setCreating] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const loadInvoice = useCallback(async (invoiceRef: string) => {
    const { data, error } = await supabase
      .from("crypto_invoices")
      .select(
        "invoice_ref, item_key, asset, address, amount_asset, amount_atomic, fiat_amount_cents, rate_usd, rate_source, status, txid, confirmations, expires_at",
      )
      .eq("invoice_ref", invoiceRef)
      .maybeSingle();
    if (error || !data) return;
    setInvoice(data as Invoice);
  }, []);

  useEffect(() => {
    if (!ref || !user) return;
    void loadInvoice(ref);
    const timer = window.setInterval(() => void loadInvoice(ref), 20000);
    return () => window.clearInterval(timer);
  }, [ref, user, loadInvoice]);

  useEffect(() => {
    if (!invoice) return setQr(null);
    void QRCode.toDataURL(paymentUri(invoice), { width: 240, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [invoice]);

  const createInvoice = async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent("/crypto")}`);
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("crypto-quote", { body: { item, asset } });
      if (error) {
        // Surface the server's own sentence instead of the generic non-2xx grunt.
        const ctx = (error as { context?: unknown }).context;
        if (ctx instanceof Response) {
          const body = (await ctx.clone().json().catch(() => null)) as { error?: string } | null;
          if (body?.error) throw new Error(body.error);
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      navigate(`/crypto/${data.invoice_ref}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a crypto invoice");
    } finally {
      setCreating(false);
    }
  };

  const status = invoice ? STATUS_COPY[invoice.status] ?? STATUS_COPY.awaiting : null;
  const itemMeta = useMemo(
    () => CRYPTO_ITEMS.find((i) => i.key === (invoice?.item_key ?? item)),
    [invoice?.item_key, item],
  );

  // On-chain payment is not open yet. Without an existing invoice reference the
  // page states that plainly rather than quoting an amount it cannot settle.
  if (!ref) {
    return (
      <>
        <Helmet>
          <title>On-chain payment — available soon | Apex PSI</title>
          <meta
            name="description"
            content="On-chain payment for APEX PSI receipts, API credits and registry listings is not open yet. Card checkout is available now. Verification remains free."
          />
          <link rel="canonical" href={`${SITE_URL}/crypto`} />
        </Helmet>
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <main className="px-4 pt-28 md:pt-32 pb-24">
            <div className="container mx-auto max-w-2xl">
              <div className="rounded-xl border border-border p-8 md:p-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold mb-4">
                  On-chain payment
                </p>
                <h1 className="text-3xl md:text-4xl font-bold mb-5">Available soon</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Payment in Bitcoin, Ethereum or USDC is not open yet. Card checkout is available now.
                  Sealing and public verification remain free and unmetered.
                </p>
                <Button variant="heroOutline" asChild>
                  <Link to="/products">
                    View products <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pay with Bitcoin, Ethereum or USDC — Apex PSI</title>
        <meta
          name="description"
          content="Pay for APEX PSI conformity receipts, API credits and registry listings directly in Bitcoin, Ethereum or USDC. Self-custody, no intermediary, verified on-chain."
        />
        <link rel="canonical" href={`${SITE_URL}/crypto`} />
        <meta property="og:title" content="Pay with Bitcoin, Ethereum or USDC — Apex PSI" />
        <meta
          property="og:description"
          content="Self-custody crypto payments for the Universal Verification Layer. Confirmed on-chain, credited automatically."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/crypto`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />

        <header className="pt-28 md:pt-32 pb-10 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-gold uppercase mb-6">
                <Bitcoin className="h-3 w-3" /> Self-custody · No intermediary
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] mb-5">
                <span className="text-gold-gradient">Pay in Bitcoin,</span>
                <span className="block text-chrome-gradient">Ethereum or USDC</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                The rate is locked for 20 minutes. Your payment is read directly from the public chain and
                credited to your account once it reaches the required confirmation depth. We never take
                custody of your keys and never hold a spendable balance on this server.
              </p>
            </motion.div>
          </div>
        </header>

        <main className="px-4 pb-20">
          <div className="container mx-auto max-w-3xl">
            {!invoice ? (
              <section className="rounded-xl border border-border bg-card p-6 md:p-8">
                <h2 className="text-sm font-bold tracking-widest uppercase text-foreground mb-5">
                  1 · Choose what you are buying
                </h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  {CRYPTO_ITEMS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setItem(option.key)}
                      className={`text-left rounded-lg border p-4 transition-colors ${
                        item === option.key
                          ? "border-gold bg-gold/[0.06]"
                          : "border-border bg-background/50 hover:border-gold/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-foreground">{option.label}</p>
                      <p className="text-2xl font-black text-foreground mt-1">{option.price}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.delivers}</p>
                    </button>
                  ))}
                </div>

                <h2 className="text-sm font-bold tracking-widest uppercase text-foreground mb-5">
                  2 · Choose the asset
                </h2>
                <div className="grid sm:grid-cols-3 gap-3 mb-8">
                  {CRYPTO_ASSETS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAsset(option.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        asset === option.id
                          ? "border-gold bg-gold/[0.06]"
                          : "border-border bg-background/50 hover:border-gold/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.chain}</p>
                      <p className="text-[10px] font-mono text-gold mt-1">{option.note}</p>
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={creating}
                  onClick={() => void createInvoice()}
                >
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {creating ? "Locking the rate…" : `Get a ${asset} payment address`}
                  {!creating ? <ArrowRight className="h-4 w-4 ml-1" /> : null}
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  A free account is required so the credit can be bound to its buyer. Subscriptions remain
                  card-only — on-chain recurring billing cannot be enforced honestly, so we do not pretend
                  to offer it.
                </p>
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-card p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase">
                      Invoice {invoice.invoice_ref}
                    </p>
                    <h2 className="text-lg font-bold text-foreground">{itemMeta?.label ?? invoice.item_key}</h2>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase ${status?.tone}`}
                  >
                    {status?.label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-6">{status?.body}</p>

                {["awaiting", "seen", "confirming"].includes(invoice.status) && (
                  <div className="grid md:grid-cols-[240px_1fr] gap-6 mb-6">
                    {qr && (
                      <img
                        src={qr}
                        alt={`${invoice.asset} payment QR code for invoice ${invoice.invoice_ref}`}
                        className="rounded-lg border border-border bg-white p-2 w-full max-w-[240px]"
                      />
                    )}
                    <div className="space-y-3">
                      <CopyField label={`Exact amount (${invoice.asset})`} value={String(invoice.amount_asset)} />
                      <CopyField label={`${invoice.asset} address`} value={invoice.address} />
                    </div>
                  </div>
                )}

                <dl className="grid sm:grid-cols-2 gap-3 text-sm mb-6">
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <dt className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Fiat total
                    </dt>
                    <dd className="font-mono text-foreground mt-1">
                      ${(invoice.fiat_amount_cents / 100).toFixed(2)} USD
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <dt className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Locked rate
                    </dt>
                    <dd className="font-mono text-foreground mt-1">
                      1 {invoice.asset} = ${Number(invoice.rate_usd).toLocaleString()} · {invoice.rate_source}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <dt className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Confirmations
                    </dt>
                    <dd className="font-mono text-foreground mt-1">
                      {invoice.confirmations} / {REQUIRED[invoice.asset]}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <dt className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      <Timer className="h-3 w-3 inline mr-1" /> Rate lock expires
                    </dt>
                    <dd className="font-mono text-foreground mt-1">
                      {new Date(invoice.expires_at).toUTCString()}
                    </dd>
                  </div>
                </dl>

                {invoice.txid && (
                  <a
                    href={explorerTx(invoice.asset, invoice.txid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-gold inline-flex items-center gap-1 hover:underline break-all"
                  >
                    View transaction on the public explorer <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}

                <div className="flex flex-wrap gap-3 mt-8">
                  {invoice.status === "paid" ? (
                    <Button variant="hero" size="lg" asChild>
                      <Link to="/dashboard">
                        Open your dashboard <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="heroOutline" size="lg" onClick={() => void loadInvoice(invoice.invoice_ref)}>
                      Refresh status
                    </Button>
                  )}
                  <Button variant="heroOutline" size="lg" asChild>
                    <Link to="/crypto">New invoice</Link>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-6">
                  Send the exact amount shown — it is what identifies your payment. Underpayments and
                  payments arriving after the rate lock expires are flagged for manual review rather than
                  credited automatically.
                </p>
              </section>
            )}

            <section className="mt-8 rounded-xl border border-gold/25 bg-gold/[0.04] p-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-foreground mb-3">
                <ShieldCheck className="h-4 w-4 inline mr-1.5 text-gold" /> What this is, exactly
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  Payments go straight to addresses we control; no payment processor sits between you and
                  the chain, and this server holds watch-only keys only.
                </li>
                <li>
                  A background job reads the public chain — mempool.space for Bitcoin, an Ethereum JSON-RPC
                  node for ETH and USDC — and credits your account only when the chain confirms it.
                </li>
                <li>
                  Crypto payments buy the same countersignature, credits and listings as card checkout.
                  Sealing and public verification stay free and unmetered, forever.
                </li>
                <li>
                  We do not offer refunds in crypto automatically; contact us with your invoice reference
                  and transaction ID.
                </li>
              </ul>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CryptoCheckout;
