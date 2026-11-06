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
    psi_schema_digest_from_document,
    psi_seal_hash,
    psi_verify_binding,
    psi_verify_inclusion,
    verify_seal,
)

# The published ledger identity — the key a third party is told to trust at
# /.well-known/apex-psi-trust-anchor.json.
LEDGER_PUBLIC_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"
LEDGER_KEY_ID = "apex-psi-ledger-ed25519"

# Three REAL receipts, captured 2026-11-04 from the public audit-mirror
# (https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/audit-mirror?limit=3).
# These are the receipts our own verifier used to reject (0/3) because the
# live ledger signs the Merkle leaf, not the R10 seal_hash.
REAL_LEDGER_ROWS = [
    {
        "sequence_number": 5934,
        "commit_id": "APEX-ED03CCF9-D897",
        "commit_hash": "07a826317ecd01519de493293de31ca8b38565d01f005e38a8c6d8a4215b3e1b",
        "merkle_leaf_hash": "e804673732f57558f6d933af58c94d6c18af1ea9df4cd09e05637332ffdddf75",
        "ed25519_signature": "0fe4dc383cbd459907d44758f433eb2c4111472da8c489f493cf3cb9ae92985f34993db28f529724599e61fb1ac94a6d3c301d89c03815a41b3d6c9cd0ea7d0c",
    },
    {
        "sequence_number": 5933,
        "commit_id": "APEX-NTR-7E04134494028E1C",
        "commit_hash": "5686e9b0abd8b58830c00b4c8c08199e46966fdbdba108562b2cf63ad41be609",
        "merkle_leaf_hash": "650c617f037650b5b754c35bfa804bd7e058005301c691420a9db209af977e0c",
        "ed25519_signature": "f41f3f49439260c272d989fbe0eec6ee193f3d4a3ae62e12443969e4556224870b003cb353c8e5e8d331bfde01a2026c5fb2387c0e19519d435edd413e91530b",
    },
    {
        "sequence_number": 5932,
        "commit_id": "APEX-NTR-A9424BCF612A11D7",
        "commit_hash": "7ddc0564d259401a7e9204b3d8d39937c196ca4de3d7922cf81d96e54c8e0224",
        "merkle_leaf_hash": "b317cf0b3a2f8a654c0caa56ba159b85a30e6ca2e99f4dd345ceb9d75828ef42",
        "ed25519_signature": "2c770da27ebae2dd6d1e7d6ff50fb3318601ce6895eff063420e9a10709a8d0855d4b90c122c5e570d99472c9c1f545e2dcad1a4f9ce5a593a7148050ccc1a0a",
    },
]

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

# ── R11.6 NAMED BINDING cases ─────────────────────────────────────────────
# The ledger path: a record carrying commit_id and commit_hash, whose
# signature covers sha256(commit_id | commit_hash).
led_commit_id = "APEX-TEST-BINDING-0001"
led_commit_hash = sha_hex("binding case content")
led_leaf = sha_hex(f"{led_commit_id}|{led_commit_hash}")
led_sig = private.sign(led_leaf.encode("ascii")).hex()
led_record = {
    "commit_id": led_commit_id,
    "commit_hash": led_commit_hash,
    "merkle_leaf_hash": led_leaf,
    "ed25519_signature": led_sig,
}

# A ledger signature transplanted into an envelope that DECLARES that leaf as
# its seal_hash. A verifier that trusts the declared value accepts this. One
# that recomputes refuses it.
transplant = build("revenue was 12,000 AUD")
transplant.pop("_seal_hash")
transplant["signature"] = {
    "alg": "Ed25519",
    "value": REAL_LEDGER_ROWS[0]["ed25519_signature"],
    "seal_hash": REAL_LEDGER_ROWS[0]["merkle_leaf_hash"],
}

# A record that could mean two things and does not say which.
ambiguous = build("revenue was 12,000 AUD")
ambiguous.pop("_seal_hash")
ambiguous["commit_id"] = led_commit_id
ambiguous["commit_hash"] = led_commit_hash
ambiguous["signature"] = {"alg": "Ed25519", "value": real_signature, "seal_hash": "0" * 64}

# A declaration the record cannot honour: an envelope has no ledger leaf.
wrong_binding = build("revenue was 12,000 AUD")
wrong_binding.pop("_seal_hash")
wrong_binding["signature"] = {
    "alg": "Ed25519",
    "value": real_signature,
    "seal_hash": "0" * 64,
    "binds": "merkle_leaf",
}

# A declaration nobody has ever heard of.
unknown_binding = build("revenue was 12,000 AUD")
unknown_binding.pop("_seal_hash")
unknown_binding["signature"] = {
    "alg": "Ed25519",
    "value": real_signature,
    "seal_hash": "0" * 64,
    "binds": "banana",
}

# A row whose stored leaf disagrees with the leaf recomputed from its own
# commit fields.
leaf_mismatch = {
    "commit_id": led_commit_id,
    "commit_hash": led_commit_hash,
    "merkle_leaf_hash": "b" * 64,
    "ed25519_signature": led_sig,
}

LEDGER_TRUST = [{"public_key": LEDGER_PUBLIC_KEY, "key_id": LEDGER_KEY_ID}]
LOCAL_TRUST = [{"public_key": public, "key_id": "cross-language-key"}]

BINDING_CASES = [
    ("real receipt 5934, published ledger key", REAL_LEDGER_ROWS[0], LEDGER_TRUST),
    ("real receipt 5933, published ledger key", REAL_LEDGER_ROWS[1], LEDGER_TRUST),
    ("real receipt 5932, published ledger key", REAL_LEDGER_ROWS[2], LEDGER_TRUST),
    ("ledger row signed over its own leaf", led_record, LOCAL_TRUST),
    ("ledger signature transplanted into an envelope", transplant, LEDGER_TRUST),
    ("record that could mean two bindings and does not say", ambiguous, LOCAL_TRUST),
    ("envelope declaring a binding it cannot recompute", wrong_binding, LOCAL_TRUST),
    ("record declaring a binding nobody has heard of", unknown_binding, LOCAL_TRUST),
    ("row whose stored leaf disagrees with its commit fields", leaf_mismatch, LOCAL_TRUST),
    ("real receipt checked against nobody's key", REAL_LEDGER_ROWS[0], []),
]


def _tok(value) -> str:
    """One canonical spelling for "no value", so both distributions print the same bytes."""
    return "null" if value is None else str(value)


def render_binding(check: dict) -> str:
    return (
        f"status={check['status']} binding={_tok(check['binding'])} "
        f"key={_tok(check['key_id'])} rule={check['rule']}\n"
        f"detail: {check['detail']}"
    )


# ── RFC 9162 INCLUSION PROOF cases (R13.1) ────────────────────────────────
# A live inclusion proof, re-fetched 2026-11-04 from the public endpoint, and
# the ways a proof can be wrong. The three-leaf case is here because it is
# where the leaf-index parity shortcut breaks: the tree size is not a power
# of two, so only a verifier that walks the RFC 9162 split reproduces the head.
LIVE_INCLUSION = {
    "leaf": "e804673732f57558f6d933af58c94d6c18af1ea9df4cd09e05637332ffdddf75",
    "leaf_index": 255,
    "tree_size": 256,
    "audit_path": [
        "fd10ac1532b06a2ee2d5b9be84dc39295e1c39c3a6e2dac934ddeb8984b97bdc",
        "0998fb306217e9d518817734691149d5ce8b2a7d3146e2b5390957866099aded",
        "97ec21d6f0084a68a99d7bab66d0aa80ac9aead2d5762ff3ac9dfd3a653ca089",
        "df9417324a7022517bad055d5ab132352981c0e3c30c515570b79a469a0b95d7",
        "7aa4e2251be48dfcd9f71f6fe19de97d6b751d0914fbf10d66c3bca5d3629838",
        "a249f6d1002b07a33ef06f63448a9bc49587465533ca1c21ee21e99f45107d36",
        "3105929e7577eeaf6535db3c840603ee25626350680e52ac8bcbaf5fda06c1bb",
        "c3776fcf03a223ce115723f28336be33af5b057495f359c2abb643168fe8db1c",
    ],
    "root": "187e00f3b8891fc2f94b6a5ecd3f3878deb1db1d513a6a1646859494e937ca53",
}


def _leaf_node(leaf_hex: str) -> str:
    return hashlib.sha256(b"\x00" + bytes.fromhex(leaf_hex)).hexdigest()


def _node(left: str, right: str) -> str:
    return hashlib.sha256(b"\x01" + bytes.fromhex(left) + bytes.fromhex(right)).hexdigest()


def _mth(hashed: list) -> str:
    if len(hashed) == 1:
        return hashed[0]
    k = 1
    while k * 2 < len(hashed):
        k *= 2
    return _node(_mth(hashed[:k]), _mth(hashed[k:]))


def _audit_path(index: int, hashed: list) -> list:
    if len(hashed) <= 1:
        return []
    k = 1
    while k * 2 < len(hashed):
        k *= 2
    if index < k:
        return _audit_path(index, hashed[:k]) + [_mth(hashed[k:])]
    return _audit_path(index - k, hashed[k:]) + [_mth(hashed[:k])]


THREE_LEAF_HASHES = [_leaf_node(sha_hex(f"leaf {i}")) for i in range(3)]
THREE_LEAF = {
    "leaf": sha_hex("leaf 2"),
    "leaf_index": 2,
    "tree_size": 3,
    "audit_path": _audit_path(2, THREE_LEAF_HASHES),
    "root": _mth(THREE_LEAF_HASHES),
}

TAMPERED_INCLUSION = dict(LIVE_INCLUSION)
TAMPERED_INCLUSION["root"] = "0" * 64

OUT_OF_RANGE_INCLUSION = dict(LIVE_INCLUSION)
OUT_OF_RANGE_INCLUSION["leaf_index"] = 256

INCLUSION_CASES = [
    ("live proof from the public endpoint, 256 leaves", LIVE_INCLUSION),
    ("the same proof with a head that does not match", TAMPERED_INCLUSION),
    ("a three-leaf tree, where the parity shortcut does not apply", THREE_LEAF),
    ("a proof whose leaf index is outside its tree", OUT_OF_RANGE_INCLUSION),
]


def render_inclusion(check: dict) -> str:
    return (
        f"status={check['status']} included={str(check['included']).lower()} "
        f"recomputed_root={_tok(check['recomputed_root'])} rule={check['rule']}\n"
        f"detail: {check['detail']}"
    )


# ── R11.7 POST-QUANTUM cases ─────────────────────────────────────────────
# A seal that CLAIMS a post-quantum signature. Measured 7 Nov 2026: the
# published verifier (npm 1.3.0, PyPI 1.3.0) and the 1.4.0 source both read
# pq_alg and pq_value without checking them, and reported this seal as
# `conformant: true`, `signature_status: "verified"`, `authentic: true` with
# no failures — the post-quantum half was noise. Rule R11.7 makes a declared
# post-quantum signature something that must itself be verified.
pq_seal = build("revenue was 12,000 AUD")
pq_seal_hash = pq_seal.pop("_seal_hash")
pq_seal["signature"] = {
    "alg": "Ed25519",
    "value": real_signature,
    "seal_hash": pq_seal_hash,
    "pq_alg": "ML-DSA-65",
    "pq_value": "ab" * 512,
}

PQ_CHECKERS = {
    "none": (),
    "refuse": (
        {"alg": "ML-DSA-65", "public_key": "00" * 1952, "verify": lambda message, sig, key: False},
    ),
    "accept": (
        {"alg": "ML-DSA-65", "public_key": "00" * 1952, "verify": lambda message, sig, key: True},
    ),
}

PQ_CASES = [
    ("a genuine seal that declares a post-quantum signature nobody checks", pq_seal, "none"),
    ("the same seal, with a checker that refuses the post-quantum signature", pq_seal, "refuse"),
    ("the same seal, with a checker that verifies the post-quantum signature", pq_seal, "accept"),
]

# The declared half is reported whatever the classical half did. Measured
# 7 Nov 2026: this seal came back with `post_quantum_status: "absent"` — a
# verdict stating, wrongly, that a seal which DECLARES a post-quantum
# signature declares none. Rejected either way, but the verdict must not
# misstate the artefact.
broken_pq_seal = dict(pq_seal)
broken_pq_seal["signature"] = {**pq_seal["signature"], "value": "cd" * 64}
PQ_CASES.append(
    ("the same seal, with a broken Ed25519 half", broken_pq_seal, "refuse")
)


inclusion_lines = []
for index, (name, proof) in enumerate(INCLUSION_CASES, start=1):
    check = psi_verify_inclusion(proof)
    inclusion_lines.append(f"inclusion case {index}: {render_inclusion(check)}")


# ── the PUBLISHED schema document must hash to the verifier's frozen digest ──
# The seal schema is frozen: every seal ever issued carries this digest. If the
# verifier's rule list and the published document ever disagree, every seal
# issued before the change fails. This check is what makes that impossible to
# ship by accident.
PUBLISHED_SCHEMA = os.path.normpath(
    os.path.join(HERE, "..", "..", "..", "public", ".well-known", "psi-schema.json")
)
with open(PUBLISHED_SCHEMA, encoding="utf-8") as fh:
    published_doc = json.load(fh)
published_digest = psi_schema_digest_from_document(published_doc)
schema_match = published_digest == psi_schema_digest()
schema_line = (
    f"published schema document digest: {published_digest} | "
    f"matches the verifier's frozen digest: {str(schema_match).lower()}"
)

binding_lines = []
for index, (name, record, trust) in enumerate(BINDING_CASES, start=1):
    check = psi_verify_binding(record, trust)
    binding_lines.append(f"binding case {index}: {render_binding(check)}")

pq_lines = []
for index, (name, seal, checker) in enumerate(PQ_CASES, start=1):
    result = verify_seal(seal, TRUST, post_quantum=PQ_CHECKERS[checker])
    header = (
        f"post-quantum case {index}: conformant={str(result.conformant).lower()} "
        f"signature_status={result.signature_status} authentic={str(result.authentic).lower()} "
        f"post_quantum_status={result.post_quantum_status}"
    )
    pq_lines.append(f"{header}\n{render(result)}")

with open(os.path.join(OUT_DIR, "fixtures.json"), "w", encoding="utf-8", newline="\n") as fh:
    json.dump(
        {"canonical_schema_digest": psi_schema_digest(), "published_schema_digest": published_digest,
         "public_key": public, "cases": [
            {"name": name, "seal": seal, "options": options} for name, seal, options in CASES
        ], "binding_cases": [
            {"name": name, "record": record, "trust_roots": trust} for name, record, trust in BINDING_CASES
        ], "inclusion_cases": [
            {"name": name, "proof": proof} for name, proof in INCLUSION_CASES
        ], "post_quantum_cases": [
            {"name": name, "seal": seal, "checker": checker} for name, seal, checker in PQ_CASES
        ]},
        fh,
        indent=2,
        sort_keys=True,
    )

with open(os.path.join(OUT_DIR, "python.txt"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write(
        "\n\n=====\n\n".join(py_lines + binding_lines + inclusion_lines + pq_lines + [schema_line]) + "\n"
    )

print("python: signed seal verifies locally =", verify_seal(signed, TRUST).conformant)
print("python: cases =", len(CASES), "| binding cases =", len(BINDING_CASES), "| post-quantum cases =", len(PQ_CASES))
print("python: canonical schema digest =", psi_schema_digest())
print("python:", schema_line)
print("python: real receipts verified by the published ledger key =", sum(
    1 for name, record, trust in BINDING_CASES[:3]
    if psi_verify_binding(record, trust)["status"] == "verified"
), "/ 3")
print("python: wrote", os.path.relpath(OUT_DIR, HERE))
