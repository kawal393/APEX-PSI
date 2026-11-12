#!/usr/bin/env node
// Usage: npx apex-psi-verifier inspect <incident-bundle.json>
import { readFileSync } from "node:fs";
import { verifyIncidentBundle } from "./incident.ts";

// No top-level await: this file compiles to CommonJS as well as ESM, and an await at
// module scope has no legal CJS emission.
async function main(): Promise<number> {
  const [cmd, file] = process.argv.slice(2);
  if (cmd !== "inspect" || !file) {
    console.error("usage: apex-psi-verifier inspect <incident-bundle.json>");
    return 2;
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`FAIL  cannot read JSON: ${(e as Error).message}`);
    return 1;
  }
  const r = await verifyIncidentBundle(data);
  if (r.valid) {
    console.log(`PASS  ${r.count} entries, chain intact, head ${r.head}`);
    console.log("      Integrity only: authorship and time are not proven unless the head was sealed by a notary.");
    return 0;
  }
  console.log("FAIL  incident bundle rejected");
  for (const e of r.errors) console.log(`      - ${e}`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`FAIL  ${(e as Error).message}`);
    process.exit(1);
  });
