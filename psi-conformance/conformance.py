#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# PSI CONFORMANCE — psi-conformance/conformance.py   (PSI-SEAL/1 core)
#
# Zero-dependency (Python stdlib) reference runner for the frozen PSI-SEAL/1
# cryptographic core: JCS canonicalisation (ASCII subset), SHA-256, the
# "PSI1:" domain-separated leaf rule (R9), and the raw-byte Merkle root (R8).
#
#   python conformance.py generate   # writes vectors/*.json with REAL digests
#   python conformance.py test       # recomputes + asserts, prints CONFORMANT
#
# The vectors are the contract: any implementation (TS, Rust, Go, ...) that
# reproduces these digests is PSI-SEAL/1 conformant WITHOUT trusting APEX.
# Signature algorithms (Ed25519 / LMS-W4) are covered by the cross-language
# parity suite in ../packages — kept out of this runner so it stays stdlib-only.
# ═══════════════════════════════════════════════════════════════════════
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from psi_jcs import jcs  # real RFC 8785, stdlib-only (see psi_jcs.py)

HERE = os.path.dirname(os.path.abspath(__file__))
VEC = os.path.join(HERE, "vectors")


# ── primitives (MUST match psi-schema.ts exactly) ─────────────────────
def sha256_hex(data) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def jcs_canonicalize(obj) -> str:
    # R1: RFC 8785 JCS. This is the REAL algorithm (UTF-16 key order, raw
    # non-ASCII, ECMAScript number form), not an ASCII approximation. Proven
    # byte-identical to production `canonicalize` npm by jcs_verify.py.
    return jcs(obj)


def psi_leaf(hash_hex: str) -> str:
    # R9: leaf = SHA-256("PSI1:" || hash), hash lowercased, sha256: prefix stripped.
    h = hash_hex.replace("sha256:", "").lower()
    return sha256_hex("PSI1:" + h)


def _hex_to_bytes(h: str) -> bytes:
    return bytes.fromhex(h.replace("sha256:", "").lower())


def merkle_root(leaves):
    # R8: binary tree over raw 32-byte leaf digests; parent = SHA-256(left||right);
    # an odd trailing node is PROMOTED, never duplicated.
    if not leaves:
        raise ValueError("R8: at least one leaf required")
    level = [_hex_to_bytes(l) for l in leaves]
    while len(level) > 1:
        nxt = []
        i = 0
        while i < len(level):
            if i + 1 == len(level):
                nxt.append(level[i])           # odd node promoted
            else:
                nxt.append(_hex_to_bytes(sha256_hex(level[i] + level[i + 1])))
            i += 2
        level = nxt
    return level[0].hex()


# ── vector inputs (fixed, human-readable seeds) ───────────────────────
SHA_SEEDS = ["", "abc", "PSI", "apex-psi", "The quick brown fox jumps over the lazy dog"]
CANON_SEEDS = [
    {"b": 1, "a": {"y": 2, "x": 3}, "c": [1, 2, 3]},
    {"z": "hello", "a": "world", "m": [True, False, None, 42]},
    {"only": "one"},
    # --- non-ASCII / number / ordering vectors (R1 contract) --------------
    # These FAIL the old json.dumps(ensure_ascii=True) shortcut and PASS only
    # under real RFC 8785, so a bystander's real-JCS implementation reproduces
    # them and agrees with production on Unicode evidence.
    {"café": 1, "naïve": 2},                       # raw UTF-8 keys
    {"日本語": "ok", "😀": "astral"},              # CJK + emoji (surrogate pair)
    {"a": -0.0, "b": 1e20, "c": 1e21, "d": 1.5},   # ECMAScript number forms
    {"e": 1, "\u00fc": 2, "E": 3, "\u0045": 4},     # UTF-16 code-unit key order
    {"quote\"key": 1, "back\\slash": 2, "tab\there": 3},  # escapes
]


def generate():
    os.makedirs(VEC, exist_ok=True)

    sha_vec = [{"input": s, "sha256": sha256_hex(s)} for s in SHA_SEEDS]
    _write("sha256.json", sha_vec)

    canon_vec = []
    for o in CANON_SEEDS:
        canon_vec.append({"input": o, "canonical": jcs_canonicalize(o)})
    _write("canonicalization.json", canon_vec)

    leaf_vec = []
    for s in SHA_SEEDS:
        h = sha256_hex(s)
        leaf_vec.append({"hash": h, "leaf": psi_leaf(h)})
    _write("leaf.json", leaf_vec)

    # Merkle over 1..5 leaves derived from the seed hashes (deterministic).
    base = [psi_leaf(sha256_hex(s)) for s in SHA_SEEDS]
    merkle_vec = []
    for n in range(1, len(base) + 1):
        merkle_vec.append({"leaves": base[:n], "root": merkle_root(base[:n])})
    _write("merkle.json", merkle_vec)

    # Negative cases: values that MUST NOT match (tamper detection).
    h0 = sha256_hex("apex-psi")
    flipped = ("%064x" % (int(h0, 16) ^ 1))  # flip one hex bit of the digest
    neg = {
        "sha_differs_on_input": {
            "a": sha256_hex("apex-psi"), "b": sha256_hex("apex-psj"),
        },
        "leaf_differs_on_hash": {
            "correct_leaf": psi_leaf(h0), "wrong_leaf": psi_leaf(flipped),
        },
        "merkle_differs_on_reorder": {
            "ab": merkle_root(base[:2]),
            "ba": merkle_root(list(reversed(base[:2]))),
        },
    }
    _write("negative.json", neg)

    print("wrote vectors to", VEC)


def _write(name, obj):
    with open(os.path.join(VEC, name), "w") as f:
        json.dump(obj, f, indent=2, sort_keys=True)


# ── the runner ────────────────────────────────────────────────────────
def test():
    results = []

    for v in _read("sha256.json"):
        results.append(("SHA-256  %r" % v["input"][:24], sha256_hex(v["input"]) == v["sha256"]))

    for v in _read("canonicalization.json"):
        results.append(("JCS canon  %s" % _short(v), jcs_canonicalize(v["input"]) == v["canonical"]))

    for v in _read("leaf.json"):
        results.append(("R9 leaf    %s…" % v["hash"][:12], psi_leaf(v["hash"]) == v["leaf"]))

    for v in _read("merkle.json"):
        results.append(("R8 merkle  n=%d" % len(v["leaves"]), merkle_root(v["leaves"]) == v["root"]))

    neg = _read("negative.json")
    results.append(("NEG sha differs", neg["sha_differs_on_input"]["a"] != neg["sha_differs_on_input"]["b"]))
    results.append(("NEG leaf differs", neg["leaf_differs_on_hash"]["correct_leaf"] != neg["leaf_differs_on_hash"]["wrong_leaf"]))
    results.append(("NEG merkle order", neg["merkle_differs_on_reorder"]["ab"] != neg["merkle_differs_on_reorder"]["ba"]))

    print("PSI-SEAL/1 CONFORMANCE")
    print("-" * 48)
    passed = 0
    for name, ok in results:
        print("%-40s %s" % (name, "PASS" if ok else "FAIL"))
        passed += 1 if ok else 0
    print("-" * 48)
    all_ok = passed == len(results)
    print("RESULT: %s (%d/%d)" % ("CONFORMANT" if all_ok else "NON-CONFORMANT", passed, len(results)))
    return 0 if all_ok else 1


def _short(v):
    s = json.dumps(v["input"], sort_keys=True)
    return s[:20] + ("…" if len(s) > 20 else "")


def _read(name):
    with open(os.path.join(VEC, name)) as f:
        return json.load(f)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    if cmd == "generate":
        generate()
    elif cmd == "test":
        sys.exit(test())
    else:
        print("usage: conformance.py [generate|test]")
        sys.exit(2)
