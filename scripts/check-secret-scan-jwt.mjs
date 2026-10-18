// Throwaway check for the secret scanner's new role-aware JWT rule. Synthetic tokens only:
// these are fabricated here, they are not credentials, and they carry a made-up signature.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const header = b64({ alg: "HS256", typ: "JWT" });
const sig = "AAAA-synthetic-not-a-real-signature-AAAAAAAAAAAAAAAA";

const anon = `${header}.${b64({ iss: "supabase", ref: "dummy", role: "anon", iat: 1 })}.${sig}`;
const service = `${header}.${b64({ iss: "supabase", ref: "dummy", role: "service_role", iat: 1 })}.${sig}`;
const scoped = `${header}.${b64({ iss: "supabase", role: "authenticated", scope: "database:service_role" })}.${sig}`;

const dir = ".tmp-secret-scan-check";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const cases = [
  ["anon-allowed.js", `export const K = "${anon}";\n`, 0],
  ["service-role.js", `export const K = "${service}";\n`, 1],
  ["scope-service-role.js", `export const K = "${scoped}";\n`, 1],
];

let failures = 0;
for (const [name, body, expected] of cases) {
  const file = `${dir}/${name}`;
  writeFileSync(file, body);
  let code = 0;
  let out = "";
  try {
    out = execFileSync("node", ["scripts/secret-scan.mjs", file], { encoding: "utf8" });
  } catch (err) {
    code = err.status;
    out = (err.stdout || "") + (err.stderr || "");
  }
  const fired = code === 1;
  const ok = Number(fired) === expected;
  if (!ok) failures += 1;
  // Print only the pattern names, never the token.
  const patterns = [...out.matchAll(/pattern=([a-z0-9-]+)/g)].map((m) => m[1]);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: exit=${code} expected=${expected} patterns=[${patterns.join(",")}]`);
}

rmSync(dir, { recursive: true, force: true });
console.log(failures ? `\n${failures} CASE(S) WRONG` : "\nALL JWT ROLE CASES CORRECT");
process.exit(failures ? 1 : 0);
