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

const root = resolve(__dirname, "../..");
const p = (f: string) => resolve(root, "public/hello-psi", f);

const vectorsFile = JSON.parse(readFileSync(p("vectors.json"), "utf8")) as {
  schema_digest: string;
  sealed_at: string;
  field_order: string[];
  vectors: { id: string; input: string; hash: string; merkle_leaf: string; seal_hash: string }[];
};

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

  it("pins the same schema digest inside both reference implementations", () => {
    expect(readFileSync(p("hello_psi.py"), "utf8")).toContain(vectorsFile.schema_digest);
    expect(readFileSync(p("hello-psi.js"), "utf8")).toContain(vectorsFile.schema_digest);
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
