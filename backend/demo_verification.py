import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath("backend"))

from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app

now = datetime.now(timezone.utc).isoformat()

with TestClient(app) as client:
    # 1. Create LOST report
    lost_resp = client.post("/api/v1/reports", json={
        "type": "LOST",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Library",
        "date_time": now,
        "description": "Black Samsung phone with a cracked screen and blue case.",
    })
    lost = lost_resp.json()["data"]

    # 2. Candidate A: High match
    cand_a = client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Library",
        "date_time": now,
        "description": "Black Samsung phone, cracked screen and blue case found near study desks.",
    }).json()["data"]

    # 3. Candidate B: Moderate review
    cand_b = client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Mobile Phone",
        "color": "Black",
        "location": "Cafeteria",
        "date_time": now,
        "description": "Black phone found on dining table.",
    }).json()["data"]

    # 4. Candidate C: Low unrelated
    cand_c = client.post("/api/v1/reports", json={
        "type": "FOUND",
        "category": "Wallet",
        "color": "Red",
        "location": "Hostel",
        "date_time": now,
        "description": "Red leather wallet.",
    }).json()["data"]

    # 5. Run matching
    match_resp = client.post("/api/v1/match", json={"report_id": lost["id"], "limit": 10}).json()
    matches = match_resp["data"]["matches"]

print("=" * 80)
print("AI LOST-AND-FOUND HEURISTIC MATCHER: LIVE DEMO VERIFICATION")
print("=" * 80)
print(f"Source Report: [{lost['type']}] {lost['category']} ({lost['color']}) at {lost['location']}")
print(f"Description:   \"{lost['description']}\"")
print("-" * 80)

for idx, m in enumerate(matches, 1):
    c = m["candidate_report"]
    print(f"Candidate #{idx}: [{c['type']}] {c['category']} ({c['color']}) at {c['location']}")
    print(f"  Description:      \"{c['description']}\"")
    print(f"  Overall Score:    {m['overall_score']} / 100")
    print(f"  Decision:         {m['decision']}")
    print(f"  Sub-Scores:       Category={m['factors']['category']} (20%), Color={m['factors']['color']} (15%), Location={m['factors']['location']} (20%), Time={m['factors']['time']} (20%), Description={m['factors']['description']} (25%)")
    print(f"  Summary:          {m['explanation']['summary']}")
    print("  Reasons:")
    for r in m['explanation']['reasons']:
        print(f"    + {r}")
    if m['explanation']['negative_factors']:
        print("  Penalties / Differences:")
        for nf in m['explanation']['negative_factors']:
            print(f"    - {nf}")
    if m['explanation']['notes']:
        print("  Notes:")
        for n in m['explanation']['notes']:
            print(f"    * {n}")
    print("-" * 80)
