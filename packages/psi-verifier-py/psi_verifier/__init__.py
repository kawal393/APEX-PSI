"""psi-verifier — MIT licensed. Free forever.

Verifies that a PSI seal conforms, byte for byte, to the copyrighted
PSI-SEAL/1 canonical schema. Verification is open to everyone; producing
conformant seals requires the licensed APEX PSI Sealing Engine.

Zero dependencies. Python 3.8+.

v1.1.1 — PARITY RELEASE: ``verify()`` rejects non-conformant seals by default
(``enforce=True``) and every rejection line is byte-identical to the
TypeScript distribution, carrying a readable rule citation.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

__version__ = "1.1.1"
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


@dataclass
class ConformanceResult:
    conformant: bool
    schema_id: Optional[str]
    schema_digest_match: bool
    seal_hash_match: bool
    failures: List[str] = field(default_factory=list)


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


def format_acceptance() -> str:
    """Canonical acceptance line. Byte-identical to the TypeScript distribution."""
    return f"PSI-SEAL v{PSI_VERIFIER_VERSION} ACCEPT: conformant seal"


def verify_seal(seal: Any) -> ConformanceResult:
    """Report-only conformance check. Never raises."""
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
    merkle = seal.get("merkle") if isinstance(seal.get("merkle"), dict) else None
    if _HEX64.match(hash_hex) and merkle and merkle.get("leaf"):
        if psi_leaf(hash_hex) != merkle["leaf"]:
            failures.append(reject_line("merkle.leaf mismatch", PSI_RULE_CITATIONS["leaf_mismatch"]))
        signature = seal.get("signature") if isinstance(seal.get("signature"), dict) else None
        if signature and signature.get("seal_hash"):
            seal_hash_match = psi_seal_hash(seal) == signature["seal_hash"]
            if not seal_hash_match:
                failures.append(reject_line("seal_hash mismatch", PSI_RULE_CITATIONS["seal_hash"]))
    else:
        failures.append(reject_line("merkle.leaf missing", PSI_RULE_CITATIONS["leaf_missing"]))

    schema_id = seal.get("schema")
    return ConformanceResult(
        conformant=not failures,
        schema_id=schema_id if isinstance(schema_id, str) else None,
        schema_digest_match=digest_match,
        seal_hash_match=seal_hash_match,
        failures=failures,
    )


def verify(seal: Any, enforce: bool = True) -> ConformanceResult:
    """Primary entry point. Enforced by default (since v1.1.0).

    Raises ``PsiSealInvalidError`` when the seal is not PSI-SEAL/1 conformant.
    """
    result = verify_seal(seal)
    if not result.conformant and enforce:
        raise PsiSealInvalidError(result, psi_schema_digest())
    return result


def is_conformant(seal: Any) -> bool:
    return verify_seal(seal).conformant


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
    "psi_leaf",
    "psi_schema_digest",
    "psi_schema_digest_from_document",
    "psi_seal_hash",
    "verify",
    "verify_seal",
    "__version__",
]
