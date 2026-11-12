import { describe, expect, it } from "vitest";
import fixtures from "../../packages/psi-verifier-py/test/cross-language/fixtures.json";
import rawRecordings from "../../packages/psi-verifier-py/test/cross-language/python.txt?raw";
import { verifySeal, formatAcceptance, formatRejection, type VerifySealOptions } from "../../packages/psi-verifier/src/index";

describe("public parity checker uses the real Python signature fixtures", () => {
  // The recordings are Python's own bytes and are not rewritten to suit the JS side, so the
  // comparison normalises line endings on both sides instead. Committed with CRLF on 2026-11-09
  // and every case after the first then split into nothing, which reads as a parity failure and
  // is a file-ending difference.
  const recordings = rawRecordings.replace(/\r\n/g, "\n");
  const blocks = recordings.trimEnd().split("\n\n=====\n\n");
  expect(blocks.length, "python.txt holds fewer recorded blocks than fixtures.json declares").toBeGreaterThanOrEqual(
    fixtures.cases.length,
  );
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