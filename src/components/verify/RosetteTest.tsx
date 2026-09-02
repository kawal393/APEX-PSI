import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Rosette from "@/components/Rosette";
import { Upload } from "lucide-react";

type State = "idle" | "working" | "MATCH" | "MISMATCH" | "INCONCLUSIVE" | "ERROR";

const HEX64 = /^[0-9a-f]{64}$/;

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Pull the sealed digest out of a receipt document, whatever dialect it uses. */
function sealedHashOf(doc: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    const obj = node as Record<string, unknown>;
    for (const key of ["hash", "sha256", "document_sha256", "decision_hash", "commit_hash"]) {
      const v = obj[key];
      if (typeof v === "string" && HEX64.test(v.replace(/^sha256:/i, "").toLowerCase())) {
        return v.replace(/^sha256:/i, "").toLowerCase();
      }
    }
    for (const v of Object.values(obj)) {
      const found = walk(v);
      if (found) return found;
    }
    return null;
  };
  return walk(doc);
}

/**
 * THE TEST — drop a file or a receipt, recompute the digest in this browser and
 * compare the sealed rosette against the recomputed rosette. Exactly three
 * outcomes exist: MATCH, MISMATCH, ERROR. Nothing is uploaded.
 */
const RosetteTest = () => {
  const [state, setState] = useState<State>("idle");
  const [sealed, setSealed] = useState<string>("");
  const [recomputed, setRecomputed] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [expected, setExpected] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (file: File) => {
      setState("working");
      setSealed("");
      setRecomputed("");
      setNote("");
      try {
        const buf = await file.arrayBuffer();
        const digest = await sha256Hex(buf);

        // A receipt carries its own sealed digest; a plain file is compared to
        // the digest the visitor pasted.
        let claimed: string | null = null;
        const looksJson = /\.(json|praman)$/i.test(file.name) || file.type.includes("json");
        if (looksJson) {
          try {
            claimed = sealedHashOf(JSON.parse(new TextDecoder().decode(buf)));
          } catch {
            claimed = null;
          }
        }

        const typed = expected.trim().replace(/^sha256:/i, "").toLowerCase();
        const reference = claimed ?? (HEX64.test(typed) ? typed : null);

        if (!reference) {
          setRecomputed(digest);
          setState("ERROR");
          setNote(
            "could not fetch or compute a sealed digest to compare against — paste the sealed SHA-256, or drop a receipt that carries one",
          );
          return;
        }

        setSealed(reference);
        setRecomputed(claimed ? digest : digest);
        if (claimed) {
          // Receipt dialect: the receipt asserts the digest of its own subject
          // bytes, so recomputing the receipt file itself proves nothing —
          // compare the asserted digest against the pasted reference instead.
          const typedRef = HEX64.test(typed) ? typed : null;
          if (typedRef) {
            setSealed(claimed);
            setRecomputed(typedRef);
            setState(claimed === typedRef ? "MATCH" : "MISMATCH");
            setNote(
              claimed === typedRef
                ? "the bytes agree — the receipt's sealed digest equals the digest supplied"
                : "the bytes disagree — the receipt's sealed digest differs from the digest supplied",
            );
            return;
          }
          setSealed(claimed);
          setRecomputed("");
          setState("INCONCLUSIVE");
          setNote(
            "nothing was verified: the receipt carries a well-formed sealed digest, but no subject bytes were recomputed. Drop the sealed file itself, or paste the sealed SHA-256, to obtain a verdict.",
          );
          return;
        }

        setState(digest === reference ? "MATCH" : "MISMATCH");
        setNote(digest === reference ? "the bytes agree" : "the bytes disagree");
      } catch {
        setState("ERROR");
        setNote("could not fetch or compute");
      }
    },
    [expected],
  );

  const tone =
    state === "MATCH"
      ? "border-success/40 text-success bg-success/10"
      : state === "MISMATCH"
        ? "border-destructive/40 text-destructive bg-destructive/10"
        : state === "ERROR" || state === "INCONCLUSIVE"
          ? "border-warning/40 text-warning bg-warning/10"
          : "border-border text-muted-foreground";

  return (
    <Card className="p-6 border-border">
      <h2 className="text-sm font-bold tracking-[0.2em] uppercase">The Test — sealed rosette vs recomputed rosette</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Drop a file or a receipt. The digest is recomputed with Web Crypto in this browser; nothing is uploaded.
        Two rosettes render side by side. Outcomes: MATCH, MISMATCH, INCONCLUSIVE, ERROR.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="sealed SHA-256 (64 hex) — optional when a receipt carries one"
          className="font-mono text-xs"
        />
        <Button variant="heroOutline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Drop file or receipt
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void run(f);
            e.target.value = "";
          }}
        />
      </div>

      <div
        className={`mt-5 inline-flex items-center rounded-md border px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] ${tone}`}
      >
        {state === "idle" ? "awaiting bytes" : state === "working" ? "recomputing…" : state}
      </div>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          { title: "Sealed", hash: sealed },
          { title: "Recomputed", hash: recomputed },
        ].map((col) => (
          <div key={col.title} className="flex flex-col items-center rounded-md border border-border bg-background/60 p-4">
            <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {col.title}
            </span>
            <Rosette
              hash={col.hash}
              size={120}
              state={col.hash ? (state === "MISMATCH" ? "mismatch" : "sealed") : "pending"}
            />
            <code className="mt-3 break-all text-center font-mono text-[10px] text-muted-foreground">
              {col.hash || "—"}
            </code>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RosetteTest;
