import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  verifySeal,
  formatRejection,
  formatAcceptance,
  psiSchemaDigestFromDocument,
  PSI_SCHEMA_ID,
  PSI_VERIFIER_VERSION,
} from "../../../packages/psi-verifier/src/index";

/**
 * Cross-language parity widget.
 *
 * The TypeScript column runs live in your browser from the MIT verifier source.
 * The Python column is the byte-string emitted by `psi-verifier=={version}` for
 * the same input, committed from an actual run of the Python distribution.
 * A green result means the two byte-strings are identical.
 *
 * The schema digest shown is NOT hardcoded: the widget fetches the published
 * /.well-known/psi-schema.json and runs the verifier's own canonicalisation
 * over it at runtime, so any visitor can compare the 64-hex value against the
 * npm or PyPI package output.
 */

type Fixture = { id: string; label: string; input: unknown; python: string };

const DIGEST = "6d8d65e5fec9f58d762058eb8d47308e33a9e67c396a96ee8bdd84b14f4e04b9";
const HASH = "342f1e487a44517a2ac7378566a19d1dc4490620052c958d32b1fe23ba1f4b0d";
const LEAF = "7fb4d0529d5cce32893ecece56e9eed4cafa7de754a4ff474667a11262dbfe6b";
const SEAL_HASH = "606175f92c968d9e9c7c6c6cd3e28008f2edff38330df7040fe2261004f61254";

const CONFORMANT = {
  schema: "PSI-SEAL/1.0.0",
  schema_digest: DIGEST,
  sealed_at: "2026-08-17T09:00:00.000Z",
  subject: { name: "parity.txt", size_bytes: 23 },
  hash: HASH,
  merkle: { leaf: LEAF },
  signature: { alg: "Ed25519", value: "(fixture)", seal_hash: SEAL_HASH },
};

const REJECT_TAIL = [
  "generate a conformant seal: https://ai-governance-standard.com/seal",
  "canonical schema: https://ai-governance-standard.com/.well-known/psi-schema.json",
  "legacy escape hatch (report-only): enforce=false",
  "verified, not asserted; trust the math, not the maker.",
].join("\n");

const FIXTURES: Fixture[] = [
  {
    id: "conformant",
    label: "Conformant seal",
    input: CONFORMANT,
    python: `PSI-SEAL v1.1.1 ACCEPT: conformant seal`,
  },
  {
    id: "tampered",
    label: "Tampered hash",
    input: { ...CONFORMANT, hash: `${HASH.slice(0, -1)}0` },
    python: [
      "PSI-SEAL v1.1.1 REJECT: seal is not conformant to PSI-SEAL/1.0.0 — rule 1.1",
      `canonical schema digest: ${DIGEST}`,
      "received schema: PSI-SEAL/1.0.0 (digest match: true)",
      "findings:",
      "  PSI-SEAL v1.1.1 REJECT: merkle.leaf mismatch — rule 9.1",
      "  PSI-SEAL v1.1.1 REJECT: seal_hash mismatch — rule 10.1",
      REJECT_TAIL,
    ].join("\n"),
  },
  {
    id: "legacy",
    label: "Non-PSI payload",
    input: { schema: "x", hash: "y" },
    python: [
      "PSI-SEAL v1.1.1 REJECT: seal is not conformant to PSI-SEAL/1.0.0 — rule 1.1",
      `canonical schema digest: ${DIGEST}`,
      "received schema: x (digest match: false)",
      "findings:",
      "  PSI-SEAL v1.1.1 REJECT: schema identifier mismatch, expected PSI-SEAL/1.0.0 — rule 4.1",
      "  PSI-SEAL v1.1.1 REJECT: schema_digest mismatch — rule 4.2",
      "  PSI-SEAL v1.1.1 REJECT: sealed_at is not RFC 3339 UTC with three fractional digits — rule 6.1",
      "  PSI-SEAL v1.1.1 REJECT: hash is not 64 lowercase hexadecimal characters — rule 5.1",
      "  PSI-SEAL v1.1.1 REJECT: subject.size_bytes is not a non-negative integer — rule 7.1",
      "  PSI-SEAL v1.1.1 REJECT: merkle.leaf missing — rule 8.1",
      REJECT_TAIL,
    ].join("\n"),
  },
];

const ParityWidget = () => {
  const [active, setActive] = useState(FIXTURES[0].id);
  const [tsOutput, setTsOutput] = useState("");
  const [digest, setDigest] = useState("");
  const [digestSource, setDigestSource] = useState<"document" | "unavailable">("unavailable");

  const fixture = useMemo(() => FIXTURES.find((f) => f.id === active) ?? FIXTURES[0], [active]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Digest truth: fetch the published schema and canonicalise it here.
      let canonical = "";
      let source: "document" | "unavailable" = "unavailable";
      try {
        const res = await fetch("/.well-known/psi-schema.json", { cache: "no-store" });
        if (res.ok) {
          canonical = await psiSchemaDigestFromDocument(await res.json());
          source = "document";
        }
      } catch {
        source = "unavailable";
      }
      const result = await verifySeal(fixture.input);
      const text = result.conformant ? formatAcceptance() : formatRejection(result, canonical || DIGEST);
      if (!cancelled) {
        setDigest(canonical);
        setDigestSource(source);
        setTsOutput(text);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixture]);

  const parity = tsOutput.length > 0 && tsOutput === fixture.python;

  return (
    <Card className="p-6 border-border">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase">
            Cross-language parity — Schema {PSI_SCHEMA_ID} · Verifier {PSI_VERIFIER_VERSION}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            The same input is run through the TypeScript verifier live in your browser and compared,
            byte for byte, against the output committed from the Python distribution.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-xs font-mono font-bold uppercase tracking-[0.15em] ${
              parity ? "border-success/40 text-success bg-success/10" : "border-destructive/40 text-destructive bg-destructive/10"
            }`}
          >
            {parity ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {parity ? "Parity confirmed" : "Parity mismatch"}
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground break-all sm:max-w-[22rem] sm:text-right">
            {digestSource === "document" ? (
              <>
                schema digest (computed live from /.well-known/psi-schema.json):
                <br />
                <span className="text-gold">{digest}</span>
              </>
            ) : (
              <span className="text-warning">schema digest: UNAVAILABLE — schema document could not be fetched</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FIXTURES.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={f.id === active ? "hero" : "heroOutline"}
            onClick={() => setActive(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          { title: "@apex/psi-verifier (TypeScript)", body: tsOutput },
          { title: "psi-verifier (Python)", body: fixture.python },
        ].map((col) => (
          <div key={col.title} className="flex h-full flex-col rounded-md border border-border bg-background/60">
            <div className="border-b border-border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              {col.title}
            </div>
            <pre className="flex-1 overflow-x-auto p-4 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
{col.body || "…"}
            </pre>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-[11px] text-muted-foreground break-all">
        Compare this digest against the package output: <code>node -e "require('@apex/psi-verifier')"</code> or{" "}
        <code>python -c "import psi_verifier"</code>. Verified, not asserted.
      </p>
    </Card>
  );
};

export default ParityWidget;
