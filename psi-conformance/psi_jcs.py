#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# PSI JCS — RFC 8785 canonicalisation, Python standard library only.
#
# WHY THIS FILE EXISTS
# The frozen core spec (PSI-SEAL/1, rule R1) says canonicalisation is
# RFC 8785 JCS and that every implementation must use its language's real JCS
# library. The production TypeScript does exactly that (src/lib/
# psi-canonicalize.ts wraps the `canonicalize` npm package). The conformance
# runner, however, used json.dumps(sort_keys=True, ensure_ascii=True) — an
# ASCII-only APPROXIMATION. It agrees with RFC 8785 on pure-ASCII payloads and
# diverges on everything else:
#
#   payload            RFC 8785 / production       old conformance.py
#   {"café":1}         {"café":1}                  {"caf\u00e9":1}
#   key "😀"           raw UTF-8 bytes             "\ud83d\ude00"
#   -0.0               0                           -0.0
#   1e21               1e+21                       1e+21 (via repr)
#   key sort           UTF-16 code units           Unicode code points
#
# That gap matters because the vectors are supposed to be THE CONTRACT. A
# bystander implementing real JCS would have failed our own suite, or worse,
# passed it while disagreeing with production on non-ASCII evidence.
#
# This module implements the real thing, stdlib-only, and is validated by
# jcs_verify.py against an independent RFC 8785 library over thousands of
# generated and hand-picked cases. Do not "simplify" it back to json.dumps.
# ═══════════════════════════════════════════════════════════════════════
from __future__ import annotations

import decimal
import math
from typing import Any

# RFC 8785 §3 / ES6 JSON.stringify: escape quotation mark and reverse solidus,
# the four short escapes, and every code unit < 0x20. Everything else is emitted
# as raw UTF-8.
_SHORT = {0x22: '\\"', 0x5C: "\\\\", 0x08: "\\b", 0x09: "\\t", 0x0A: "\\n",
          0x0C: "\\f", 0x0D: "\\r"}


def utf16_code_units(s: str) -> list:
    """The string as a sequence of UTF-16 code units, which is the unit RFC 8785
    sorting operates on. Python compares code points, so a non-BMP character
    (one code point) and a high BMP character (one code unit) can order
    differently from JS. This is the whole reason this function exists."""
    units = []
    for ch in s:
        cp = ord(ch)
        if cp > 0xFFFF:
            v = cp - 0x10000
            units.append(0xD800 + (v >> 10))
            units.append(0xDC00 + (v & 0x3FF))
        else:
            units.append(cp)
    return units


def _code_unit_key(s: str):
    """Comparator emulating UTF-16 code-unit lexicographic order."""
    return tuple(utf16_code_units(s))


def jcs_escape_string(s: str) -> str:
    out = ['"']
    units = utf16_code_units(s)
    n = len(units)
    i = 0
    while i < n:
        cp = units[i]
        if cp in _SHORT:
            out.append(_SHORT[cp])
            i += 1
            continue
        if cp < 0x20:
            out.append("\\u%04x" % cp)
            i += 1
            continue
        if 0xD800 <= cp <= 0xDBFF:
            # high surrogate: must be followed by its low surrogate, and the
            # pair is emitted as one raw UTF-8 character (an astral code point).
            if i + 1 >= n or not (0xDC00 <= units[i + 1] <= 0xDFFF):
                raise ValueError("JCS: unpaired surrogate in string %r" % s)
            value = 0x10000 + ((cp - 0xD800) << 10) + (units[i + 1] - 0xDC00)
            out.append(chr(value))
            i += 2
            continue
        if 0xDC00 <= cp <= 0xDFFF:
            raise ValueError("JCS: unpaired low surrogate in string %r" % s)
        out.append(chr(cp))
        i += 1
    out.append('"')
    return "".join(out)


def _significand(a: float):
    """For a positive finite double a, return (n_str, k, e) where n_str is the
    shortest decimal digit string with no leading or trailing zeros, k = len
    (n_str), and a == int(n_str) * 10**(e - k). This is exactly the (n, k, e)
    triple ECMAScript Number::toString works from.

    decimal.Decimal(repr(a)) is exact in base 10 and repr() already trims to the
    fewest digits that round-trip, so the coefficient and decimal exponent come
    straight off the tuple - no Grisu/Ryu reimplementation needed."""
    tup = decimal.Decimal(repr(a)).as_tuple()   # a == int(digits) * 10**exponent
    digits = "".join(str(x) for x in tup.digits)
    n_str = digits.rstrip("0") or "0"
    trailing = len(digits) - len(n_str)
    k = len(n_str)
    e = k + tup.exponent + trailing
    return n_str, k, e


def jcs_number(v) -> str:
    """ECMAScript Number::toString (ES2023 7.1.20.1.1), as required by R1.

    The exponent-vs-plain-integer boundary is decided by k and e exactly as the
    standard defines them, which is why this is spelled out by hand: Python's
    repr(1e20) == '1e+20', but the standard requires the full
    '100000000000000000000' because k=1 and e=21 falls in the k<=e<=21 branch.
    NaN and Infinity are not serialisable under RFC 8785; -0 collapses to "0".
    """
    if isinstance(v, bool):
        raise ValueError("JCS: booleans are not numbers")
    f = float(v)
    if math.isnan(f) or math.isinf(f):
        raise ValueError("JCS: NaN and Infinity are not serialisable")
    if f == 0.0:
        return "0"                         # both -0 and +0
    sign = "-" if f < 0 else ""
    n_str, k, e = _significand(abs(f))
    if k <= e <= 21:                       # integer, written out in full
        return sign + n_str + "0" * (e - k)
    if 0 < e <= 21:                        # decimal point inside the digits
        return sign + n_str[:e] + "." + n_str[e:]
    if -6 < e <= 0:                        # 0.00ddd, still not exponent form
        return sign + "0." + "0" * (-e) + n_str
    # otherwise exponent form: mantissa from n, power-of-ten exponent e-1
    mantissa = n_str if k == 1 else n_str[0] + "." + n_str[1:]
    exp = e - 1
    return sign + mantissa + "e" + ("+" if exp >= 0 else "-") + str(abs(exp))


def jcs(value: Any) -> str:
    """Serialise to RFC 8785 canonical JSON. Returns str; encode to UTF-8 for hashing."""
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        return jcs_escape_string(value)
    if isinstance(value, (int, float)):
        return jcs_number(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(jcs(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=_code_unit_key)
        if not all(isinstance(k, str) for k in keys):
            raise ValueError("JCS: object keys must be strings")
        seen = set()
        for k in keys:
            cu = tuple(utf16_code_units(k))
            if cu in seen:
                raise ValueError("JCS: duplicate key after UTF-16 comparison: %r" % k)
            seen.add(cu)
        return "{" + ",".join(jcs_escape_string(k) + ":" + jcs(value[k]) for k in keys) + "}"
    raise TypeError("JCS: unsupported type %r" % type(value))


def jcs_bytes(value: Any) -> bytes:
    """Canonical UTF-8 octets — this is what R5/R10 hash."""
    return jcs(value).encode("utf-8")
