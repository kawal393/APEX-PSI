import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyIncidentBundle } from "../src/incident.ts";

// Fixture produced by the Python FlightRecorder: proves cross-language parity.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/incident-bundle.json", import.meta.url), "utf8"));
const clone = () => structuredClone(fixture);

test("genuine Python-recorded bundle passes", async () => {
  assert.equal((await verifyIncidentBundle(fixture)).valid, true);
});
test("edited payload fingerprint fails", async () => {
  const b = clone(); b.entries[1].payload_sha256 = "f".repeat(64);
  assert.equal((await verifyIncidentBundle(b)).valid, false);
});
test("reordered entries fail", async () => {
  const b = clone(); [b.entries[0], b.entries[1]] = [b.entries[1], b.entries[0]];
  assert.equal((await verifyIncidentBundle(b)).valid, false);
});
test("truncated tail fails", async () => {
  const b = clone(); b.entries.pop(); b.count = b.entries.length;
  assert.equal((await verifyIncidentBundle(b)).valid, false);
});
test("deleted middle entry fails", async () => {
  const b = clone(); b.entries.splice(1, 1); b.count = b.entries.length;
  assert.equal((await verifyIncidentBundle(b)).valid, false);
});
test("re-hashed forgery of one entry still breaks the next link", async () => {
  const b = clone(); b.entries[0].kind = "forged";
  const r = await verifyIncidentBundle(b);
  assert.equal(r.valid, false);
});
test("wrong format and empty bundles fail", async () => {
  assert.equal((await verifyIncidentBundle({ format: "x" })).valid, false);
  assert.equal((await verifyIncidentBundle({ format: "APEX-INCIDENT/1", entries: [] })).valid, false);
  assert.equal((await verifyIncidentBundle(null)).valid, false);
});
