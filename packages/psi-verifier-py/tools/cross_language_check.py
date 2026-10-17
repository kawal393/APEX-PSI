"""Cross-language proof: do the Python and TypeScript distributions emit the
SAME bytes for the SAME seals — and does a seal signed with a Python-generated
Ed25519 key verify in Node?

Run from packages/psi-verifier-py:  python tools/cross_language_check.py

Writes   test/cross-language/fixtures.json   (shared input for both languages)
         test/cross-language/python.txt      (this distribution's verdicts)

The Node twin (packages/psi-verifier/test/cross-language/node_check.mts)
replays fixtures.json through apex-psi-verifier and writes node.txt. A byte
diff of the two files is the parity proof: same verdicts, same rejection text,
same rule citations, same acceptance line.
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from psi_verifier import (  # noqa: E402
    PSI_SCHEMA_ID,
    ConformanceResult,
    format_acceptance,
    format_rejection,
    psi_leaf,
    psi_schema_digest,
    psi_seal_hash,
    verify_seal,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "test", "cross-language"))
os.makedirs(OUT_DIR, exist_ok=True)


def sha_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build(content: str) -> dict:
    """A conformant envelope plus the seal_hash its signature will cover."""
    env = {
        "schema": PSI_SCHEMA_ID,
        "schema_digest": psi_schema_digest(),
        "sealed_at": "2026-10-17T20:55:00.000Z",
        "subject": {"name": "revenue-ledger.csv", "size_bytes": len(content.encode("utf-8"))},
        "hash": sha_hex(content),
        "merkle": {"leaf": psi_leaf(sha_hex(content))},
    }
    env["_seal_hash"] = psi_seal_hash(env)
    return env


def render(result: ConformanceResult) -> str:
    if result.conformant:
        return format_acceptance(result.signature_status, result.trusted_key_id)
    return format_rejection(result, psi_schema_digest())


# ── 1. one genuine seal, signed HERE in Python with a real Ed25519 key ──
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey  # noqa: E402

private = Ed25519PrivateKey.generate()
public = private.public_key().public_bytes_raw().hex()
TRUST = [{"public_key": public, "key_id": "cross-language-key"}]

signed = build("revenue was 12,000 AUD")
signed_hash = signed.pop("_seal_hash")
real_signature = private.sign(signed_hash.encode("ascii")).hex()
signed["signature"] = {"alg": "Ed25519", "value": real_signature, "seal_hash": signed_hash}

# ── 2. forgery: content edited, seal_hash recomputed by the attacker, the
#        genuine signature carried over untouched. ──
forged = build("revenue was 999,000,000 AUD")
forged["signature"] = {"alg": "Ed25519", "value": real_signature, "seal_hash": forged.pop("_seal_hash")}

# ── 3. the "signature" our own generator emitted until tonight. ──
blank = build("revenue was 12,000 AUD")
blank["signature"] = {"alg": "Ed25519", "value": "", "seal_hash": blank.pop("_seal_hash")}

# ── 4. not a signature at all: neither 128 hex nor 64 base64 bytes. ──
garbage = build("revenue was 999,000,000 AUD")
garbage["signature"] = {"alg": "Ed25519", "value": "GARBAGE-NOT-A-SIGNATURE", "seal_hash": garbage.pop("_seal_hash")}

# ── 5. a real signature, but the alg field lies. ──
wrong_alg = build("revenue was 12,000 AUD")
wrong_alg["signature"] = {"alg": "ES256", "value": real_signature, "seal_hash": wrong_alg.pop("_seal_hash")}

# ── 6. a real signature checked against nobody's public key. ──
orphan = build("revenue was 12,000 AUD")
orphan["signature"] = {"alg": "Ed25519", "value": real_signature, "seal_hash": orphan.pop("_seal_hash")}

# ── 7. no signature member whatsoever. ──
unsigned = build("revenue was 12,000 AUD")
unsigned.pop("_seal_hash")

CASES = [
    ("python-signed seal, verified against the python public key", signed, {"trustRoots": TRUST}),
    ("forgery: content edited, seal_hash recomputed, genuine signature carried over", forged, {"trustRoots": TRUST}),
    ("empty signature.value wearing Ed25519 clothing", blank, {"trustRoots": TRUST}),
    ("signature.value is neither 128 hex nor 64 base64 bytes", garbage, {"trustRoots": TRUST}),
    ("signature.alg is ES256 while R11 requires Ed25519", wrong_alg, {"trustRoots": TRUST}),
    ("a real signature checked against nobody's key (no trust root)", orphan, {}),
    ("no signature member, default enforcement", unsigned, {}),
    ("no signature member, legacy report-only", unsigned, {"requireValidSignature": False}),
]

py_lines = []
for index, (name, seal, ts_options) in enumerate(CASES, start=1):
    kwargs = {}
    if "trustRoots" in ts_options:
        kwargs["trust_roots"] = ts_options["trustRoots"]
    if "requireValidSignature" in ts_options:
        kwargs["require_valid_signature"] = ts_options["requireValidSignature"]
    result = verify_seal(seal, **kwargs)
    header = (
        f"case {index}: conformant={str(result.conformant).lower()} "
        f"signature_status={result.signature_status} authentic={str(result.authentic).lower()}"
    )
    py_lines.append(f"{header}\n{render(result)}")

with open(os.path.join(OUT_DIR, "fixtures.json"), "w", encoding="utf-8", newline="\n") as fh:
    json.dump(
        {"canonical_schema_digest": psi_schema_digest(), "public_key": public, "cases": [
            {"name": name, "seal": seal, "options": options} for name, seal, options in CASES
        ]},
        fh,
        indent=2,
        sort_keys=True,
    )

with open(os.path.join(OUT_DIR, "python.txt"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n\n=====\n\n".join(py_lines) + "\n")

print("python: signed seal verifies locally =", verify_seal(signed, TRUST).conformant)
print("python: cases =", len(CASES))
print("python: canonical schema digest =", psi_schema_digest())
print("python: wrote", os.path.relpath(OUT_DIR, HERE))
