#!/usr/bin/env python3
"""
verify_receipt.py — the 15-second drop-in, Python lane.

    pip install "psi-verifier[signature]"
    python verify_receipt.py receipt.json "the content you sealed"

Prints one line: VERIFIED, or the reason it is not.

The receipt carries an Ed25519 signature over its Merkle leaf. The leaf is
SHA-256(receipt_id | commit_hash), and commit_hash is
SHA-256(content | predicate | timestamp). All three are recomputed here from
YOUR content and the receipt's own fields, so a receipt cannot be verified by
anything the receipt says about itself. The signature is then checked against
the published trust-anchor key.

This runs offline, with no account, and costs nothing. A seal is an audit
trail, not a claim that the content is true.
"""
import hashlib
import json
import sys

from psi_verifier import psi_verify_binding, __version__

# The published APEX PSI trust anchor. Fetch it once and pin it:
# https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json
ANCHOR_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    if len(sys.argv) < 3:
        print('usage: python verify_receipt.py <receipt.json> "<sealed content>" [predicate]', file=sys.stderr)
        return 2

    with open(sys.argv[1], "r", encoding="utf-8") as handle:
        raw = json.load(handle)
    receipt = raw.get("receipt", raw)
    content = sys.argv[2]
    predicate = sys.argv[3] if len(sys.argv) > 3 else receipt.get("predicate", "sealed-via-mcp")

    commit_hash = sha256_hex(f"{content.strip()}|{predicate}|{receipt['timestamp']}")

    record = {
        "commit_id": receipt["receipt_id"],
        "commit_hash": commit_hash,
        "merkle_leaf_hash": str(receipt.get("merkle_leaf", "")).replace("sha256:", "", 1),
        "signature": {
            "alg": "Ed25519",
            "value": receipt["ed25519_signature"],
            "binds": "merkle_leaf",
        },
    }

    verdict = psi_verify_binding(record, [{"public_key": ANCHOR_KEY, "key_id": "apex-psi-2026"}])

    if verdict["status"] == "verified":
        print(f"VERIFIED  receipt {receipt['receipt_id']}  (verifier {__version__})")
        print(f"          binding {verdict['binding']}  digest {verdict['digest']}")
        return 0
    print(f"NOT VERIFIED  [{verdict['rule']}] {verdict['detail']}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
