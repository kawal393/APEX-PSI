import copy, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from apex_psi.recorder import FlightRecorder, verify_incident_bundle

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "..", "psi-verifier", "test", "fixtures", "incident-bundle.json")


def make():
    r = FlightRecorder()
    r.record("tool_start", {"name": "transfer", "input": "AUD 500 to acct 42"})
    r("approved by policy P-7")
    r.on_tool_end("ok", name="transfer")
    return r.export()


def test_genuine_passes():
    assert verify_incident_bundle(make())["valid"]


def test_attacks_fail():
    b = make()
    t = copy.deepcopy(b); t["entries"][1]["payload_sha256"] = "f" * 64
    assert not verify_incident_bundle(t)["valid"]
    t = copy.deepcopy(b); t["entries"][0], t["entries"][1] = t["entries"][1], t["entries"][0]
    assert not verify_incident_bundle(t)["valid"]
    t = copy.deepcopy(b); t["entries"].pop(); t["count"] = 2
    assert not verify_incident_bundle(t)["valid"]
    t = copy.deepcopy(b); del t["entries"][1]; t["count"] = 2
    assert not verify_incident_bundle(t)["valid"]
    assert not verify_incident_bundle({"format": "x"})["valid"]
    assert not verify_incident_bundle({"format": "APEX-INCIDENT/1", "entries": []})["valid"]


def test_raw_text_never_stored():
    assert "AUD 500" not in json.dumps(make())


def test_shared_fixture():
    with open(FIXTURE) as f:
        assert verify_incident_bundle(json.load(f))["valid"]


if __name__ == "__main__":
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    if not os.path.exists(FIXTURE):
        with open(FIXTURE, "w") as f:
            json.dump(make(), f, indent=2)
    test_genuine_passes(); test_attacks_fail(); test_raw_text_never_stored(); test_shared_fixture()
    print("recorder tests OK")
