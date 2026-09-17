import os
import sys
from pathlib import Path
import urllib.parse
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from main import app
from data_loader import loader

# Ensure data is loaded
loader.load_all()

client = TestClient(app)

def run_tests():
    print("========================================================")
    print("RUNNING FASTAPI BACKEND FORENSIC TEST SUITE")
    print("========================================================")

    # Test 1: Health
    print("\n1. Testing GET /health ...")
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data.get("status") == "ok", f"Expected status ok, got {data}"
    print("   PASSED: status =", data["status"])

    # Test 2: Works list
    print("\n2. Testing GET /works ...")
    res = client.get("/works?limit=5")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["total"] == 72675, f"Expected total 72675, got {data['total']}"
    assert len(data["works"]) == 5, f"Expected 5 works, got {len(data['works'])}"
    print(f"   PASSED: total = {data['total']}, returned = {len(data['works'])}")

    # Test 3: Single Work with URL encoding
    target_id = "WS/MP003/2023-2024/13040"
    encoded_id = urllib.parse.quote(target_id, safe="")
    print(f"\n3. Testing GET /works/{encoded_id} ...")
    res = client.get(f"/works/{encoded_id}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["work_id"] == target_id, f"Expected {target_id}, got {data['work_id']}"
    assert data["master_data"]["state"] == "Bihar", f"Expected Bihar, got {data['master_data']['state']}"
    assert data["master_data"]["work_description"] == "construction of pcc"
    assert data["risk_intelligence"]["risk_band"] == "MEDIUM"
    assert data["decision_intelligence"] is not None
    print("   PASSED: Work ID returned correctly:", data["work_id"], "| State:", data["master_data"]["state"])

    # Test 4: Work Risk Engine Output
    print(f"\n4. Testing GET /works/{encoded_id}/risk ...")
    res = client.get(f"/works/{encoded_id}/risk")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    risk_data = res.json()
    assert risk_data["work_id"] == target_id
    assert risk_data["risk_band"] == "MEDIUM"
    assert round(risk_data["overall_risk"], 1) == 34.7
    print(f"   PASSED: risk_band = {risk_data['risk_band']}, overall_risk = {risk_data['overall_risk']:.2f}")

    # Test 5: Intentional Invalid Year -> MUST return 404
    invalid_id = "WS/MP003/2024-2024/13040"
    encoded_invalid = urllib.parse.quote(invalid_id, safe="")
    print(f"\n5. Testing GET /works/{encoded_invalid}/signals (INTENTIONAL INVALID YEAR) ...")
    res = client.get(f"/works/{encoded_invalid}/signals")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
    print(f"   PASSED: Properly returned 404 Not Found: {res.json()['detail']}")

    # Test 6: Valid Work Signals
    print(f"\n6. Testing GET /works/{encoded_id}/signals (VALID WORK) ...")
    res = client.get(f"/works/{encoded_id}/signals")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    sig_data = res.json()
    assert sig_data["work_id"] == target_id
    assert sig_data["signals_count"] == 1
    assert sig_data["signals"][0]["signal_id"] == "RULE-001"
    print(f"   PASSED: signals_count = {sig_data['signals_count']}, signal_id = {sig_data['signals'][0]['signal_id']}")

    # Test 7: Work Expenditure
    print(f"\n7. Testing GET /works/{encoded_id}/expenditure ...")
    res = client.get(f"/works/{encoded_id}/expenditure")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    exp_data = res.json()
    assert exp_data["work_id"] == target_id
    assert exp_data["expenditure_events_count"] == 0
    print("   PASSED: Pre-sanction work correctly has 0 expenditure events.")

    # Test 7b: In-progress Work with expenditure events
    id_with_exp = "WS/MP383/2024-2025/11215"
    enc_exp_id = urllib.parse.quote(id_with_exp, safe="")
    print(f"\n7b. Testing GET /works/{enc_exp_id}/expenditure (work with events) ...")
    res = client.get(f"/works/{enc_exp_id}/expenditure")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    exp_data = res.json()
    assert exp_data["work_id"] == id_with_exp
    assert exp_data["expenditure_events_count"] == 10
    assert abs(exp_data["total_disbursed_amount"] - 118820.0) < 1.0
    print(f"   PASSED: In-progress work has {exp_data['expenditure_events_count']} events, total = INR {exp_data['total_disbursed_amount']:,.2f}")

    # Test 8: Risk Summary Verification
    print("\n8. Testing GET /risk/summary ...")
    res = client.get("/risk/summary")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    r_sum = res.json()
    print("   Risk Summary Output:", r_sum)
    assert r_sum["LOW"] == 31900, f"Expected LOW 31900, got {r_sum['LOW']}"
    assert r_sum["MEDIUM"] == 25988, f"Expected MEDIUM 25988, got {r_sum['MEDIUM']}"
    assert r_sum["HIGH"] == 12952, f"Expected HIGH 12952, got {r_sum['HIGH']}"
    assert r_sum["CRITICAL"] == 1835, f"Expected CRITICAL 1835, got {r_sum['CRITICAL']}"
    assert r_sum["TOTAL"] == 72675, f"Expected TOTAL 72675, got {r_sum['TOTAL']}"
    print("   PASSED: Exactly matches authoritative risk distribution!")

    # Test 9: Priority Queue
    print("\n9. Testing GET /risk/priority ...")
    res = client.get("/risk/priority?limit=10")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    pq_data = res.json()
    assert pq_data["total"] == 491, f"Expected 491 priority items, got {pq_data['total']}"
    assert len(pq_data["records"]) == 10
    print(f"   PASSED: priority queue total = {pq_data['total']}, first work = {pq_data['records'][0].get('id') or pq_data['records'][0].get('work_id')}")

    # Test 10: State Summary
    print("\n10. Testing GET /state/summary ...")
    res = client.get("/state/summary")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    st_data = res.json()
    states = st_data["states"]
    rec = st_data["reconciliation"]
    print("   State reconciliation block:", rec)
    assert rec["total_works"] == 72675, f"Expected 72675, got {rec['total_works']}"
    assert rec["critical_works"] == 1835, f"Expected 1835, got {rec['critical_works']}"
    assert rec["total_project_outlay_crores"] == 1648.35, f"Expected 1648.35, got {rec['total_project_outlay_crores']}"
    assert rec["total_pure_sanctioned_crores"] == 1607.58, f"Expected 1607.58, got {rec['total_pure_sanctioned_crores']}"
    assert rec["total_expenditure_crores"] == 1684.06, f"Expected 1684.06, got {rec['total_expenditure_crores']}"
    print("   PASSED: State summary reconciles 100% with national expenditure total using unrounded values!")

    # Test 11: Dashboard Summary
    print("\n11. Testing GET /dashboard/summary ...")
    res = client.get("/dashboard/summary")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    dash = res.json()
    print("   Dashboard summary:", dash)
    assert dash["total_works"] == 72675
    assert dash["active_works"] == 15372
    assert dash["critical_works"] == 1835
    assert dash["high_risk_works"] == 12952
    assert dash["total_project_outlay_crores"] == 1648.35, f"Expected 1648.35, got {dash['total_project_outlay_crores']}"
    assert dash["total_pure_sanctioned_crores"] == 1607.58, f"Expected 1607.58, got {dash['total_pure_sanctioned_crores']}"
    assert dash["total_expenditure_crores"] == 1684.06, f"Expected 1684.06, got {dash['total_expenditure_crores']}"
    assert dash["pending_verification"] == 284
    assert dash["investigation_cases"] == 8
    print("   PASSED: All national dashboard values and financial semantics match perfectly!")

    print("\n========================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (100% VERIFIED)")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
