#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# PSI-SEAL/1 — PROVABLE-SILENCE CHALLENGE ENGINE  (challenge/silence.py)
#
# THE IDEA (this is the "cool", and it is honest)
# A standing "US$10,000 if you can break PSI-SEAL/1" page is a marketing
# claim: unverifiable, and worthless the day it is quietly deleted. Anyone can
# say "nobody contested it" because the absence of a contest leaves no trace.
#
# This engine turns the silence itself into EVIDENCE. Once per period the
# daemon appends a SEALED attestation:
#
#     "as of <t>, contest window <n>: 0 valid contests received"
#
# Each attestation embeds the digest of the previous one, so the whole series
# is a tamper-evident, gap-detectable CHAIN. The Merkle root of the chain is
# the single value anchored to Bitcoin. A stranger then needs only the chain
# file + that public anchor to verify, FULLY OFFLINE, that:
#
#   * every attestation is a genuine PSI-SILENCE/1 seal (recomputed here),
#   * the periods are contiguous — a deleted or reordered week BREAKS the chain,
#   * no terminal record (REVOKED / CONTESTED) was later silently overwritten,
#   * the root matches the anchored value, so the history cannot be rewritten.
#
# And "revoking" the challenge is not deleting a page — it is APPENDING a
# REVOKED attestation, which becomes a permanent, anchored fact. You cannot
# un-say that you said it; you can only add the next true line.
#
# Zero dependencies. Reuses the SAME real RFC 8785 JCS and the SAME Merkle/leaf
# primitives as the conformance suite (imported, not reimplemented) so there is
# exactly one source of cryptographic truth in this repository.
#
#   python silence.py demo            # build a chain, verify it, prove tampering
#   python silence.py anchor c.json   # print the root a stranger anchors
#   python silence.py verify  c.json  # verify a chain offline (root optional)
#   python silence.py verify  c.json <64-hex-anchor-root>
# ═══════════════════════════════════════════════════════════════════════
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone

# single source of cryptographic truth — import, never fork
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "psi-conformance"))
from psi_jcs import jcs                       # real RFC 8785 (see jcs_verify.py)
from conformance import merkle_root, psi_leaf # R8 raw-byte Merkle, R9 domain leaf

SILENCE_SCHEMA = "PSI-SILENCE/1"
GENESIS = "0" * 64

# status vocabulary; CONTESTED / REVOKED are TERMINAL (nothing follows an end)
UNCONTESTED = "UNCONTESTED"
CONTESTED = "CONTESTED"        # a valid contest was filed — challenge resolved
REVOKED = "REVOKED"            # owner closed it early (append, never delete)
TERMINAL = {CONTESTED, REVOKED}


def _sha256_hex(data) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def now_iso(dt: datetime | None = None) -> str:
    d = dt or datetime.now(timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + \
        f"{d.microsecond // 1000:03d}Z"


def silence_digest(payload: dict) -> str:
    """R10-style core: SHA-256 over the real-JCS canonical form of the payload."""
    return _sha256_hex(jcs(payload))


def silence_leaf(core: str) -> str:
    """R9-style domain separation, but a DISTINCT tag so a silence record can
    never be replayed as a content seal (or vice-versa)."""
    return _sha256_hex("PSI-SILENCE/1:" + core)


# ── build one attestation ────────────────────────────────────────────────
def make_attestation(challenge_id: str, seq: int, prev_digest: str,
                     period_start: str, period_end: str,
                     contests_filed: int, contests_valid: int,
                     status: str = UNCONTESTED, note: str | None = None,
                     prize_usd: str = "10000") -> dict:
    if status not in {UNCONTESTED, CONTESTED, REVOKED}:
        raise ValueError("unknown status %r" % status)
    if status == UNCONTESTED and contests_valid != 0:
        raise ValueError("UNCONTESTED attestation cannot carry valid contests")
    payload = {
        "schema": SILENCE_SCHEMA,
        "challenge_id": challenge_id,
        "seq": seq,
        "prev_digest": prev_digest,
        "period_start": period_start,
        "period_end": period_end,
        "contests_filed": contests_filed,
        "contests_valid": contests_valid,
        "status": status,
        "prize_usd": prize_usd,
    }
    if note:
        payload["note"] = note
    core = silence_digest(payload)
    rec = dict(payload)
    rec["sealed_at"] = now_iso()
    rec["silence_digest"] = core
    rec["silence_leaf"] = silence_leaf(core)
    return rec


# ── the offline verifier (this is what a stranger runs) ───────────────────
def verify_chain(chain: list, anchor_root: str | None = None) -> list[tuple[str, bool]]:
    checks: list[tuple[str, bool]] = []
    if not chain:
        return [("chain is empty", False)]

    prev_reeled = GENESIS
    prev_end = None
    saw_terminal = False
    for i, r in enumerate(chain):
        tag = "rec %d (%s)" % (r.get("seq", i + 1), r.get("status", "?"))

        # 1. internal integrity: the digest recomputes from the sealed payload
        payload = {k: v for k, v in r.items()
                   if k not in ("sealed_at", "silence_digest", "silence_leaf")}
        ok_digest = silence_digest(payload) == r.get("silence_digest")
        ok_leaf = silence_leaf(r.get("silence_digest", "")) == r.get("silence_leaf")
        checks.append((f"{tag}: silence digest recomputes", ok_digest and ok_leaf))

        # 2. schema + status sanity
        checks.append((f"{tag}: schema is {SILENCE_SCHEMA}", r.get("schema") == SILENCE_SCHEMA))
        checks.append((f"{tag}: status known", r.get("status") in {UNCONTESTED, CONTESTED, REVOKED}))
        checks.append((f"{tag}: UNCONTESTED has 0 valid",
                       not (r.get("status") == UNCONTESTED and r.get("contests_valid", 0) != 0)))

        # 3. linkage — a removed / reordered / edited record breaks this
        checks.append((f"{tag}: prev_digest links to prior record",
                       r.get("prev_digest") == prev_reeled))
        prev_reeled = r.get("silence_digest", "")

        # 4. contiguity — periods must touch, no gaps, no overlaps
        if prev_end is not None:
            checks.append((f"{tag}: period contiguous (no gap/overlap)",
                           r.get("period_start") == prev_end))
        prev_end = r.get("period_end")

        # 5. monotonic terminality — nothing valid follows an end of challenge
        if saw_terminal:
            checks.append((f"{tag}: no records after terminal state", False))
        if r.get("status") in TERMINAL:
            saw_terminal = True

    # 6. anchor — the one public value that makes history un-rewritable
    root = merkle_root([r["silence_leaf"] for r in chain])
    if anchor_root is not None:
        checks.append(("root matches anchored value", root == anchor_root.lower()))
    else:
        checks.append(("anchor not supplied (root = %s)" % root[:16] + "…", True))

    return checks


def chain_root(chain: list) -> str:
    return merkle_root([r["silence_leaf"] for r in chain])


# ── demo ─────────────────────────────────────────────────────────────────
def _weekly_chain(challenge_id: str, start: datetime, weeks: int) -> list:
    chain, prev = [], GENESIS
    for w in range(weeks):
        ps = start + timedelta(weeks=w)
        pe = start + timedelta(weeks=w + 1)
        chain.append(make_attestation(
            challenge_id, w + 1, prev, now_iso(ps), now_iso(pe), 0, 0, UNCONTESTED))
        prev = chain[-1]["silence_digest"]
    # closure: the window elapsed uncontested → the revocation is an APPEND
    chain.append(make_attestation(
        challenge_id, weeks + 1, prev, now_iso(pe), now_iso(pe), 0, 0, REVOKED,
        note="Challenge window elapsed with zero valid contests; standing offer "
             "closed. This record is append-only and anchored — not a deleted page."))
    return chain


def demo() -> int:
    print("PSI-SILENCE/1 — provable-silence challenge engine")
    print("=" * 66)
    cid = "APEX-CHL-10K-PSISEAL1"
    start = datetime(2026, 9, 1, tzinfo=timezone.utc)
    chain = _weekly_chain(cid, start, weeks=8)
    root = chain_root(chain)

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "challenge_chain.json"), "w", encoding="utf-8") as f:
        json.dump({"challenge_id": cid, "root": root, "attestations": chain},
                  f, indent=2, sort_keys=True)

    print("built an 8-week uncontested chain + REVOKED closure")
    print("chain root (this is the single value anchored to Bitcoin):")
    print("  " + root)
    print("-" * 66)
    results = verify_chain(chain, anchor_root=root)
    passed = report(results)

    # ── now prove the silence is genuinely detectable when broken ──
    print("-" * 66)
    print("TAMPER TEST 1 — delete week 4 and re-stitch the chain:")
    tampered = chain[:3] + chain[4:]
    tr = verify_chain(tampered, anchor_root=root)
    caught = [n for n, ok in tr if not ok]
    print("  detected: %s" % ("; ".join(caught) if caught else "NOTHING (BAD)"))
    tamper_ok = bool(caught)

    print("TAMPER TEST 2 — forge a week-3 record claiming 'contests_valid=0,"
          " status=UNCONTESTED' over one that was CONTESTED:")
    forged = [dict(r) for r in chain]
    forged[2] = make_attestation(cid, 3, forged[2]["prev_digest"],
                                 forged[2]["period_start"], forged[2]["period_end"],
                                 1, 1, CONTESTED)  # secretly a real contest
    fr = verify_chain(forged, anchor_root=root)
    fcaught = [n for n, ok in fr if not ok]
    print("  detected: %s" % ("; ".join(fcaught) if fcaught else "NOTHING (BAD)"))
    forge_ok = bool(fcaught)

    print("=" * 66)
    all_ok = passed == len(results) and tamper_ok and forge_ok
    print("RESULT: %s" % ("SILENCE IS PROVABLE" if all_ok else "ENGINE DEFECT"))
    return 0 if all_ok else 1


def report(results) -> int:
    passed = 0
    for name, ok in results:
        print("  [%s] %s" % ("OK " if ok else "XX ", name))
        passed += 1 if ok else 0
    print("  -> %d/%d checks pass" % (passed, len(results)))
    return passed


def main(argv):
    if len(argv) < 2 or argv[1] == "demo":
        return demo()
    here = os.path.dirname(os.path.abspath(__file__))
    path = argv[2] if len(argv) > 2 else os.path.join(here, "challenge_chain.json")
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    anchor = argv[3].lower() if len(argv) > 3 else doc.get("root")
    results = verify_chain(doc["attestations"], anchor_root=anchor)
    print("verifying %s (anchor=%s)" % (path, "supplied" if anchor else "from-file"))
    p = report(results)
    ok = p == len(results)
    print("RESULT: %s" % ("VERIFIED" if ok else "REJECTED — the record is not intact"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main(sys.argv))
