#!/usr/bin/env node
// Usage: npx apex-psi-verifier inspect <incident-bundle.json>
import { readFileSync } from "node:fs";
import { verifyIncidentBundle } from "./incident.ts";

const [cmd, file] = process.argv.slice(2);
if (cmd !== "inspect" || !file) {
  console.error("usage: apex-psi-verifier inspect <incident-bundle.json>");
  process.exit(2);
}
let data: unknown;
try { data = JSON.parse(readFileSync(file, "utf8")); } catch (e) {
  console.error(`FAIL  cannot read JSON: ${(e as Error).message}`); process.exit(1);
}
const r = await verifyIncidentBundle(data);
if (r.valid) {
  console.log(`PASS  ${r.count} entries, chain intact, head ${r.head}`);
  console.log("      Integrity only: authorship and time are not proven unless the head was sealed by a notary.");
  process.exit(0);
}
console.log("FAIL  incident bundle rejected");
for (const e of r.errors) console.log(`      - ${e}`);
process.exit(1);
