import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from apex_psi.gate import (
    ExecutionGate, GateClosed, GateResult, LocalSealer, require_receipt,
)


class FailingSealer:
    def __call__(self, action):
        raise RuntimeError("notary unreachable")


class EmptySealer:
    def __call__(self, action):
        return {"receipt_id": "no-hash-here"}


class RecordingSealer:
    def __init__(self):
        self.calls = []

    def __call__(self, action):
        self.calls.append(action)
        return {"receipt_id": "R-1", "decision_hash": "sha256:" + "a" * 64}


def test_the_action_runs_only_after_the_seal():
    order = []

    class OrderedSealer:
        def __call__(self, action):
            order.append("seal")
            return {"receipt_id": "R-1", "decision_hash": "sha256:" + "a" * 64}

    gate = ExecutionGate(OrderedSealer())

    def act(x):
        order.append("act")
        return x * 2

    result = gate.run(act, 21)
    assert order == ["seal", "act"], order
    assert result.value == 42
    assert result.decision_hash == "sha256:" + "a" * 64


def test_a_failed_seal_refuses_the_action():
    ran = []
    gate = ExecutionGate(FailingSealer())
    try:
        gate.run(lambda: ran.append(1))
        assert False, "the gate let an unsealed action through"
    except GateClosed as e:
        assert "sealing failed" in str(e)
    assert ran == [], "the action ran even though the seal failed"


def test_no_sealer_means_the_gate_is_closed():
    ran = []
    gate = ExecutionGate()
    try:
        gate.run(lambda: ran.append(1))
        assert False, "an unconfigured gate let an action through"
    except GateClosed as e:
        assert "no sealer" in str(e)
    assert ran == []


def test_a_receipt_without_a_hash_is_not_a_receipt():
    ran = []
    gate = ExecutionGate(EmptySealer())
    try:
        gate.run(lambda: ran.append(1))
        assert False, "the gate accepted a seal that carried no hash"
    except GateClosed:
        pass
    assert ran == []


def test_permit_returns_a_receipt_without_running_anything():
    sealer = RecordingSealer()
    gate = ExecutionGate(sealer)
    receipt = gate.permit({"tool": "transfer", "amount": 500})
    assert receipt["decision_hash"].startswith("sha256:")
    assert sealer.calls == [{"tool": "transfer", "amount": 500}]
    assert len(gate.receipts) == 1


def test_a_payout_needs_someone_elses_receipt():
    gate = ExecutionGate(RecordingSealer())
    assert gate.require_receipt({"decision_hash": "sha256:" + "b" * 64})
    for bad in (None, {}, {"receipt_id": "R-2"}, "sha256:" + "c" * 64):
        try:
            require_receipt(bad)
            assert False, "the gate accepted a payout with no receipt: " + repr(bad)
        except GateClosed:
            pass


def test_the_local_sealer_chains_and_keeps_the_text_out():
    sealer = LocalSealer(label="payments-bot")
    gate = ExecutionGate(sealer)
    gate.permit({"tool": "transfer", "amount": 500, "to": "acct-42"})
    gate.permit({"tool": "transfer", "amount": 900, "to": "acct-42"})
    assert len(sealer.entries) == 2
    assert sealer.entries[0]["prev"] == "0" * 64
    assert sealer.entries[1]["prev"] == sealer.entries[0]["entry_hash"]
    blob = json.dumps(sealer.entries)
    assert "acct-42" not in blob, "the local chain stored the action's contents"


def test_the_async_form_behaves_the_same():
    ran = []

    async def act(x):
        ran.append(x)
        return x + 1

    async def main():
        gate = ExecutionGate(RecordingSealer())
        ok = await gate.arun(act, 1)
        assert ok.value == 2
        assert ran == [1]

        blocked = ExecutionGate(FailingSealer())
        try:
            await blocked.arun(act, 2)
            assert False, "the async gate let an unsealed action through"
        except GateClosed:
            pass
        assert ran == [1], "the action ran even though the async seal failed"

    asyncio.run(main())


def test_the_gate_result_carries_the_receipt():
    gate = ExecutionGate(RecordingSealer())
    result = gate.run(lambda: "done")
    assert isinstance(result, GateResult)
    assert result.value == "done"
    assert result.receipt["receipt_id"] == "R-1"


if __name__ == "__main__":
    test_the_action_runs_only_after_the_seal()
    test_a_failed_seal_refuses_the_action()
    test_no_sealer_means_the_gate_is_closed()
    test_a_receipt_without_a_hash_is_not_a_receipt()
    test_permit_returns_a_receipt_without_running_anything()
    test_a_payout_needs_someone_elses_receipt()
    test_the_local_sealer_chains_and_keeps_the_text_out()
    test_the_async_form_behaves_the_same()
    test_the_gate_result_carries_the_receipt()
    print("gate tests OK")
