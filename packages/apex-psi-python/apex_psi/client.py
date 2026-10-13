"""Non-blocking sealing client. Decisions are hashed locally (SHA-256 over
RFC 8785-style sorted JSON) and only the fingerprint is sent to /notarize
from a background thread, so the decorated call never waits on the network."""
import functools, hashlib, json, os, queue, threading, urllib.request, urllib.error

ENDPOINT = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize"


def fingerprint(obj) -> str:
    data = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class ApexPsi:
    def __init__(self, api_key=None, endpoint=ENDPOINT, model_id=None, on_receipt=None, on_error=None):
        self.api_key = api_key or os.environ.get("APEX_PSI_API_KEY")
        self.endpoint, self.model_id = endpoint, model_id
        self.on_receipt, self.on_error = on_receipt, on_error
        self.receipts = []
        self._q = queue.Queue()
        threading.Thread(target=self._worker, daemon=True).start()

    def seal_sync(self, digest: str, label: str = "decision") -> dict:
        body = {"decision": f"sha256:{digest}", "context": label}
        if self.model_id:
            body["model_id"] = self.model_id
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-apex-api-key"] = self.api_key
        req = urllib.request.Request(self.endpoint, json.dumps(body).encode(), headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"APEX PSI {e.code}: {e.read().decode()[:300]}") from None

    def seal(self, obj, label="decision") -> str:
        """Queue a seal; returns the local fingerprint immediately."""
        d = fingerprint(obj)
        self._q.put((d, label))
        return d

    def _worker(self):
        while True:
            d, label = self._q.get()
            try:
                rec = self.seal_sync(d, label)
                self.receipts.append(rec)
                if self.on_receipt:
                    self.on_receipt(rec)
            except Exception as e:  # never crash the host agent
                if self.on_error:
                    self.on_error(e)
            finally:
                self._q.task_done()

    def flush(self):
        self._q.join()


_default = None


def _client():
    global _default
    if _default is None:
        _default = ApexPsi()
    return _default


def flush():
    _client().flush()


def seal_agent_decision(fn=None, *, client=None, label=None):
    """@seal_agent_decision — seals (function, args, result) fingerprints in the background.
    Works on sync and async functions."""
    def wrap(f):
        name = label or f.__qualname__
        def record(args, kwargs, result):
            (client or _client()).seal({"fn": name, "args": args, "kwargs": kwargs, "result": result}, name)
        if _is_coro(f):
            @functools.wraps(f)
            async def aw(*a, **k):
                r = await f(*a, **k); record(a, k, r); return r
            return aw
        @functools.wraps(f)
        def w(*a, **k):
            r = f(*a, **k); record(a, k, r); return r
        return w
    return wrap(fn) if fn else wrap


def _is_coro(f):
    import inspect
    return inspect.iscoroutinefunction(f)
