import { describe, expect, it } from "vitest";
import fixtures from "../../packages/psi-verifier-py/test/cross-language/fixtures.json";
import recordings from "../../packages/psi-verifier-py/test/cross-language/python.txt?raw";
import { verifySeal, formatAcceptance, formatRejection, type VerifySealOptions } from "../../packages/psi-verifier/src/index";

describe("public parity checker uses the real Python signature fixtures", () => {
  const blocks = recordings.trimEnd().split("\n\n=====\n\n");
  for (const [index, entry] of fixtures.cases.entries()) {
    it(entry.name, async () => {
      const result = await verifySeal(entry.seal, entry.options as VerifySealOptions);
      const output = result.conformant
        ? formatAcceptance(result.signature_status, result.trusted_key_id)
        : formatRejection(result, fixtures.canonical_schema_digest);
      const recorded = blocks[index]?.split("\n").slice(1).join("\n");
      expect(recorded).toBeDefined();
      expect(output).toBe(recorded);
    });
  }
});