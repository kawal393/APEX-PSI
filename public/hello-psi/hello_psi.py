#!/usr/bin/env python3
"""hello_psi.py - Hello PSI reference implementation.

Python 3, standard library only (hashlib, json, unicodedata).
MIT. Free forever. No permission required.

Implements PSI-SEAL/1.0.0 rules R1-R10:
  R1  RFC 8785 JCS canonicalisation, UTF-8, no BOM
  R3  field order: schema, schema_digest, sealed_at, subject, hash, merkle
  R4  lowercase hex digests, 64 chars
  R5  hash = SHA-256 over the raw octet stream of the subject
  R6  sealed_at = RFC 3339 UTC, exactly three fractional digits, literal Z
  R7  subject.name NFC-normalised, subject.size_bytes exact octet length
  R9  merkle.leaf = SHA-256("PSI1:" + hash)
  R10 seal_hash = SHA-256(JCS(envelope))

Spec: https://ai-governance-standard.com/.well-known/psi-schema.json
Verify it yourself:  python3 hello_psi.py "Hello, PSI."
"""

import hashlib
import json
import sys
import unicodedata

SCHEMA_ID = "PSI-SEAL/1.0.0"
VECTOR_SEALED_AT = "2026-01-01T00:00:00.000Z"
SUBJECT_NAME = "hello-psi-input"
# SHA-256 over the JCS form of the live /.well-known/psi-schema.json.
SCHEMA_DIGEST = "__SCHEMA_DIGEST__"

_ESCAPES = {
    '"': '\\"',
    "\\": "\\\\",
    "\b": "\\b",
    "\t": "\\t",
    "\n": "\\n",
    "\f": "\\f",
    "\r": "\\r",
}


def sha256_hex(data):
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _jcs_string(value):
    out = ['"']
    for ch in value:
        if ch in _ESCAPES:
            out.append(_ESCAPES[ch])
        elif ord(ch) < 0x20:
            out.append("\\u%04x" % ord(ch))
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def jcs(value):
    """RFC 8785 JSON Canonicalization Scheme (subset used by PSI envelopes)."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("JCS: non-finite number")
        if value.is_integer():
            return str(int(value))
        return repr(value)
    if isinstance(value, str):
        return _jcs_string(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(jcs(v) for v in value) + "]"
    if isinstance(value, dict):
        # JCS sorts member names by UTF-16 code units.
        keys = sorted(value.keys(), key=lambda k: k.encode("utf-16-be"))
        return "{" + ",".join(_jcs_string(k) + ":" + jcs(value[k]) for k in keys) + "}"
    raise TypeError("JCS: unsupported type %r" % type(value))


def seal(text, sealed_at=VECTOR_SEALED_AT, subject_name=SUBJECT_NAME):
    raw = text.encode("utf-8")
    digest = sha256_hex(raw)
    leaf = sha256_hex("PSI1:" + digest)
    envelope = {
        "schema": SCHEMA_ID,
        "schema_digest": SCHEMA_DIGEST,
        "sealed_at": sealed_at,
        "subject": {
            "name": unicodedata.normalize("NFC", subject_name),
            "size_bytes": len(raw),
        },
        "hash": digest,
        "merkle": {"leaf": leaf},
    }
    return envelope, sha256_hex(jcs(envelope))


if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else ""
    env, seal_hash = seal(text)
    print(json.dumps(env, indent=2, ensure_ascii=False))
    print("seal_hash: " + seal_hash)
