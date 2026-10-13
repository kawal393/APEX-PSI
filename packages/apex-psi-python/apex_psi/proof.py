"""Offline RFC 6962 / RFC 9162 inclusion-proof verification (stdlib only)."""
import hashlib, json, urllib.request

ENDPOINT = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/merkle-proof"


def _leaf(hex_leaf: str) -> bytes:
    return hashlib.sha256(b"\x00" + bytes.fromhex(hex_leaf)).digest()


def _node(l: bytes, r: bytes) -> bytes:
    return hashlib.sha256(b"\x01" + l + r).digest()


def verify_inclusion(leaf: str, index: int, tree_size: int, audit_path: list, root: str) -> bool:
    """RFC 9162 §2.1.3.2 algorithm. Returns True only if the path recomputes root."""
    if index >= tree_size:
        return False
    fn, sn, r = index, tree_size - 1, _leaf(leaf)
    for p in audit_path:
        p = bytes.fromhex(p)
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = _node(p, r)
            if not fn & 1:
                while fn and not fn & 1:
                    fn >>= 1; sn >>= 1
        else:
            r = _node(r, p)
        fn >>= 1; sn >>= 1
    return sn == 0 and r.hex() == root.removeprefix("sha256:")


def fetch_proof(receipt_id: str, endpoint: str = ENDPOINT) -> dict:
    with urllib.request.urlopen(f"{endpoint}?receipt_id={receipt_id}", timeout=15) as r:
        return json.loads(r.read())
