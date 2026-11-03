"""Offline flight recorder for AI agents (stdlib only, nothing leaves the process).

Every step is reduced to a SHA-256 fingerprint and linked into a hash chain.
Export the chain as an APEX-INCIDENT/1 bundle and check it with
`npx apex-psi-verifier inspect bundle.json` or `verify_incident_bundle()`.

Honest scope: the chain proves the file was not reordered, edited or truncated
in the middle after export. It does not prove who wrote it or when, and it says
nothing about whether a recorded statement is true. To bind the chain to an
independent timestamp and signature, seal `head` with the hosted notary.
"""
import hashlib, json, time
from datetime import datetime, timezone

FORMAT = "APEX-INCIDENT/1"
GENESIS = "0" * 64


def _canon(v) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def entry_hash(e: dict) -> str:
    return _sha(_canon({k: e[k] for k in ("seq", "ts", "kind", "payload_sha256", "prev")}))


class FlightRecorder:
    """Callable (CrewAI `step_callback`) and duck-typed LangChain/LangGraph callback."""

    def __init__(self):
        self.entries = []

    def record(self, kind: str, payload) -> dict:
        data = payload if isinstance(payload, str) else _canon(_jsonable(payload))
        e = {
            "seq": len(self.entries),
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "kind": str(kind),
            "payload_sha256": _sha(data),
            "prev": self.entries[-1]["entry_hash"] if self.entries else GENESIS,
        }
        e["entry_hash"] = entry_hash(e)
        self.entries.append(e)
        return e

    # CrewAI: Agent(step_callback=recorder) / Crew(task_callback=recorder)
    def __call__(self, step):
        return self.record("step", step)

    # LangChain / LangGraph: pass in callbacks=[recorder]
    raise_error = False
    ignore_llm = ignore_chain = ignore_agent = ignore_retriever = ignore_chat_model = False
    run_inline = True

    def on_llm_end(self, response, **kw):
        gens = getattr(response, "generations", None)
        self.record("llm_end", [[getattr(g, "text", str(g)) for g in gs] for gs in gens] if gens else str(response))

    def on_tool_start(self, serialized, input_str, **kw):
        self.record("tool_start", {"name": (serialized or {}).get("name"), "input": input_str})

    def on_tool_end(self, output, **kw):
        self.record("tool_end", {"name": kw.get("name"), "output": str(output)})

    def on_chain_end(self, outputs, **kw):
        self.record("chain_end", outputs)

    def __getattr__(self, name):  # tolerate any other callback hook
        if name.startswith("on_"):
            return lambda *a, **k: None
        raise AttributeError(name)

    @property
    def head(self) -> str:
        return self.entries[-1]["entry_hash"] if self.entries else GENESIS

    def export(self) -> dict:
        return {"format": FORMAT, "hash_alg": "sha256", "count": len(self.entries),
                "head": self.head, "entries": [dict(e) for e in self.entries]}

    def save(self, path: str) -> str:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.export(), f, indent=2, ensure_ascii=False)
        return path


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


def verify_incident_bundle(bundle: dict) -> dict:
    """Fail-closed check. Returns {"valid": bool, "errors": [...], "count", "head"}."""
    errs = []
    if not isinstance(bundle, dict) or bundle.get("format") != FORMAT:
        return {"valid": False, "errors": ["format is not APEX-INCIDENT/1"], "count": 0, "head": None}
    entries = bundle.get("entries")
    if not isinstance(entries, list) or not entries:
        return {"valid": False, "errors": ["no entries"], "count": 0, "head": None}
    prev = GENESIS
    for i, e in enumerate(entries):
        try:
            if e["seq"] != i:
                errs.append(f"entry {i}: sequence gap or reorder")
            if e["prev"] != prev:
                errs.append(f"entry {i}: broken link to previous entry")
            if entry_hash(e) != e["entry_hash"]:
                errs.append(f"entry {i}: content altered")
            prev = e["entry_hash"]
        except (KeyError, TypeError):
            errs.append(f"entry {i}: malformed")
            prev = None
    if bundle.get("count") != len(entries):
        errs.append("count does not match entries (truncated?)")
    if bundle.get("head") != prev:
        errs.append("head does not match last entry (truncated or altered)")
    return {"valid": not errs, "errors": errs, "count": len(entries), "head": prev}
