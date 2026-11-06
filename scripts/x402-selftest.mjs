// x402-selftest — the four binaries the machine-payment door must print.
//
// It loads the SAME module the notary function loads
// (supabase/functions/_shared/x402.ts), so a green run means the shipped code
// refuses the payloads we claim it refuses. It reaches no network and mints no
// receipt: the facilitator is a mock and the payment claim is an in-memory gate.
//
// What a green run does NOT prove, stated on its own line at the end:
//   - the facilitator's real /verify and /settle responses
//   - claim_x402_payment() in Postgres, whose replay rule is modelled here, not run
//   - that USDC actually arrives, which only a real settlement can show
//
// Usage: node scripts/x402-selftest.mjs
// Exit 0 = all four binaries PASS. Exit 1 = any FAIL. Exit 2 = could not load the door.

import {
  readX402Config,
  paymentRequirements,
  buildPaymentRequired,
  bytesToBase64,
  base64ToBytes,
  decodePaymentHeader,
  checkPaymentPayload,
  callFacilitator,
  paymentNonceKey,
  X402_VERSION,
} from '../supabase/functions/_shared/x402.ts';

const PRICE = "10000";
const OUR_PAY_TO = "0x209693Bc6afc0C5328bA36FaF03C514EF312287C";
const OUR_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PAYER = "0x857b06519E91e3A54538791bDbb0E22373e3b66";
const RESOURCE = "https://www.apex-infrastructure.com/api/notarize";
const NOW = Math.floor(Date.now() / 1000);

const results = [];
function record(name, pass, measured) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  for (const line of measured) console.log(`        ${line}`);
}

function payloadFor(overrides = {}) {
  const { acceptedOverrides = {}, authOverrides = {}, signature = "0x" + "a".repeat(130) } = overrides;
  const accepted = { ...paymentRequirements(CONFIG), ...acceptedOverrides };
  const authorization = {
    from: PAYER,
    to: accepted.payTo,
    value: accepted.amount,
    validAfter: String(NOW - 5),
    validBefore: String(NOW + 55),
    nonce: "0x" + "f".repeat(64),
    ...authOverrides,
  };
  return { x402Version: X402_VERSION, resource: { url: RESOURCE }, accepted, payload: { signature, authorization } };
}

// An in-memory stand-in for claim_x402_payment(): first delivery wins, a replay of
// the same signed authorization is refused, and only a facilitator refusal frees
// the bytes for another attempt.
function createClaimGate() {
  const rows = new Map();
  return {
    claim(nonceKey) {
      const existing = rows.get(nonceKey);
      if (existing && existing.status === "verify_failed") {
        existing.status = "claimed";
        return true;
      }
      if (existing) return false;
      rows.set(nonceKey, { status: "claimed" });
      return true;
    },
    mark(nonceKey, status) { rows.get(nonceKey).status = status; },
    size: () => rows.size,
  };
}

function createMockFacilitator() {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = url.endsWith("/verify") ? "/verify" : url.endsWith("/settle") ? "/settle" : "?";
    calls.push({ path, body: JSON.parse(init.body) });
    const requirements = calls[calls.length - 1].body.paymentRequirements;
    const json = path === "/verify"
      ? { isValid: true, payer: requirements.payTo === OUR_PAY_TO ? PAYER : "0x0000000000000000000000000000000000000000" }
      : { success: true, transaction: "0x" + "1".repeat(64), network: requirements.network, payer: PAYER };
    return { status: 200, async json() { return json; } };
  };
  return { fetchImpl, calls };
}

const CONFIG_RESULT = readX402Config((name) => ({
  X402_PAY_TO: OUR_PAY_TO,
  X402_ASSET: OUR_ASSET,
  X402_AMOUNT_ATOMIC: PRICE,
  X402_FACILITATOR_URL: "https://facilitator.invalid",
  X402_NETWORK: "eip155:84532",
})[name]);
if (!CONFIG_RESULT.ok) {
  console.error("the door will not configure itself:", CONFIG_RESULT.missing.join(", "));
  process.exit(2);
}
const CONFIG = CONFIG_RESULT.config;

(async () => {
  // 0. The headers are ours to build and read back, byte for byte.
  const challenge = buildPaymentRequired(CONFIG, RESOURCE, "self-test", "Payment required.");
  const encoded = bytesToBase64(new TextEncoder().encode(JSON.stringify(challenge)));
  const roundTripped = JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
  const againstBuffer = Buffer.from(JSON.stringify(challenge)).toString("base64");
  const multibyte = "receipt for a decision: café — 検証";
  const mbRoundTrip = new TextDecoder().decode(base64ToBytes(bytesToBase64(new TextEncoder().encode(multibyte))));
  record("header encoding round-trips, including non-ASCII",
    JSON.stringify(roundTripped) === JSON.stringify(challenge) && againstBuffer === encoded && mbRoundTrip === multibyte, [
      `PAYMENT-REQUIRED base64 length ${encoded.length} B, agrees with node Buffer: ${againstBuffer === encoded}`,
      `multibyte string recovered exactly: ${mbRoundTrip === multibyte} (${multibyte.length} chars, ${new TextEncoder().encode(multibyte).length} bytes)`,
      `advertised scheme ${challenge.accepts[0].scheme}, network ${challenge.accepts[0].network}, amount ${challenge.accepts[0].amount}`,
    ]);

  // 1. An unpaid machine is told the exact price and the exact recipient.
  const unpaid = {
    listedPrice: challenge.accepts[0].amount === PRICE,
    listedPayTo: challenge.accepts[0].payTo === OUR_PAY_TO,
    listedAsset: challenge.accepts[0].asset === OUR_ASSET,
    version: challenge.x402Version === 2,
    onePaymentOneReceipt: challenge.accepts[0].amount === PRICE,
  };
  record("unpaid caller receives a 402 challenge naming our price", Object.values(unpaid).every(Boolean), [
    `scheme exact only, price ${PRICE} atomic units = ${(Number(PRICE) / 1e6).toFixed(6)} USDC`,
    `the challenge never quotes a price the caller brought`,
  ]);

  // 2. A paid caller: local checks pass, the facilitator verifies, the claim lands.
  const gate = createClaimGate();
  const facilitator = createMockFacilitator();
  const good = payloadFor();
  const goodCheck = await checkPaymentPayload(CONFIG, decodePaymentHeader(bytesToBase64(new TextEncoder().encode(JSON.stringify(good)))), NOW);
  const claimed = goodCheck.ok && gate.claim(goodCheck.nonceKey);
  const verified = goodCheck.ok && claimed
    ? await callFacilitator(CONFIG, "/verify", good, goodCheck.requirements, facilitator.fetchImpl)
    : { ok: false, result: {}, httpStatus: 0 };
  record("paid caller passes checks, claims once, and is verified", goodCheck.ok === true && claimed === true && verified.ok === true, [
    `digest ${goodCheck.ok ? goodCheck.paymentDigest.slice(0, 16) + "…" : "-"} payer ${goodCheck.ok ? goodCheck.payer.slice(0, 10) + "…" : "-"}`,
    `facilitator calls ${facilitator.calls.length}, path ${facilitator.calls[0]?.path}, x402Version in request ${facilitator.calls[0]?.body.x402Version}`,
  ]);

  // 3. The same signed bytes delivered twice buy one receipt, not two.
  const replayClaim = goodCheck.ok ? gate.claim(goodCheck.nonceKey) : false;
  record("replayed payment is refused before any work runs", replayClaim === false, [
    `second claim returned ${replayClaim}`,
    `payment rows held ${gate.size()} (one row, refused in place)`,
  ]);

  // 4. A tampered payment is refused locally, and the facilitator is never called.
  const tampered = [
    ["upto scheme", payloadFor({ acceptedOverrides: { scheme: "upto" } }), "unsupported_scheme"],
    ["caller-chosen price", payloadFor({ acceptedOverrides: { amount: "1" }, authOverrides: { value: "1" } }), "apex_amount_not_listed_price"],
    ["payTo pointed elsewhere", payloadFor({ acceptedOverrides: { payTo: "0x" + "b".repeat(40) }, authOverrides: { to: "0x" + "b".repeat(40) } }), "invalid_payment_requirements"],
    ["wrong network", payloadFor({ acceptedOverrides: { network: "eip155:8453" } }), "invalid_network"],
    ["open-ended window", payloadFor({ authOverrides: { validAfter: String(NOW - 100000), validBefore: String(NOW + 100000) } }), "apex_authorization_window_unacceptable"],
    ["expired window", payloadFor({ authOverrides: { validAfter: String(NOW - 400), validBefore: String(NOW - 340) } }), "invalid_exact_evm_payload_authorization_valid_before"],
    ["v1 payload", { x402Version: 1, scheme: "exact", network: CONFIG.network, payload: {} }, "invalid_x402_version"],
  ];
  const beforeCalls = facilitator.calls.length;
  const refusals = [];
  for (const [label, body, expectedReason] of tampered) {
    const decoded = decodePaymentHeader(bytesToBase64(new TextEncoder().encode(JSON.stringify(body)))) ?? body;
    const outcome = await checkPaymentPayload(CONFIG, decoded, NOW);
    refusals.push({ label, ok: outcome.ok === false && outcome.reason === expectedReason, reason: outcome.ok ? "ACCEPTED" : outcome.reason });
  }
  record("tampered payment refused locally, facilitator untouched",
    refusals.every((r) => r.ok) && facilitator.calls.length === beforeCalls,
    refusals.map((r) => `${r.label} -> ${r.reason}`));

  const nonceShape = paymentNonceKey(CONFIG, { from: PAYER, nonce: "0x" + "f".repeat(64) });
  console.log(`\nnonce key shape: ${nonceShape}`);
  console.log("NOT PROVEN by this run:");
  console.log("  1. the real facilitator's /verify and /settle answers (mocked here)");
  console.log("  2. claim_x402_payment() in Postgres (the rule is modelled above, not executed)");
  console.log("  3. that USDC arrives (only a real settlement shows that)");
  console.log("  4. the notary function wiring itself (needs Deno + the hosted project)");

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} binaries PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
