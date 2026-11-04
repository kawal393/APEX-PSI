import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  classifyLedger,
  describeMerkle,
  leafHashOf,
  rfc9162Head,
  type MirrorRow,
} from "../../../supabase/functions/_shared/merkle_profile.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const fixture = JSON.parse(
  readFileSync(join(here, "fixtures", "live-ledger-rows-40.json"), "utf8"),
) as { rows: MirrorRow[] };

const liveRows: MirrorRow[] = fixture.rows.map((r) => ({
  ...r,
  action: r.action_prefix,
}));

test("every measured live row is classified, and none falls through", () => {
  const counts = new Map<string, number>();
  for (const row of liveRows) {
    const d = describeMerkle(row);
    counts.set(d.merkle_profile, (counts.get(d.merkle_profile) ?? 0) + 1);
    assert.notEqual(
      d.merkle_profile,
      "PSI-UNK",
      `row ${row.sequence_number} (${row.phase} ${row.action}) was not classified`,
    );
  }
  assert.equal(counts.get("PSI-W1"), 11);
  assert.equal(counts.get("PSI-B1"), 4);
  assert.equal(counts.get("PSI-C1"), 25);
});

test("a commit row is never promoted to a notarised window head by its own action text", () => {
  // The action of a commit-action row is attacker-supplied. A row that tries
  // to look notarised must still be classified by its phase.
  const forged = describeMerkle({
    phase: "COMMITTED",
    action: "NOTARIZE: sha256:0000000000000000",
    created_at: "2026-11-04T00:00:00.000000+00:00",
    merkle_root: "a".repeat(64),
  });
  assert.equal(forged.merkle_profile, "PSI-C1");
  assert.equal(forged.merkle_reproducible, false);
});

test("a window head that was recomputed over the published leaves is reported as such", () => {
  const leaf = "b".repeat(64);
  const leafHash = leafHashOf(leaf);
  const rows: MirrorRow[] = [];
  for (let i = 0; i < 300; i++) {
    rows.push({
      sequence_number: i + 1,
      phase: "COMMITTED",
      action: `commit ${i}`,
      created_at: "2026-11-04T00:00:00.000000+00:00",
      merkle_leaf_hash: leaf,
      merkle_root: "c".repeat(64),
    });
  }
  // Give the last row a genuine rolling-window head over the 256 leaves that
  // end at it, exactly as the notary and the fixed commit path write it.
  const leaves = rows.map((r) => leafHashOf(String(r.merkle_leaf_hash)));
  const window = rfc9162Head(leaves.slice(leaves.length - 256));
  rows[rows.length - 1].merkle_root = window;

  const classified = classifyLedger(rows, { fromLedgerStart: true });
  const last = classified[classified.length - 1];
  assert.equal(last.merkle_profile, "PSI-W1");
  assert.equal(last.merkle_root_kind, "window_head");
  assert.equal(last.merkle_reproducible, true);

  // Every earlier row in the run still carries the old salted digest.
  assert.equal(classified[0].merkle_profile, "PSI-C1");
  assert.equal(classified[0].merkle_reproducible, false);
});

test("the published protocol document states the measured distribution and drops the false claims", () => {
  const doc = JSON.parse(
    readFileSync(join(repoRoot, "public", ".well-known", "apex-protocol.json"), "utf8"),
  ) as Record<string, any>;

  assert.match(String(doc.canonicalization), /Not RFC 8785/);

  assert.equal(doc.signature_binding?.rule, "R11.6");
  assert.match(String(doc.signature_binding?.statement), /recomputes that digest/);

  const profiles = doc.merkle_profile?.profiles ?? {};
  for (const p of ["PSI-W1", "PSI-B1", "PSI-C1", "PSI-P1"]) {
    assert.ok(profiles[p], `document is missing profile ${p}`);
  }

  // The document's correction must quote the numbers the live rows produce.
  const counts = new Map<string, number>();
  for (const row of liveRows) {
    const p = describeMerkle(row).merkle_profile;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const correction = String(doc.merkle_profile?.correction ?? "");
  assert.match(correction, new RegExp(`${counts.get("PSI-W1")} were PSI-W1`));
  assert.match(correction, new RegExp(`${counts.get("PSI-B1")} were PSI-B1`));
  assert.match(correction, new RegExp(`${counts.get("PSI-C1")} were PSI-C1`));
});
