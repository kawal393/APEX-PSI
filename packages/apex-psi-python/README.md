# apex-psi (Python)

Seal AI agent decisions as tamper-evident APEX PSI receipts. Only a SHA-256
fingerprint leaves your process; sealing runs on a background thread so your
agent never waits. Free hosted allowance: 20/min, 100/day.

```python
from apex_psi import seal_agent_decision, flush

@seal_agent_decision
def approve_loan(applicant_id, score):
    return score > 700

approve_loan("a-1", 742)
flush()  # optional: wait for receipts before exit
```

LangChain / LangGraph:

```python
from apex_psi.langchain import ApexPsiCallbackHandler
chain.invoke(inputs, config={"callbacks": [ApexPsiCallbackHandler()]})
```

Verify a receipt's RFC 6962 inclusion proof (stdlib only, offline math):

```python
from apex_psi import fetch_proof, verify_inclusion
p = fetch_proof("APEX-NTR-...")
assert verify_inclusion(p["leaf"], p["leaf_index"], p["tree_size"], p["audit_path"], p["root"])
```

A receipt proves the fingerprint existed and is unchanged — not that the decision was correct or lawful.
