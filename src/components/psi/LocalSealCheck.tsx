// APEX PSI — LOCAL SEAL CHECK (added 17 Oct 2026 with verifier v1.3.0)
//
// The public checker that does not ask us anything. A visitor pastes a seal,
// this component recomputes the digests and verifies the Ed25519 signature
// with the browser's own crypto, against public keys read from the static
// /.well-known trust anchor. Our server is never consulted for the verdict, so
// the referee cannot grade its own homework.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ShieldAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAcceptance, formatRejection } from "../../../packages/psi-verifier/src/index";
import { psiSchemaDigest, verifySealConformance } from "@/lib/psi-schema";
import {
  loadSealTrustRoots,
  trustRootFromMaterial,
  sealSignerDescription,
  type SealTrustKey,
} from "@/lib/psi-trust-roots";

type Verdict = Awaited<ReturnType<typeof verifySealConformance>>;

interface Props {
  /** Pre-filled envelope JSON, e.g. from a receipt link. */
  initial?: string;
  /** Show the trust-anchor key table. On by default; receipts embed it already. */
  showKeys?: boolean;
}

const PLAIN_ENGLISH: Record<string, string> = {
  verified: "A public key we published signed this seal, over exactly these bytes.",
  invalid: "The signature here does not match any key we published. Either a different key signed it, or the bytes were changed after signing.",
  absent: "This seal carries no signature at all, so nothing binds it to anyone. The format is fine; the provenance is empty.",
  unverifiable: "There is a signature, but no key was available to check it against, so no claim about authenticity is being made.",
};

const LocalSealCheck = ({ initial = "", showKeys = true }: Props) => {
  const { t } = useTranslation();
  const [raw, setRaw] = useState(initial);
  const [keys, setKeys] = useState<SealTrustKey[]>([]);
  const [keySource, setKeySource] = useState("loading the published trust anchor…");
  const [extraKey, setExtraKey] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [printed, setPrinted] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const extraRoot = useMemo(() => trustRootFromMaterial(extraKey, "visitor-supplied-key"), [extraKey]);

  useEffect(() => {
    let cancelled = false;
    loadSealTrustRoots()
      .then((loaded) => {
        if (cancelled) return;
        setKeys(loaded.keys);
        setKeySource(loaded.source);
      })
      .catch(() => {
        if (!cancelled) setKeySource("trust anchor unavailable — using the built-in copy of the published keys");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const check = async () => {
    setParseError(null);
    setVerdict(null);
    setPrinted("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setParseError(`That is not valid JSON: ${(e as Error).message}`);
      return;
    }
    setBusy(true);
    try {
      const roots = extraRoot ? [...keys.map((k) => ({ public_key: k.public_key, key_id: k.kid })), extraRoot] : keys.map((k) => ({ public_key: k.public_key, key_id: k.kid }));
      const result = await verifySealConformance(parsed, { trustRoots: roots });
      const canonical = await psiSchemaDigest();
      setVerdict(result);
      setPrinted(
        result.conformant
          ? formatAcceptance(result.signature_status, result.trusted_key_id)
          : formatRejection(result, canonical),
      );
    } catch (e) {
      setParseError(`The check itself failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const headline = (result: Verdict): { label: string; tone: string; icon: typeof CheckCircle2 } => {
    if (result.conformant && result.authentic) return { label: result.trusted_key_id === "visitor-supplied-key" ? t("localSeal.visitorSigned", "SIGNED BY YOUR SUPPLIED KEY") : t("localSeal.signed", "CONFORMANT AND SIGNED"), tone: "text-compliant", icon: CheckCircle2 };
    if (result.conformant) return { label: "CONFORMANT, BUT NOT AUTHENTICATED", tone: "text-gold", icon: ShieldAlert };
    return { label: "REJECTED", tone: "text-destructive", icon: XCircle };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Paste a PSI seal envelope. Every digest below is recomputed in this browser tab and the signature is checked with
        the browser&apos;s own Ed25519. Nothing is sent to us, and the verdict does not depend on us being reachable.
      </p>

      <textarea
        aria-label={t("localSeal.envelope", "PSI seal envelope")}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        placeholder='{ "schema": "PSI-SEAL/1.0.0", "schema_digest": "…", "sealed_at": "…", "subject": { … }, "hash": "…", "merkle": { … }, "signature": { … } }'
        className="w-full h-48 rounded-lg border border-border bg-background/60 p-4 font-mono text-[11px] text-foreground focus:outline-none focus:border-gold/60"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="hero" onClick={check} disabled={!raw.trim() || busy}>
          {busy ? "Checking…" : "Check this seal here"}
        </Button>
        {parseError && <p role="alert" className="text-xs font-mono text-destructive">{parseError}</p>}
      </div>

      {showKeys && (
        <details className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <summary className="cursor-pointer text-xs font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2">
            <KeyRound className="h-3 w-3" /> keys this page will trust ({keys.length})
          </summary>
          <p className="mt-2 text-[11px] font-mono text-muted-foreground break-all">source: {keySource}</p>
          <ul className="mt-2 space-y-2">
            {keys.map((k) => (
              <li key={k.kid} className="text-[11px] font-mono text-muted-foreground">
                <span className="text-foreground">{k.kid}</span> · {k.algorithm} · {k.public_key.slice(0, 16)}…
                <span className="block text-muted-foreground/80">signs: {k.signs || "not stated"}</span>
              </li>
            ))}
          </ul>
          <label className="mt-3 block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            add a public key you trust (64 hex or base64)
          </label>
          <input
            aria-label={t("localSeal.publicKey", "Public key you trust")}
            value={extraKey}
            onChange={(e) => setExtraKey(e.target.value)}
            spellCheck={false}
            placeholder="your own key is added to the candidate set, never replaces it"
            className="mt-1 w-full rounded border border-border bg-background/60 px-3 py-2 font-mono text-[11px] focus:outline-none focus:border-gold/60"
          />
          {extraKey.trim() !== "" && (
            <p className="mt-1 text-[11px] font-mono text-muted-foreground">
              {extraRoot ? `loaded: ${extraRoot.public_key.slice(0, 16)}…` : "not a 32-byte Ed25519 key in hex or base64 — ignored"}
            </p>
          )}
        </details>
      )}

      {verdict && (
        <div
          className={`rounded-lg border px-5 py-4 ${
            verdict.conformant && verdict.authentic
              ? "border-compliant/40 bg-compliant/5"
              : verdict.conformant
                ? "border-gold/40 bg-gold/5"
                : "border-border bg-card/40"
          }`}
        >
          {(() => {
            const h = headline(verdict);
            const Icon = h.icon;
            return (
              <p role="status" className={`flex items-center gap-2 text-lg font-black uppercase ${h.tone}`}>
                <Icon className="h-5 w-5" /> {h.label}
              </p>
            );
          })()}
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
            {verdict.signature_status === "verified" ? t(verdict.trusted_key_id === "visitor-supplied-key" ? "localSeal.visitorDescription" : "localSeal.pinnedDescription", { defaultValue: sealSignerDescription(verdict.trusted_key_id) }) : PLAIN_ENGLISH[verdict.signature_status] ?? `Authenticity: ${verdict.signature_status}.`}
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            schema {verdict.schema_id ?? "—"} · digest match {String(verdict.schema_digest_match)} · seal_hash match{" "}
            {String(verdict.seal_hash_match)} · signature {verdict.signature_status}
            {verdict.trusted_key_id ? ` · key ${verdict.trusted_key_id}` : ""}
          </p>
          {verdict.failures.length > 0 && (
            <ul className="mt-3 space-y-1">
              {verdict.failures.map((f) => (
                <li key={f} className="font-mono text-[11px] text-destructive/90 break-all">
                  {f}
                </li>
              ))}
            </ul>
          )}
          {printed && (
            <pre className="mt-4 rounded border border-border bg-background/60 p-3 font-mono text-[10px] whitespace-pre-wrap break-all text-muted-foreground">
              {printed}
            </pre>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            A pass here means these bytes recompute and a listed key signed them. It has never meant that any statement
            inside the seal is true — a seal proves that a claim was made, not that the claim is right.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocalSealCheck;
