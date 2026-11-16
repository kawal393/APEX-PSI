"""APEX PSI Python runtime. Only SHA-256 fingerprints leave the process."""
from .client import ApexPsi, seal_agent_decision, flush
from .proof import verify_inclusion, fetch_proof
from .recorder import ExecutionRecorder, verify_incident_bundle
from .gate import (
    ExecutionGate, GateClosed, GateResult, LocalSealer, NotarySealer, require_receipt,
)

__all__ = [
    "ApexPsi", "seal_agent_decision", "flush", "verify_inclusion", "fetch_proof",
    "ExecutionRecorder", "verify_incident_bundle",
    "ExecutionGate", "GateClosed", "GateResult", "LocalSealer", "NotarySealer",
    "require_receipt",
]
__version__ = "0.2.0"
