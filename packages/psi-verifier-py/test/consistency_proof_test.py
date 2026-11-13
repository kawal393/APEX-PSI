#!/usr/bin/env python3
"""Proof the R13.2 consistency check, not just that it runs.

Every (first, second) size pair up to 64 leaves is generated and verified,
then every single-node mutation of a valid proof must be refused. A check that
cannot fail is not a check.
"""

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from psi_verifier import (  # noqa: E402
    psi_consistency_path,
    psi_tree_head,
    psi_verify_consistency,
)

FAILURES = []


def expect(condition, message):
    if not condition:
        FAILURES.append(message)


def leaves(count):
    return [hashlib.sha256(bytes([i])).hexdigest() for i in range(count)]


def main():
    all_leaves = leaves(64)

    # 1. every size pair verifies
    pairs = 0
    for second in range(1, 65):
        for first in range(1, second + 1):
            old = all_leaves[:first]
            new = all_leaves[:second]
            old_head = psi_tree_head(old)
            new_head = psi_tree_head(new)
            if first == second:
                proof = {
                    "first_size": first,
                    "second_size": second,
                    "first_root": old_head,
                    "second_root": new_head,
                    "consistency_path": [],
                }
            else:
                proof = {
                    "first_size": first,
                    "second_size": second,
                    "first_root": old_head,
                    "second_root": new_head,
                    "consistency_path": psi_consistency_path(old, new),
                }
            result = psi_verify_consistency(proof)
            expect(
                result["status"] == "consistent",
                f"({first},{second}) did not verify: {result['status']} {result['detail']}",
            )
            pairs += 1
    print(f"size pairs verified: {pairs}")

    # 2. a single flipped node must break it
    tampered = 0
    for second in range(2, 33):
        for first in range(1, second):
            old = all_leaves[:first]
            new = all_leaves[:second]
            path = psi_consistency_path(old, new)
            if not path:
                continue
            for index in range(len(path)):
                broken = list(path)
                node = bytearray(bytes.fromhex(broken[index]))
                node[0] ^= 0x01
                broken[index] = node.hex()
                result = psi_verify_consistency(
                    {
                        "first_size": first,
                        "second_size": second,
                        "first_root": psi_tree_head(old),
                        "second_root": psi_tree_head(new),
                        "consistency_path": broken,
                    }
                )
                expect(
                    result["status"] != "consistent",
                    f"({first},{second}) accepted a proof with node {index} altered",
                )
                tampered += 1
    print(f"tampered proofs refused: {tampered}")

    # 3. the split view: two different trees at the same claimed size
    fork = leaves(32)
    forked = list(fork)
    forked[7] = hashlib.sha256(b"fork").hexdigest()
    result = psi_verify_consistency(
        {
            "first_size": 8,
            "second_size": 8,
            "first_root": psi_tree_head(fork[:8]),
            "second_root": psi_tree_head(forked[:8]),
            "consistency_path": [],
        }
    )
    expect(result["status"] == "mismatch", f"a forked head passed: {result}")
    print(f"split-view at equal size: {result['status']}")

    # 4. a proof for one pair of trees must not verify against another
    honest = psi_consistency_path(all_leaves[:5], all_leaves[:9])
    result = psi_verify_consistency(
        {
            "first_size": 5,
            "second_size": 9,
            "first_root": psi_tree_head(all_leaves[:5]),
            "second_root": psi_tree_head(all_leaves[:6]),
            "consistency_path": honest,
        }
    )
    expect(result["status"] != "consistent", "a proof verified against the wrong new head")
    print(f"wrong second head: {result['status']}")

    # 5. malformed inputs are refused, not guessed
    for bad, why in [
        ({"first_size": 0, "second_size": 4, "first_root": "00" * 32, "second_root": "11" * 32,
          "consistency_path": []}, "zero size"),
        ({"first_size": 9, "second_size": 4, "first_root": "00" * 32, "second_root": "11" * 32,
          "consistency_path": []}, "second smaller than first"),
        ({"first_size": "4", "second_size": 8, "first_root": "00" * 32, "second_root": "11" * 32,
          "consistency_path": []}, "size as a string"),
        ({"first_size": 4, "second_size": 8, "first_root": "zz" * 32, "second_root": "11" * 32,
          "consistency_path": []}, "root is not hex"),
        ({"first_size": 4, "second_size": 8, "first_root": "00" * 32, "second_root": "11" * 32,
          "consistency_path": ["nothex"]}, "path node is not hex"),
        ({"first_size": 4, "second_size": 8, "first_root": "00" * 32, "second_root": "11" * 32,
          "consistency_path": []}, "empty path between different trees"),
    ]:
        result = psi_verify_consistency(bad)
        expect(result["status"] == "malformed", f"{why} was not refused: {result}")
    print("malformed inputs refused: 6")

    # 6. the generator refuses to invent a proof for a tree that is not a prefix
    try:
        psi_consistency_path(all_leaves[:4], all_leaves[:8][:3] + [hashlib.sha256(b"x").hexdigest()])
        FAILURES.append("the generator accepted a non-prefix old tree")
    except ValueError:
        pass
    print("non-prefix generator input refused")

    if FAILURES:
        print()
        for line in FAILURES[:20]:
            print("FAIL:", line)
        print(f"{len(FAILURES)} failure(s)")
        return 1
    print()
    print("all consistency-proof checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
