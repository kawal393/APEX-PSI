import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildHelloPsiSeal,
  schemaDigestFrom,
  HELLO_PSI_FIELD_ORDER,
  HELLO_PSI_VECTOR_SEALED_AT,
  HELLO_PSI_SUBJECT_NAME,
} from "@/lib/hello-psi";
import { psiSchemaDigest as sitePsiSchemaDigest } from "@/lib/psi-schema";
// The verifier a reader installs. Measured 19 Nov 2026: this suite compared
// the page to the vectors and both carried the same wrong schema_digest, so
// it stayed green while the published verifier refused our own receipt on
// rule 4.2. The comparison that matters is against the verifier.
import {
  psiSchemaDigest as verifierPsiSchemaDigest,
  verifySeal,
} from "../../packages/psi-verifier/src/index";

const root = resolve(__dirname, "../..");
const p = (f: string) => resolve(root, "public/hello-psi", f);

const vectorsFile = JSON.parse(readFileSync(p("vectors.json"), "utf8")) as {
  schema: string;
  verifier: string;
  schema_digest: string;
  sealed_at: string;
  field_order: string[];
  vectors: { id: string; input: string; hash: string; merkle_leaf: string; seal_hash: string }[];
};

const verifierPackage = JSON.parse(
  readFileSync(resolve(root, "packages/psi-verifier/package.json"), "utf8"),
) as { version: string };

const liveSchema = JSON.parse(
  readFileSync(resolve(root, "public/.well-known/psi-schema.json"), "utf8"),
);

describe("Hello PSI — shipped artifacts", () => {
  for (const f of ["hello_psi.py", "hello-psi.js", "vectors.json"]) {
    it(`ships a non-empty public/hello-psi/${f}`, () => {
      expect(existsSync(p(f))).toBe(true);
      expect(readFileSync(p(f), "utf8").trim().length).toBeGreaterThan(0);
    });
  }

  it("declares the normative field order", () => {
    expect(vectorsFile.field_order).toEqual([...HELLO_PSI_FIELD_ORDER]);
    expect(vectorsFile.sealed_at).toBe(HELLO_PSI_VECTOR_SEALED_AT);
  });

  it("pins the same schema_digest as the live schema JSON", async () => {
    expect(await schemaDigestFrom(liveSchema)).toBe(vectorsFile.schema_digest);
  });

  it("carries the schema_digest the verifier itself recomputes", async () => {
    // The rule array is the preimage (specs/psi-seal-1.md, R12). Hashing the
    // document instead produced a digest the verifier refuses, and every
    // receipt a reader copied from /hello-psi was rejected on rule 4.2.
    expect(await verifierPsiSchemaDigest()).toBe(vectorsFile.schema_digest);
    expect(await sitePsiSchemaDigest()).toBe(vectorsFile.schema_digest);
  });

  it("is accepted by the verifier a reader installs", async () => {
    for (const v of vectorsFile.vectors) {
      const { envelope } = await buildHelloPsiSeal({
        text: v.input,
        schemaDigest: vectorsFile.schema_digest,
        sealedAt: HELLO_PSI_VECTOR_SEALED_AT,
        subjectName: HELLO_PSI_SUBJECT_NAME,
      });
      const verdict = await verifySeal(envelope, { requireValidSignature: false });
      expect(verdict.failures, `${v.id}: ${JSON.stringify(verdict.failures)}`).toEqual([]);
      expect(verdict.conformant, v.id).toBe(true);
      // The reference receipt carries no signature by design: it is
      // schema-conformant and it is not authentic, and the verifier says so.
      expect(verdict.signature_status, v.id).toBe("absent");
      expect(verdict.authentic, v.id).toBe(false);
    }
  });

  it("pins the same schema digest inside both reference implementations", () => {
    expect(readFileSync(p("hello_psi.py"), "utf8")).toContain(vectorsFile.schema_digest);
    expect(readFileSync(p("hello-psi.js"), "utf8")).toContain(vectorsFile.schema_digest);
  });

  it("names the verifier release the vectors belong to", () => {
    // 1.2.0 checked no signature at all and is deprecated. A public vector
    // file must name the release whose byte maths these are.
    expect(vectorsFile.verifier).toBe(verifierPackage.version);
  });
});

describe("Hello PSI — cross-language digest parity", () => {
  it("has exactly three vectors", () => {
    expect(vectorsFile.vectors.map((v) => v.id)).toEqual(["VECTOR 0", "VECTOR 1", "VECTOR 2"]);
  });

  for (const v of vectorsFile.vectors) {
    it(`${v.id} reproduces the shipped digests`, async () => {
      const { envelope, seal_hash } = await buildHelloPsiSeal({
        text: v.input,
        schemaDigest: vectorsFile.schema_digest,
        sealedAt: HELLO_PSI_VECTOR_SEALED_AT,
        subjectName: HELLO_PSI_SUBJECT_NAME,
      });
      expect(envelope.hash).toBe(v.hash);
      expect(envelope.merkle.leaf).toBe(v.merkle_leaf);
      expect(seal_hash).toBe(v.seal_hash);
      expect(Object.keys(envelope)).toEqual([...HELLO_PSI_FIELD_ORDER]);
    });
  }
});
