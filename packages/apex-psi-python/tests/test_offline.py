import hashlib, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from apex_psi.proof import verify_inclusion, _leaf, _node

def mth(ls):
    if len(ls) == 1: return ls[0]
    k = 1
    while k * 2 < len(ls): k *= 2
    return _node(mth(ls[:k]), mth(ls[k:]))

def path(m, ls):
    if len(ls) <= 1: return []
    k = 1
    while k * 2 < len(ls): k *= 2
    return path(m, ls[:k]) + [mth(ls[k:])] if m < k else path(m - k, ls[k:]) + [mth(ls[:k])]

def test_all_sizes():
    for n in range(1, 40):
        raw = [hashlib.sha256(str(i).encode()).hexdigest() for i in range(n)]
        hs = [_leaf(x) for x in raw]
        root = mth(hs).hex()
        for i in range(n):
            p = [x.hex() for x in path(i, hs)]
            assert verify_inclusion(raw[i], i, n, p, root)
            if p:
                bad = p[:]; bad[0] = "00" * 32
                assert not verify_inclusion(raw[i], i, n, bad, root)

if __name__ == "__main__":
    test_all_sizes(); print("offline inclusion tests OK")
