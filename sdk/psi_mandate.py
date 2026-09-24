# ═══════════════════════════════════════════════════════════════════════
# APEX PSI — Mandate SDK (Python, stdlib only)
# The pre-action gate: ask before you act; the counterparty verifies before
# it honours. Zero dependencies — drop into any agent runtime.
#
#   from psi_mandate import authorize, verify_action
#   r = authorize(BASE, agent_id, "send-email", {"to": "x@y", "subject": "hi"})
#   v = verify_action(BASE, receipt_id=r["receipt_id"])
#   if v["allowed"]: ...   # else refuse by default
#
# No warranty / guarantee / certificate of compliance is offered or implied.
# verify_action returns a recomputation result, not a verdict on truth.
# ═══════════════════════════════════════════════════════════════════════
import json
import urllib.request


def _post(url, body, api_key=None, timeout=15):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("content-type", "application/json")
    if api_key:
        req.add_header("x-apex-api-key", api_key)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def authorize(base_url, agent_id, action_type, intent,
              policy_ref=None, predicate_id=None, expires_in=None,
              api_key=None, timeout=15):
    """Issue an Authorization Receipt for a PROPOSED action (before it runs)."""
    body = {"agent_id": agent_id, "action_type": action_type, "intent": intent}
    if policy_ref:
        body["policy_ref"] = policy_ref
    if predicate_id:
        body["predicate_id"] = predicate_id
    if expires_in:
        body["expires_in"] = expires_in
    return _post(base_url.rstrip("/") + "/functions/v1/authorize", body, api_key, timeout)


def verify_action(base_url, receipt_id=None, commit_hash=None,
                  action_type=None, policy_ref=None, timeout=15):
    """Counterparty call: recompute + integrity/revocation/expiry/policy check.
    Returns the gate decision dict; `allowed` is True only on a clean PASS."""
    body = {}
    if receipt_id:
        body["receipt_id"] = receipt_id
    if commit_hash:
        body["commit_hash"] = commit_hash
    claims = {}
    if action_type:
        claims["action_type"] = action_type
    if policy_ref:
        claims["policy_ref"] = policy_ref
    if claims:
        body["claims"] = claims
    return _post(base_url.rstrip("/") + "/functions/v1/verify-action", body, None, timeout)


def allowed(verification):
    """Refuse-by-default helper: only an explicit allow passes."""
    return bool(verification) and verification.get("allowed") is True
