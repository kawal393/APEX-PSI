# The 15-second drop-in

**What this is.** A receipt is only worth something if a stranger can check it
without asking the issuer. This is that check: one install, one function call,
no account, no key, no network at verification time.

**Measured 15 Nov 2026** against the public registries, not against a source
tree: `npm i apex-psi-verifier` resolves 1.7.0, `pip install psi-verifier`
resolves 1.7.0, and both verify a live hosted receipt issued minutes earlier.

**What it is not.** A seal is an audit trail. It says *this key signed this
record at this time*. It does not say the content is true, and no verifier
will tell you that.

---

## Lane 1 — verify a receipt you were handed

The receipt carries an Ed25519 signature over its Merkle leaf. The leaf is
`SHA-256(receipt_id | commit_hash)`, and `commit_hash` is
`SHA-256(content | predicate | timestamp)`. All three are recomputed from
**your** copy of the content and the receipt's own fields, so the receipt
cannot be verified by anything the receipt claims about itself.

### Node

```bash
npm i apex-psi-verifier
```

```js
// verify-receipt.mjs
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { psiVerifyBinding } from "apex-psi-verifier";

// Published trust anchor. Pin it; do not fetch it at verify time.
// https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json
const ANCHOR_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";
const sha = (s) => createHash("sha256").update(s).digest("hex");

const receipt = JSON.parse(readFileSync("receipt.json", "utf8")).receipt;
const content = "the exact content you sealed";
const predicate = "sealed-via-mcp";

const verdict = await psiVerifyBinding(
  {
    commit_id: receipt.receipt_id,
    commit_hash: sha(`${content.trim()}|${predicate}|${receipt.timestamp}`),
    merkle_leaf_hash: receipt.merkle_leaf.replace(/^sha256:/, ""),
    signature: {
      alg: "Ed25519",
      value: receipt.ed25519_signature,
      binds: "merkle_leaf",
    },
  },
  [{ public_key: ANCHOR_KEY, key_id: "apex-psi-2026" }],
);

console.log(verdict.status); // "verified" | "invalid" | "unverifiable"
```

### Python

```bash
pip install "psi-verifier[signature]"
```

```python
# verify_receipt.py
import hashlib, json
from psi_verifier import psi_verify_binding

ANCHOR_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"
sha = lambda s: hashlib.sha256(s.encode("utf-8")).hexdigest()

receipt = json.load(open("receipt.json", encoding="utf-8"))["receipt"]
content = "the exact content you sealed"
predicate = "sealed-via-mcp"

verdict = psi_verify_binding(
    {
        "commit_id": receipt["receipt_id"],
        "commit_hash": sha(f"{content.strip()}|{predicate}|{receipt['timestamp']}"),
        "merkle_leaf_hash": receipt["merkle_leaf"].replace("sha256:", "", 1),
        "signature": {
            "alg": "Ed25519",
            "value": receipt["ed25519_signature"],
            "binds": "merkle_leaf",
        },
    },
    [{"public_key": ANCHOR_KEY, "key_id": "apex-psi-2026"}],
)
print(verdict["status"])  # "verified" | "invalid" | "unverifiable"
```

Runnable copies live in this repository:
`packages/psi-verifier/examples/verify-receipt.mjs` and
`packages/psi-verifier-py/examples/verify_receipt.py`.

---

## Lane 2 — seal through the MCP door

`apex-psi-mcp@1.2.2` exposes five tools over stdio: `seal`, `verify`,
`anchor`, `cite`, `verify_chain`. It is free and needs no account; the hosted
issuer meters issuance, never verification.

### Cursor — `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "apex-psi-mcp@1.2.2"]
    }
  }
}
```

### Claude Code — `.mcp.json`

```json
{
  "mcpServers": {
    "apex-psi": {
      "command": "npx",
      "args": ["-y", "apex-psi-mcp@1.2.2"]
    }
  }
}
```

### LangChain

```python
import subprocess, json

def seal_with_apex(content: str) -> dict:
    """Seal `content` through the APEX PSI MCP door and return the receipt."""
    proc = subprocess.Popen(
        ["npx", "-y", "apex-psi-mcp@1.2.2"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
    )
    def call(method, params, _id):
        proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": _id, "method": method, "params": params}) + "\n")
        proc.stdin.flush()
        return json.loads(proc.stdout.readline())
    call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                         "clientInfo": {"name": "langchain", "version": "1"}}, 1)
    out = call("tools/call", {"name": "seal", "arguments": {"content": content}}, 2)
    proc.terminate()
    return json.loads(out["result"]["content"][0]["text"])["receipt"]
```

### CrewAI

```python
from crewai.tools import tool
import subprocess, json

@tool("apex_psi_seal")
def apex_psi_seal(content: str) -> str:
    """Seal content through the APEX PSI MCP door; returns the receipt JSON."""
    proc = subprocess.Popen(
        ["npx", "-y", "apex-psi-mcp@1.2.2"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
    )
    def call(method, params, _id):
        proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": _id, "method": method, "params": params}) + "\n")
        proc.stdin.flush()
        return json.loads(proc.stdout.readline())
    call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                         "clientInfo": {"name": "crewai", "version": "1"}}, 1)
    out = call("tools/call", {"name": "seal", "arguments": {"content": content}}, 2)
    proc.terminate()
    return json.dumps(json.loads(out["result"]["content"][0]["text"])["receipt"])
```

---

## Lane 3 — the canonical envelope (PSI-SEAL/1)

A hosted receipt is a ledger record. The canonical envelope is the sealed
document itself, and it is what a conformance claim is written against.

```js
import { verifySeal } from "apex-psi-verifier";

const result = await verifySeal(envelope, {
  trustRoots: [{ public_key: "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724" }],
});
// result.conformant, result.signature_status, result.failures[]
```

The closed field set is `schema`, `schema_digest`, `sealed_at`, `subject`,
`hash`, `merkle`, `signature`, `licence`. One canonical signed envelope ships
in this repository as a test vector:
`packages/psi-verifier/test/fixtures/psi-seal-envelope.json` — its key pair is
a published test key, so anyone can re-derive the bytes.

---

## What this does not do

- It does not tell you the content is true. It tells you the signature was
  checked against the published trust anchor.
- It does not verify a post-quantum signature on its own. A receipt that
  declares one is reported `unverifiable` until a checker for that algorithm
  is supplied — never `verified`.
- It does not need the issuer. Verification is free and offline; only hosted
  issuance is metered.

## Versions measured on 15 Nov 2026

| Package | Version | Where |
|---|---|---|
| `apex-psi-verifier` | 1.7.0 | npm |
| `psi-verifier` | 1.7.0 | PyPI |
| `apex-psi-mcp` | 1.2.2 | npm |
