/**
 * R11 authenticity tests — added 17 Oct 2026 with v1.3.0.
 *
 * These exist because v1.2.0 and earlier had NO signature test at all, and the
 * verifier therefore reported a forged seal as a pass. The controlling test is
 * "a forged seal that recomputes seal_hash is still rejected": it is the exact
 * attack the old code accepted, because the old code only compared hashes.
 *
 * Run: npm test  (node --test, zero dependencies beyond the package source)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PSI_SCHEMA_ID,
  PSI_VERIFIER_VERSION,
  jcs,
  psiLeaf,
  psiSchemaDigest,
  psiSealHash,
  psiVerifySignature,
  psiVerifyBinding,
  verifySeal,
  verify,
  formatAcceptance,
  PsiSealInvalidError,
  type PsiSealEnvelope,
} from "../src/index.ts";

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s: string | Uint8Array) => {
  const bytes = typeof s === "string" ? new TextEncoder().encode(s) : s;
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer)));
};

/** A key pair standing in for the licensed sealing engine. */
async function makeSigner() {
  const kp = (await crypto.subtle.generateKey("ED25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  return { kp, publicKey: hex(raw) };
}

/** Build a genuinely sealed, genuinely signed envelope. */
async function seal(content: string, privateKey: CryptoKey): Promise<PsiSealEnvelope> {
  const env: PsiSealEnvelope = {
    schema: PSI_SCHEMA_ID,
    schema_digest: await psiSchemaDigest(),
    sealed_at: "2026-10-17T20:55:00.000Z",
    subject: { name: "quarterly-report.pdf", size_bytes: new TextEncoder().encode(content).length },
    hash: await sha(content),
    merkle: { leaf: await psiLeaf(await sha(content)) },
  };
  const sealHash = await psiSealHash(env);
  const sig = new Uint8Array(await crypto.subtle.sign("ED25519", privateKey, new TextEncoder().encode(sealHash) as unknown as ArrayBuffer));
  env.signature = { alg: "Ed25519", value: hex(sig), seal_hash: sealHash };
  return env;
}

test("v1.3.0: a genuine seal verifies, and the key that verified is named", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("the real report", kp.privateKey);
  const r = await verifySeal(env, { trustRoots: [{ public_key: publicKey, key_id: "apex-psi-2026" }] });
  assert.equal(r.conformant, true, `expected conformant, got: ${r.failures.join(" | ")}`);
  assert.equal(r.signature_status, "verified");
  assert.equal(r.authentic, true);
  assert.equal(r.trusted_key_id, "apex-psi-2026");
  assert.match(formatAcceptance(r.signature_status, r.trusted_key_id), /ACCEPT: conformant seal; Ed25519 signature verified against apex-psi-2026/);
});

test("THE FORGERY TEST: attacker keeps a valid signature shape and recomputes seal_hash over doctored content", async () => {
  const { kp, publicKey } = await makeSigner();
  const honest = await seal("revenue was 12,000 AUD", kp.privateKey);
  // The attacker edits the envelope and recomputes every hash, exactly as the
  // old verifier required — and signs nothing, because he has no key.
  const forged: PsiSealEnvelope = structuredClone(honest);
  forged.subject = { name: "revenue-ledger.csv", size_bytes: 999 };
  const newHash = await sha("revenue was 999,000,000 AUD");
  forged.hash = newHash;
  forged.merkle = { leaf: await psiLeaf(newHash) };
  forged.signature = { alg: "Ed25519", value: honest.signature!.value, seal_hash: await psiSealHash(forged) };

  const r = await verifySeal(forged, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(r.conformant, false, "a forged seal MUST NOT pass");
  assert.equal(r.signature_status, "invalid");
  assert.equal(r.authentic, false);
  assert.match(r.failures.join("\n"), new RegExp(`rule 11\\.3`));
});

test("garbage signature value is rejected, not accepted", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  env.signature = { ...env.signature!, value: "not-a-signature-at-all" };
  const r = await verifySeal(env, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(r.conformant, false);
  assert.equal(r.signature_status, "invalid");
});

test("EMPTY signature.value — what our own generator emitted until tonight — is rejected", async () => {
  const { publicKey } = await makeSigner();
  const env: PsiSealEnvelope = {
    schema: PSI_SCHEMA_ID,
    schema_digest: await psiSchemaDigest(),
    sealed_at: "2026-10-17T20:55:00.000Z",
    subject: { name: "a.txt", size_bytes: 1 },
    hash: await sha("a"),
    merkle: { leaf: await psiLeaf(await sha("a")) },
    signature: { alg: "Ed25519", value: "", seal_hash: "0".repeat(64) },
  };
  const r = await verifySeal(env, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(r.conformant, false);
  assert.match(r.failures.join("\n"), /no key signed this seal/);
});

test("no trust root supplied => unverifiable, and it is never a pass", async () => {
  const { kp } = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  const r = await verifySeal(env);
  assert.equal(r.signature_status, "unverifiable");
  assert.equal(r.authentic, false);
  assert.equal(r.conformant, false, "strict default: an unchecked signature is not a pass");
  assert.match(r.failures.join("\n"), /no trust root supplied/);
  assert.match(formatAcceptance(r.signature_status), /PARTIAL/);
});

test("wrong public key in the trust root => invalid (the key did not sign it)", async () => {
  const { kp } = await makeSigner();
  const stranger = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  const r = await verifySeal(env, { trustRoots: [{ public_key: stranger.publicKey }] });
  assert.equal(r.conformant, false);
  assert.equal(r.signature_status, "invalid");
});

test("legacy report-only mode still returns the schema verdict, and says authenticity is absent", async () => {
  const { kp } = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  delete env.signature;
  const r = await verifySeal(env, { requireValidSignature: false });
  assert.equal(r.conformant, true, "v1.2.0 behaviour: schema conformance only");
  assert.equal(r.signature_status, "absent");
  assert.equal(r.authentic, false);
});

test("verify() throws PsiSealInvalidError on a forged seal by default", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  env.subject = { name: "tampered.txt", size_bytes: env.subject.size_bytes + 1 };
  await assert.rejects(() => verify(env, { trustRoots: [{ public_key: publicKey }] }), PsiSealInvalidError);
});

test("psiVerifySignature: alg other than Ed25519 is invalid, and hex/base64 keys both load", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("payload", kp.privateKey);
  const sealHash = env.signature!.seal_hash;

  const es256 = await psiVerifySignature(sealHash, { ...env.signature!, alg: "ES256" }, [{ public_key: publicKey }]);
  assert.equal(es256.status, "invalid");

  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const base64Key = btoa(Array.from(rawPub, (b) => String.fromCharCode(b)).join(""));
  const viaB64 = await psiVerifySignature(sealHash, env.signature, [{ public_key: base64Key, key_id: "b64-root" }]);
  assert.equal(viaB64.status, "verified", `base64 trust root failed: ${viaB64.detail}`);
  assert.equal(viaB64.key_id, "b64-root");
});

test("published hello-psi vectors are reproduced exactly (R5/R9 regression guard)", async () => {
  // v1.3.0 changes the authenticity layer only; the byte maths must not move.
  // These are the numbers published at /hello-psi/vectors.json.
  const cases = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "316f357f59644423979697f64550e5ecb9a25baf1af6bb04f7a5956fc6e71bbf"],
    ["Hello, PSI.", "9b9ca310d75dd7663f788163ba148f4c819f89b5ca12df76a421be5daaf2acf7", "afdb58d3a5dabc3fb37d10ceeb040b5a4279296ac750e69e1814c4adf3377ae3"],
    ['{"model":"example","output":"The seal is the math."}', "2468d16e6ad888291923ae502c622218806a511b21d81e92bdcb3cc1c53fbdf5", "3fed12715625fcd9f744d2990f2dd5567d6bb82a74c7a83aa0312265a88815c8"],
  ] as const;
  for (const [input, hash, leaf] of cases) {
    assert.equal(await sha(input), hash, `R5: SHA-256 over the raw octet stream of ${JSON.stringify(input)}`);
    assert.equal(await psiLeaf(hash), leaf, `R9: PSI1:-separated leaf for ${JSON.stringify(input)}`);
  }
  assert.notEqual(await psiLeaf(cases[0][1]), cases[0][1], "R9: the 'PSI1:' domain separator is applied");

  assert.equal(jcs({ b: 1, a: [2, 1] }), '{"a":[2,1],"b":1}', "R1: RFC 8785 key ordering");
  assert.match(PSI_VERIFIER_VERSION, /^\d+\.\d+\.\d+$/, "the distribution version must be semver");
  const [major, minor] = PSI_VERIFIER_VERSION.split(".").map(Number);
  assert.ok(
    major > 1 || (major === 1 && minor >= 4),
    `R11.6 (named binding) shipped in v1.4.0; this build is ${PSI_VERIFIER_VERSION}`,
  );
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  };
  assert.equal(PSI_VERIFIER_VERSION, pkg.version, "the distribution version must equal the package version");
});



/**
 * R11.6 named binding — added 4 Nov 2026 with v1.4.0.
 *
 * The live ledger signs the Merkle leaf (measured 2026-11-04: 3/3 real
 * receipts open over merkle_leaf_hash, 0/3 over the R10 seal_hash). A
 * verifier that only knows "the ASCII seal_hash" therefore rejects our own
 * published receipts, and a verifier that trusts a DECLARED seal_hash accepts
 * a signature transplanted out of the public ledger. These tests pin the fix:
 * the binding is named, the digest is recomputed, and a record that could
 * mean two things is refused rather than guessed.
 */
test("R11.6 named binding: the digest is named and recomputed, never trusted", async () => {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" } as AlgorithmIdentifier, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publicHex = hex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const digest = async (s: string) =>
    hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
  const sign = async (m: string) =>
    hex(
      new Uint8Array(
        await crypto.subtle.sign(
          { name: "Ed25519" } as AlgorithmIdentifier,
          pair.privateKey,
          new TextEncoder().encode(m),
        ),
      ),
    );

  const commitId = "APEX-TEST-0001";
  const commitHash = await digest("content");
  const leaf = await digest(`${commitId}|${commitHash}`);
  const signature = await sign(leaf);
  const row = {
    commit_id: commitId,
    commit_hash: commitHash,
    merkle_leaf_hash: leaf,
    ed25519_signature: signature,
  };
  const trust = [{ public_key: publicHex, key_id: "unit-key" }];

  const good = await psiVerifyBinding(row, trust);
  assert.equal(good.status, "verified", "a ledger row must verify against the key that signed its leaf");
  assert.equal(good.binding, "merkle_leaf");
  assert.equal(good.digest, leaf, "the bound digest must be the recomputed one");

  const hash = await digest("abc");
  const envelope = {
    schema: PSI_SCHEMA_ID,
    schema_digest: await psiSchemaDigest(),
    sealed_at: "2026-10-17T20:55:00.000Z",
    subject: { name: "a.csv", size_bytes: 3 },
    hash,
    merkle: { leaf: await psiLeaf(hash) },
    signature: { alg: "Ed25519", value: signature, seal_hash: leaf },
  };
  const transplanted = await psiVerifyBinding(envelope, trust);
  assert.notEqual(transplanted.status, "verified", "a ledger signature must not authenticate an envelope");

  const ambiguous = await psiVerifyBinding({ ...envelope, commit_id: commitId, commit_hash: commitHash }, trust);
  assert.equal(ambiguous.status, "invalid", "a record that could mean two bindings must be refused");
  assert.equal(ambiguous.rule, "11.7");

  const unknown = await psiVerifyBinding(
    { ...envelope, signature: { ...envelope.signature, binds: "banana" } },
    trust,
  );
  assert.equal(unknown.status, "invalid");
  assert.equal(unknown.rule, "11.6");

  const orphan = await psiVerifyBinding(row, []);
  assert.equal(orphan.status, "unverifiable", "no trust root is never a pass");
});

// ── R11.7 THE POST-QUANTUM FORGERY (added v1.5.0) ────────────────────────
//
// WHY THIS TEST EXISTS. Measured 7 Nov 2026 against the PUBLISHED verifier
// (npm apex-psi-verifier 1.3.0 and PyPI psi-verifier 1.3.0) and against the
// 1.4.0 source that was on origin/main the same day:
//
//   a seal with a GENUINE Ed25519 signature and a fabricated post-quantum
//   claim — pq_alg "ML-DSA-65", pq_value 512 bytes of random noise —
//   came back from all three as:
//
//     conformant       true
//     signature_status verified
//     authentic        true
//     failures         []
//
// The post-quantum half was read and never checked. A seal could therefore
// CLAIM post-quantum protection and be blessed for it. The rule R11.7 adds
// closes that: a declared post-quantum signature must itself be verified.

test("R11.7 THE FORGERY: a seal that CLAIMS a post-quantum signature nobody checked is not verified", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("the payload is genuine", kp.privateKey);

  // 512 bytes of noise, wearing the label of a NIST FIPS 204 signature.
  const noise = new Uint8Array(512);
  crypto.getRandomValues(noise);
  env.signature = {
    ...env.signature,
    pq_alg: "ML-DSA-65",
    pq_value: hex(noise),
  } as PsiSealEnvelope["signature"];

  // The control: the identical seal with no post-quantum claim passes.
  const control = { ...env, signature: { alg: "Ed25519", value: env.signature!.value, seal_hash: env.signature!.seal_hash } };
  const controlResult = await verifySeal(control, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(controlResult.conformant, true, "the control seal is genuine and must still pass");
  assert.equal(controlResult.post_quantum_status, "absent");

  // The forgery: no checker for ML-DSA-65 was supplied, so the declared
  // signature cannot be checked, so the seal cannot be called verified.
  const forged = await verifySeal(env, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(forged.conformant, false, "a declared post-quantum signature nobody checked must fail the seal");
  assert.equal(forged.signature_status, "unverifiable");
  assert.equal(forged.authentic, false);
  assert.equal(forged.post_quantum_status, "unverifiable");
  assert.match(forged.post_quantum_detail ?? "", /ML-DSA-65/);
  assert.ok(
    forged.failures.some((f) => f.includes("rule 11.11")),
    `the rejection must cite the post-quantum rule, got: ${JSON.stringify(forged.failures)}`,
  );

  // A checker that says no makes it invalid, not merely unverifiable.
  const refused = await verifySeal(env, {
    trustRoots: [{ public_key: publicKey }],
    postQuantum: [{ alg: "ML-DSA-65", public_key: "00".repeat(1952), verify: () => false }],
  });
  assert.equal(refused.signature_status, "invalid");
  assert.equal(refused.post_quantum_status, "invalid");
  assert.ok(refused.failures.some((f) => f.includes("rule 11.12")));

  // A checker that throws is a check that could not run: unverifiable.
  const threw = await verifySeal(env, {
    trustRoots: [{ public_key: publicKey }],
    postQuantum: [{ alg: "ML-DSA-65", verify: () => { throw new Error("no primitive here"); } }],
  });
  assert.equal(threw.signature_status, "unverifiable");
  assert.equal(threw.post_quantum_status, "unverifiable");

  // A checker that says yes verifies the claim, and the seal passes.
  const accepted = await verifySeal(env, {
    trustRoots: [{ public_key: publicKey }],
    postQuantum: [{ alg: "ML-DSA-65", public_key: "00".repeat(1952), verify: () => true }],
  });
  assert.equal(accepted.conformant, true, "a seal whose post-quantum half was checked and passed is conformant");
  assert.equal(accepted.post_quantum_status, "verified");
});

test("R11.7: a seal that declares pq_alg but carries no pq_value is invalid, not unverifiable", async () => {
  const { kp, publicKey } = await makeSigner();
  const env = await seal("half a claim", kp.privateKey);
  env.signature = { ...env.signature, pq_alg: "ML-DSA-65", pq_value: "" } as PsiSealEnvelope["signature"];
  const result = await verifySeal(env, { trustRoots: [{ public_key: publicKey }] });
  assert.equal(result.conformant, false);
  assert.equal(result.post_quantum_status, "invalid");
  assert.ok(result.failures.some((f) => f.includes("rule 11.13")));
});
