"""psi-verifier — MIT licensed. Free forever.

Verifies that a PSI seal conforms, byte for byte, to the copyrighted
PSI-SEAL/1 canonical schema. Verification is open to everyone; producing
conformant seals requires the licensed APEX PSI Sealing Engine.

Zero dependencies. Python 3.8+.

v1.2.0 — PARITY RELEASE: ``verify()`` rejects non-conformant seals by default
(``enforce=True``) and every rejection line is byte-identical to the
TypeScript distribution, carrying a readable rule citation.

v1.3.0 — AUTHENTICITY RELEASE: R11 is now actually checked. A seal's Ed25519
signature is verified over the ASCII ``seal_hash`` against public keys the
CALLER supplies, and a seal whose signature was never checked can no longer
report a pass. ``conformant`` still means "the bytes match the schema";
``authentic`` is the new, separate answer to "did a trusted key sign this".
Rejection and acceptance lines stay byte-identical to the TypeScript build.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

__version__ = "1.3.0"
PSI_VERIFIER_VERSION = __version__

PSI_SCHEMA_ID = "PSI-SEAL/1.0.0"
PSI_SEAL_URL = "https://ai-governance-standard.com/seal"
PSI_SCHEMA_URL = "https://ai-governance-standard.com/.well-known/psi-schema.json"

PSI_SCHEMA_RULES: Sequence[str] = (
    "R1  Envelope serialisation: RFC 8785 JSON Canonicalization Scheme (JCS), UTF-8, no BOM.",
    "R2  Field set is closed. Unknown top-level fields render a seal non-conformant.",
    "R3  Field order in the emitted receipt: schema, schema_digest, sealed_at, subject, hash, merkle, signature, licence.",
    "R4  Digests: lowercase hexadecimal, exactly 64 characters, no 'sha256:' prefix inside the envelope.",
    "R5  Hash algorithm: SHA-256 over the raw octet stream of the subject; no transport encoding, no trailing padding.",
    "R6  sealed_at: RFC 3339 UTC with exactly three fractional digits and a literal 'Z' (e.g. 2026-08-17T09:00:00.000Z).",
    "R7  subject.size_bytes: non-negative integer, exact octet length. subject.name: NFC-normalised UTF-8 string.",
    "R8  Merkle assembly: binary tree over leaf digests in submission order; each parent = SHA-256(left_bytes || right_bytes) over 32-byte raw digests; an odd node is promoted, never duplicated.",
    "R9  merkle.leaf = SHA-256 of the ASCII string 'PSI1:' || hash. Domain separation is mandatory.",
    "R10 seal_hash = SHA-256(JCS(envelope minus the signature and licence members)).",
    "R11 Signature suite: Ed25519 over the ASCII seal_hash; optional hybrid post-quantum LMS-W4-SHA256 (NIST SP 800-208).",
    "R12 Every seal MUST carry schema and schema_digest. Only schema-conformant seals are considered PSI-compliant.",
)

PSI_RULE_CITATIONS = {
    "not_object": "1.1",
    "closed_field_set": "2.1",
    "schema_identifier": "4.1",
    "schema_digest": "4.2",
    "hash_encoding": "5.1",
    "sealed_at": "6.1",
    "size_bytes": "7.1",
    "leaf_missing": "8.1",
    "leaf_mismatch": "9.1",
    "seal_hash": "10.1",
    "signature_absent": "11.1",
    "signature_empty": "11.2",
    "signature_invalid": "11.3",
    "signature_unverifiable": "11.4",
    "signature_alg": "11.5",
}


def reject_line(detail: str, rule: str) -> str:
    """Canonical single-line rejection. Byte-identical to the TypeScript build."""
    return f"PSI-SEAL v{PSI_VERIFIER_VERSION} REJECT: {detail} \u2014 rule {rule}"


_HEX64 = re.compile(r"^[0-9a-f]{64}$")
_RFC3339_MS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
_ALLOWED = (
    "schema",
    "schema_digest",
    "sealed_at",
    "subject",
    "hash",
    "merkle",
    "signature",
    "licence",
)


def jcs(value: Any) -> str:
    """RFC 8785 (JCS) serialisation, minimal form matching the TS verifier."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(jcs(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted((k for k, v in value.items() if v is not None), key=lambda k: k)
        return "{" + ",".join(f"{json.dumps(k, ensure_ascii=False)}:{jcs(value[k])}" for k in keys) + "}"
    raise TypeError("JCS: unsupported value")


def _sha256_hex(data: Any) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def psi_schema_digest() -> str:
    return _sha256_hex(jcs({"id": PSI_SCHEMA_ID, "rules": list(PSI_SCHEMA_RULES)}))


def psi_schema_digest_from_document(doc: Any) -> str:
    """Digest a published schema document (e.g. /.well-known/psi-schema.json)
    using this verifier's own canonicalisation. Byte-identical to the
    TypeScript distribution's psiSchemaDigestFromDocument()."""
    if not isinstance(doc, dict) or not isinstance(doc.get("schema"), str) or not isinstance(doc.get("rules"), list):
        raise ValueError("PSI schema document must carry a string `schema` and a list of `rules`")
    return _sha256_hex(jcs({"id": doc["schema"], "rules": list(doc["rules"])}))


def psi_leaf(hash_hex: str) -> str:
    clean = re.sub(r"^sha256:", "", hash_hex, flags=re.I).lower()
    return _sha256_hex("PSI1:" + clean)


def psi_seal_hash(envelope: Dict[str, Any]) -> str:
    core = {k: v for k, v in envelope.items() if k not in ("signature", "licence")}
    return _sha256_hex(jcs(core))


# ── R11 AUTHENTICITY (added v1.3.0; mirrors the TypeScript distribution) ──
# A conformant envelope is not an authenticated one. Ed25519 over the ASCII
# `seal_hash`, checked only against public keys the CALLER chose to trust.
# This module never invents trust and never reports a pass it did not compute.

_SIG_HEX = re.compile(r"^[0-9a-fA-F]{128}$")


def _decode_material(value: str, byte_length: int) -> Optional[bytes]:
    """Accepts hex or standard / URL-safe base64, and requires the exact byte length."""
    text = str(value or "").strip()
    if len(text) == byte_length * 2 and re.fullmatch(r"[0-9a-fA-F]+", text):
        return bytes.fromhex(text)
    candidate = text.replace("-", "+").replace("_", "/")
    candidate += "=" * (-len(candidate) % 4)
    if not re.fullmatch(r"[A-Za-z0-9+/]*={0,2}", candidate):
        return None
    try:
        raw = base64.b64decode(candidate, validate=True)
    except (ValueError, TypeError):
        return None
    return raw if len(raw) == byte_length else None


def psi_key_fingerprint(public_key: str) -> str:
    """Short readable label for a key: first 10 hex of SHA-256 over the raw key bytes."""
    raw = _decode_material(public_key, 32)
    if raw is None:
        raise ValueError("PSI R11: public key must be 32 bytes, as 64 hex characters or base64")
    return hashlib.sha256(raw).hexdigest()[:10]


def _ed25519_verifier() -> Optional[Any]:
    """Return ``cryptography``'s Ed25519 public-key class, or None if it is not installed."""
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

        return Ed25519PublicKey
    except Exception:
        return None


def psi_verify_signature(
    seal_hash: str,
    signature: Optional[Dict[str, Any]],
    trust_roots: Sequence[Union[str, Dict[str, Any]]] = (),
) -> Dict[str, Any]:
    """Check R11. Returns ``unverifiable`` — never ``verified`` — when there is no
    trust root or this platform has no Ed25519 primitive. ``invalid`` is reserved
    for a check that actually ran and said no."""
    if not isinstance(signature, dict):
        return {
            "status": "absent",
            "key_id": None,
            "detail": "seal carries no signature member",
            "rule": PSI_RULE_CITATIONS["signature_absent"],
        }
    alg = str(signature.get("alg") or "").lower()
    if alg != "ed25519":
        return {
            "status": "invalid",
            "key_id": None,
            "detail": f'signature.alg is "{signature.get("alg") or ""}"; R11 requires Ed25519, so nothing here can be checked',
            "rule": PSI_RULE_CITATIONS["signature_alg"],
        }
    value = str(signature.get("value") or "").strip()
    if not value:
        return {
            "status": "invalid",
            "key_id": None,
            "detail": "signature.value is empty \u2014 no key signed this seal",
            "rule": PSI_RULE_CITATIONS["signature_empty"],
        }
    sig = _decode_material(value, 64)
    if sig is None:
        return {
            "status": "invalid",
            "key_id": None,
            "detail": "signature.value is neither 128 hex characters nor 64 base64 bytes, so it is not an Ed25519 signature",
            "rule": PSI_RULE_CITATIONS["signature_invalid"],
        }
    roots = [{"public_key": r} if isinstance(r, str) else dict(r) for r in trust_roots]
    if not roots:
        return {
            "status": "unverifiable",
            "key_id": None,
            "detail": "no trust root supplied: a signature nobody's public key was checked against proves nothing",
            "rule": PSI_RULE_CITATIONS["signature_unverifiable"],
        }
    message = str(seal_hash).encode("utf-8")
    ed25519 = _ed25519_verifier()
    if ed25519 is not None:
        from cryptography.exceptions import InvalidSignature

        def _check(sig_bytes: bytes, msg: bytes, raw_key: bytes) -> bool:
            try:
                ed25519.from_public_bytes(raw_key).verify(sig_bytes, msg)
                return True
            except InvalidSignature:
                return False
    else:
        # No `cryptography` wheel on this machine. Instead of refusing every
        # signature, fall back to the dependency-free RFC 8032 implementation
        # kept from the 1.3.0 build the website builder pushed on 17 Oct 2026 —
        # slower, but a regulator with plain Python can still check a seal.
        def _check(sig_bytes: bytes, msg: bytes, raw_key: bytes) -> bool:
            try:
                return verify_ed25519(msg, sig_bytes.hex(), raw_key.hex())
            except Exception:
                return False

    any_key_usable = False
    for root in roots:
        raw = _decode_material(root.get("public_key") or "", 32)
        if raw is None:
            continue
        any_key_usable = True
        if not _check(sig, message, raw):
            continue
        label = root.get("key_id") or f"ed25519:{raw.hex()[:10]}"
        return {
            "status": "verified",
            "key_id": label,
            "detail": "Ed25519 signature verified over the ASCII seal_hash",
            "rule": "11",
        }
    if not any_key_usable:
        return {
            "status": "unverifiable",
            "key_id": None,
            "detail": "this platform exposes no Ed25519 verifier, so the signature was refused rather than assumed",
            "rule": PSI_RULE_CITATIONS["signature_unverifiable"],
        }
    return {
        "status": "invalid",
        "key_id": None,
        "detail": f"Ed25519 signature does not verify against any of the {len(roots)} supplied trust root(s)",
        "rule": PSI_RULE_CITATIONS["signature_invalid"],
    }


@dataclass
class ConformanceResult:
    conformant: bool
    schema_id: Optional[str]
    schema_digest_match: bool
    seal_hash_match: bool
    signature_valid: bool = False
    failures: List[str] = field(default_factory=list)
    signature_status: str = "absent"
    authentic: bool = False
    trusted_key_id: Optional[str] = None


class PsiSealInvalidError(Exception):
    """Raised by ``verify()`` when enforcement is on (the default)."""

    code = "PSI_SEAL_INVALID"

    def __init__(self, result: ConformanceResult, canonical_digest: str) -> None:
        self.result = result
        self.canonical_digest = canonical_digest
        super().__init__(format_rejection(result, canonical_digest))


def format_rejection(result: ConformanceResult, canonical_digest: str) -> str:
    lines = [
        reject_line(f"seal is not conformant to {PSI_SCHEMA_ID}", PSI_RULE_CITATIONS["not_object"]),
        f"canonical schema digest: {canonical_digest}",
        f"received schema: {result.schema_id or '(none)'} (digest match: {'true' if result.schema_digest_match else 'false'})",
        "findings:",
    ]
    lines += [f"  {f}" for f in result.failures]
    lines += [
        f"generate a conformant seal: {PSI_SEAL_URL}",
        f"canonical schema: {PSI_SCHEMA_URL}",
        "legacy escape hatch (report-only): enforce=false",
        "verified, not asserted; trust the math, not the maker.",
    ]
    return "\n".join(lines)


def format_acceptance(signature_status: str = "verified", key_id: Optional[str] = None) -> str:
    """Canonical acceptance line. Byte-identical to the TypeScript distribution.

    Since v1.3.0 it cannot print a pass for a seal whose signature was never
    checked: only ``verified`` produces ACCEPT.
    """
    if signature_status == "verified":
        suffix = f" against {key_id}" if key_id else ""
        return f"PSI-SEAL v{PSI_VERIFIER_VERSION} ACCEPT: conformant seal; Ed25519 signature verified{suffix}"
    return (
        f"PSI-SEAL v{PSI_VERIFIER_VERSION} PARTIAL: conformant to the schema, "
        f"authenticity {signature_status} \u2014 a seal no key has signed is a formatting check, "
        "not a verification"
    )


# ── Ed25519 verification, RFC 8032 (pure Python, zero dependencies) ──
# Kept from the 1.3.0 the website builder pushed to GitHub on 17 Oct 2026,
# because it needs no third-party crypto library: a regulator with a plain
# Python install can check a real signature. In this merge it becomes the
# fallback primitive under psi_verify_signature, used when `cryptography` is not
# installed. The published key below is EXPORTED for callers who choose to
# trust it — it is not trusted by default, so the verifier never silently
# grades its own maker's homework.
PSI_PUBLIC_KEY_HEX = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724"

# ── Ed25519 verification, RFC 8032 (pure Python, zero dependencies) ──
_P = 2**255 - 19
_L = 2**252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, _P - 2, _P) % _P
_I = pow(2, (_P - 1) // 4, _P)


def _xrecover(y: int, sign: int) -> Optional[int]:
    xx = (y * y - 1) * pow(_D * y * y + 1, _P - 2, _P) % _P
    x = pow(xx, (_P + 3) // 8, _P)
    if (x * x - xx) % _P:
        x = x * _I % _P
    if (x * x - xx) % _P:
        return None
    if x == 0 and sign:
        return None
    if x & 1 != sign:
        x = _P - x
    return x


def _padd(a, b):
    x1, y1, z1, t1 = a
    x2, y2, z2, t2 = b
    A = (y1 - x1) * (y2 - x2) % _P
    B = (y1 + x1) * (y2 + x2) % _P
    C = 2 * t1 * t2 * _D % _P
    Dd = 2 * z1 * z2 % _P
    E, F, G, H = B - A, Dd - C, Dd + C, B + A
    return (E * F % _P, G * H % _P, F * G % _P, E * H % _P)


def _pmul(s: int, p):
    q = (0, 1, 1, 0)
    while s:
        if s & 1:
            q = _padd(q, p)
        p = _padd(p, p)
        s >>= 1
    return q


def _pdecode(b: bytes):
    if len(b) != 32:
        return None
    y = int.from_bytes(b, "little")
    sign = y >> 255
    y &= (1 << 255) - 1
    if y >= _P:
        return None
    x = _xrecover(y, sign)
    if x is None:
        return None
    return (x, y, 1, x * y % _P)


def _pequal(a, b) -> bool:
    return (a[0] * b[2] - b[0] * a[2]) % _P == 0 and (a[1] * b[2] - b[1] * a[2]) % _P == 0


_GY = 4 * pow(5, _P - 2, _P) % _P
_GX = _xrecover(_GY, 0)
_G = (_GX, _GY, 1, _GX * _GY % _P)


def verify_ed25519(message: bytes, signature_hex: str, public_key_hex: str) -> bool:
    """RFC 8032 Ed25519 verification. Never raises."""
    try:
        sig = bytes.fromhex(signature_hex or "")
        pub = bytes.fromhex(public_key_hex or "")
    except ValueError:
        return False
    if len(sig) != 64 or len(pub) != 32:
        return False
    A = _pdecode(pub)
    R = _pdecode(sig[:32])
    if A is None or R is None:
        return False
    s = int.from_bytes(sig[32:], "little")
    if s >= _L:
        return False
    k = int.from_bytes(hashlib.sha512(sig[:32] + pub + message).digest(), "little") % _L
    return _pequal(_pmul(s, _G), _padd(R, _pmul(k, A)))


def verify_seal(
    seal: Any,
    trust_roots: Union[str, Sequence[Union[str, Dict[str, Any]]], None] = None,
    require_valid_signature: bool = True,
    public_key_hex: Optional[str] = None,
) -> ConformanceResult:
    """Conformance check plus the R11 authenticity verdict. Never raises.

    Back-compat with v1.2.x, which took one hex key here: `verify_seal(seal,
    "5930…")` positionally, or `public_key_hex="5930…"`. Both spellings are read
    as one trusted key. Nothing is trusted by default — call it with no key and
    a signed seal comes back `unverifiable`, never as a pass.
    """
    roots: List[Union[str, Dict[str, Any]]] = []
    if isinstance(trust_roots, str):
        roots.append(trust_roots)
    elif trust_roots:
        roots.extend(trust_roots)
    if public_key_hex:
        roots.append(public_key_hex)
    if not isinstance(seal, dict):
        return ConformanceResult(
            False, None, False, False,
            [reject_line("input is not a JSON object", PSI_RULE_CITATIONS["not_object"])],
        )

    failures: List[str] = []
    expected = psi_schema_digest()

    if seal.get("schema") != PSI_SCHEMA_ID:
        failures.append(
            reject_line(
                f"schema identifier mismatch, expected {PSI_SCHEMA_ID}",
                PSI_RULE_CITATIONS["schema_identifier"],
            )
        )
    digest_match = seal.get("schema_digest") == expected
    if not digest_match:
        failures.append(reject_line("schema_digest mismatch", PSI_RULE_CITATIONS["schema_digest"]))

    extra = [k for k in seal if k not in _ALLOWED]
    if extra:
        failures.append(
            reject_line("unknown top-level fields: " + ", ".join(extra), PSI_RULE_CITATIONS["closed_field_set"])
        )
    if not _RFC3339_MS.match(str(seal.get("sealed_at") or "")):
        failures.append(
            reject_line(
                "sealed_at is not RFC 3339 UTC with three fractional digits",
                PSI_RULE_CITATIONS["sealed_at"],
            )
        )
    hash_hex = str(seal.get("hash") or "")
    if not _HEX64.match(hash_hex):
        failures.append(
            reject_line("hash is not 64 lowercase hexadecimal characters", PSI_RULE_CITATIONS["hash_encoding"])
        )

    subject = seal.get("subject")
    size = subject.get("size_bytes") if isinstance(subject, dict) else None
    if not isinstance(size, int) or isinstance(size, bool) or size < 0:
        failures.append(
            reject_line("subject.size_bytes is not a non-negative integer", PSI_RULE_CITATIONS["size_bytes"])
        )

    seal_hash_match = False
    computed_seal_hash = ""
    signature = seal.get("signature") if isinstance(seal.get("signature"), dict) else None
    merkle = seal.get("merkle") if isinstance(seal.get("merkle"), dict) else None
    if _HEX64.match(hash_hex) and merkle and merkle.get("leaf"):
        if psi_leaf(hash_hex) != merkle["leaf"]:
            failures.append(reject_line("merkle.leaf mismatch", PSI_RULE_CITATIONS["leaf_mismatch"]))
        if signature and signature.get("seal_hash"):
            computed_seal_hash = psi_seal_hash(seal)
            seal_hash_match = computed_seal_hash == signature["seal_hash"]
            if not seal_hash_match:
                failures.append(reject_line("seal_hash mismatch", PSI_RULE_CITATIONS["seal_hash"]))
        # v1.2.x put a second, coarser signature check here (one caller key, one
        # boolean, rule numbers 11.1/11.2 that clashed with the published rule
        # set). Removed in the 1.3.0 merge: running both emitted two rejection
        # lines for one defect, and the TypeScript and Python distributions then
        # stopped printing byte-identical verdicts. The single authority for R11
        # is psi_verify_signature below, shared with the TypeScript package.
    else:
        failures.append(reject_line("merkle.leaf missing", PSI_RULE_CITATIONS["leaf_missing"]))

    # R11 — authenticity, checked against the hash THIS verifier recomputed and
    # only against keys the caller supplied.
    check = psi_verify_signature(computed_seal_hash, signature, roots)
    if check["status"] == "invalid" or (require_valid_signature and check["status"] != "verified"):
        failures.append(reject_line(check["detail"], check["rule"]))

    schema_id = seal.get("schema")
    return ConformanceResult(
        conformant=not failures,
        schema_id=schema_id if isinstance(schema_id, str) else None,
        schema_digest_match=digest_match,
        seal_hash_match=seal_hash_match,
        # Back-compat for the v1.2.x boolean: true only when the signature was
        # actually checked and passed. Identical to `authentic`.
        signature_valid=check["status"] == "verified",
        failures=failures,
        signature_status=check["status"],
        authentic=check["status"] == "verified",
        trusted_key_id=check["key_id"],
    )


def verify(
    seal: Any,
    enforce: bool = True,
    trust_roots: Union[str, Sequence[Union[str, Dict[str, Any]]], None] = None,
    require_valid_signature: bool = True,
    public_key_hex: Optional[str] = None,
) -> ConformanceResult:
    """Primary entry point. Enforced by default (since v1.1.0).

    Raises ``PsiSealInvalidError`` when the seal is not PSI-SEAL/1 conformant.
    From v1.3.0 an unauthenticated seal is not conformant unless
    ``require_valid_signature=False`` is passed explicitly.
    """
    result = verify_seal(seal, trust_roots, require_valid_signature, public_key_hex)
    if not result.conformant and enforce:
        raise PsiSealInvalidError(result, psi_schema_digest())
    return result


def is_conformant(
    seal: Any,
    trust_roots: Sequence[Union[str, Dict[str, Any]]] = (),
    require_valid_signature: bool = True,
) -> bool:
    return verify_seal(seal, trust_roots, require_valid_signature).conformant


def merkle_root(leaves: Sequence[str]) -> str:
    """Canonical Merkle root (R8) — promoted odd node, raw 32-byte concatenation."""
    if not leaves:
        raise ValueError("R8: at least one leaf required")
    level = [bytes.fromhex(leaf.lower()) for leaf in leaves]
    while len(level) > 1:
        nxt = []
        for i in range(0, len(level), 2):
            if i + 1 == len(level):
                nxt.append(level[i])
            else:
                nxt.append(hashlib.sha256(level[i] + level[i + 1]).digest())
        level = nxt
    return level[0].hex()


__all__ = [
    "PSI_SCHEMA_ID",
    "PSI_RULE_CITATIONS",
    "PSI_VERIFIER_VERSION",
    "reject_line",
    "PSI_SCHEMA_RULES",
    "PSI_SEAL_URL",
    "PSI_SCHEMA_URL",
    "ConformanceResult",
    "PsiSealInvalidError",
    "format_acceptance",
    "format_rejection",
    "is_conformant",
    "jcs",
    "merkle_root",
    "psi_key_fingerprint",
    "psi_leaf",
    "psi_schema_digest",
    "psi_schema_digest_from_document",
    "psi_seal_hash",
    "psi_verify_signature",
    "verify_ed25519",
    "PSI_PUBLIC_KEY_HEX",
    "verify",
    "verify_seal",
    "__version__",
]
