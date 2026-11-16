"""Execution gate — seal before you act.

A recorder that runs beside an agent is voluntary. If the agent, the operator or
a compromised host decides not to call it, nothing is recorded and nothing is
missing from the log; the log is complete and useless. A gate inverts the
order: the side effect is not attempted until a receipt exists for the exact
arguments it will run with, and a seal that fails is a refusal, not a warning.

What this enforces, precisely: the order, inside the process that performs the
side effect. It cannot reach a process that never routes its side effect
through the gate, and it cannot attest what a model did inside a GPU. What it
leaves behind is a receipt for every action that went through it, covering the
arguments that action ran with.

Two sealers, and the difference between them matters:

  LocalSealer  — stdlib only, no network. A hash chain in this process. Proves
                 order and arguments. Not a ledger receipt: no signature from
                 anyone else, no independent time.
  NotarySealer — the hosted APEX PSI notary. Returns a ledger receipt carrying
                 the notary's signatures over the fingerprint. Only the SHA-256
                 fingerprint is sent, so the notary never sees the contents of
                 the action.

Both are called with the action as data. Neither can see inside the model.
"""
import asyncio
import json
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone

from .client import ENDPOINT, fingerprint
from .recorder import entry_hash

GENESIS = "0" * 64


class GateClosed(RuntimeError):
    """The action was refused because no receipt could be produced for it."""

    def __init__(self, reason, action=None):
        super().__init__(reason)
        self.reason = reason
        self.action = action


class GateResult:
    """What came out of the gate: the value, and the receipt that let it happen."""

    def __init__(self, value, receipt, action):
        self.value = value
        self.receipt = receipt
        self.action = action

    @property
    def decision_hash(self):
        return self.receipt.get("decision_hash")

    def __repr__(self):
        return f"GateResult(value={self.value!r}, decision_hash={self.decision_hash!r})"


def _jsonable(v):
    try:
        json.dumps(v)
        return v
    except TypeError:
        if hasattr(v, "model_dump"):
            return _jsonable(v.model_dump())
        if isinstance(v, dict):
            return {str(k): _jsonable(x) for k, x in v.items()}
        if isinstance(v, (list, tuple)):
            return [_jsonable(x) for x in v]
        return str(v)


class LocalSealer:
    """Seals into an in-process hash chain. No network, no account, no clock anyone else can check."""

    def __init__(self, label=None):
        self.entries = []
        self.label = label
        self._lock = threading.Lock()

    def __call__(self, action):
        with self._lock:
            seq = len(self.entries)
            ts = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
            prev = self.entries[-1]["entry_hash"] if self.entries else GENESIS
            payload_sha = fingerprint(action)
            entry = {
                "seq": seq,
                "ts": ts,
                "kind": "gate",
                "payload_sha256": payload_sha,
                "prev": prev,
            }
            entry["entry_hash"] = entry_hash(entry)
            self.entries.append(entry)
        return {
            "receipt_id": f"LOCAL-{entry['entry_hash'][:16]}",
            "decision_hash": "sha256:" + payload_sha,
            "algorithm": "sha256-local-chain",
            "scope": "local",
            "entry": entry,
        }


class NotarySealer:
    """Seals the fingerprint of the action in the hosted APEX PSI ledger."""

    def __init__(self, endpoint=ENDPOINT, api_key=None, label=None, timeout=20):
        self.endpoint = endpoint
        self.api_key = api_key
        self.label = label
        self.timeout = timeout

    def __call__(self, action):
        digest = fingerprint(action)
        body = {"decision": "sha256:" + digest, "context": self.label or "gate"}
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-apex-api-key"] = self.api_key
        req = urllib.request.Request(self.endpoint, json.dumps(body).encode(), headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                receipt = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"APEX PSI {e.code}: {e.read().decode()[:300]}") from None
        receipt.setdefault("decision_hash", "sha256:" + digest)
        receipt["scope"] = "ledger"
        return receipt


class ExecutionGate:
    """Runs an action only after a receipt for it exists.

    Without a sealer the gate is closed: `ExecutionGate()` refuses every action.
    That is the point — a gate nobody configured must not look like a gate that
    is working.
    """

    def __init__(self, sealer=None, label=None):
        self.sealer = sealer
        self.label = label
        self.receipts = []

    def permit(self, action):
        """Seal `action` and return the receipt. Raises GateClosed if it cannot."""
        if self.sealer is None:
            raise GateClosed(
                "no sealer is configured, so no receipt can exist, so the action is refused",
                action,
            )
        try:
            receipt = self.sealer(action)
        except Exception as e:
            raise GateClosed(
                f"sealing failed ({type(e).__name__}: {e}), so the action is refused",
                action,
            ) from e
        if not isinstance(receipt, dict) or not receipt.get("decision_hash"):
            raise GateClosed(
                "the sealer returned no receipt carrying a hash, so the action is refused",
                action,
            )
        self.receipts.append(receipt)
        return receipt

    def run(self, fn, *args, **kwargs):
        """Seal the arguments, then call `fn`. `fn` is never called if the seal fails."""
        action = self._describe(fn, args, kwargs)
        receipt = self.permit(action)
        return GateResult(value=fn(*args, **kwargs), receipt=receipt, action=action)

    async def arun(self, fn, *args, **kwargs):
        """The async form of `run`. The seal happens first, off the event loop."""
        action = self._describe(fn, args, kwargs)
        receipt = await asyncio.to_thread(self.permit, action)
        return GateResult(value=await fn(*args, **kwargs), receipt=receipt, action=action)

    def require_receipt(self, receipt):
        """Raise unless `receipt` carries a hash. Use before a payout."""
        if not isinstance(receipt, dict) or not receipt.get("decision_hash"):
            raise GateClosed(
                "no receipt with a hash was supplied, so the action is refused",
            )
        return receipt

    def permit_header(self, receipt):
        """The value to put on an outbound request so the other side can look the receipt up."""
        self.require_receipt(receipt)
        return receipt["decision_hash"]

    def _describe(self, fn, args, kwargs):
        name = (
            getattr(fn, "__qualname__", None)
            or getattr(fn, "__name__", None)
            or type(fn).__name__
        )
        return {
            "fn": name,
            "args": _jsonable(list(args)),
            "kwargs": _jsonable(dict(kwargs)),
            "label": self.label,
        }


def require_receipt(receipt):
    """Module-level form of `ExecutionGate.require_receipt`."""
    if not isinstance(receipt, dict) or not receipt.get("decision_hash"):
        raise GateClosed("no receipt with a hash was supplied, so the action is refused")
    return receipt
