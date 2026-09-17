#!/usr/bin/env python3
"""
generate_synthetic_data.py
MPLAD Sentinel -- SYNTHETIC APPLICATION/DEMO DATA LAYER generator.

This script does NOT touch, recompute, or reweight the frozen Stage 2.1.1
Risk Engine or Stage 2.2.1 Decision Intelligence outputs. It reads the
authoritative decision_intelligence.csv (real MPLADS-derived data) ONLY to
copy a small, fixed set of real Work IDs and their real fields verbatim into
demo_work_registry.csv, then builds a purely synthetic application/workflow
layer on top (citizen requests, recommendations, assets, spatial demo
context, vendor reference, investigations, evidence, outcomes, feedback,
users, and demo scenarios).

Deterministic: fixed RANDOM_SEED, no wall-clock/system randomness. Running
this script twice produces byte-identical output.
"""

import os
import csv
import math
import random
import hashlib
import datetime as dt

RANDOM_SEED = 20260907
random.seed(RANDOM_SEED)

SOURCE_CSV = os.path.join(os.path.dirname(__file__), "source_data", "decision_intelligence.csv")
OUT_DIR = os.path.join(os.path.dirname(__file__), "synthetic_data")
os.makedirs(OUT_DIR, exist_ok=True)

REAL = "REAL_MPLADS"
SYN = "SYNTHETIC_DEMO"

# ---------------------------------------------------------------------------
# Fixed reference date for the whole synthetic package (keeps generation
# deterministic -- not wall-clock derived).
# ---------------------------------------------------------------------------
REF_DATE = dt.date(2026, 9, 7)


def read_authoritative():
    with open(SOURCE_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = {r["work_id"]: r for r in reader}
    return rows


def write_csv(path, fieldnames, rows):
    full_path = os.path.join(OUT_DIR, path)
    with open(full_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)
    return full_path


# ===========================================================================
# 1. DEMO WORK REGISTRY -- real Work IDs, real fields, copied verbatim
# ===========================================================================

REGISTRY_WORK_IDS = [
    "WS/MP383/2024-2025/11215",
    "WS/MP18167/2025-2026/228471",
    "WS/MP446/2023-2024/122215",
    "WS/MP383/2024-2025/11216",
    "WS/MP18019/2025-2026/216372",
    "WS/MP508/2023-2024/13249",
    "WS/MP18112/2025-2026/177331",
    "WS/MP18177/2025-2026/168464",
    "WS/MP356/2023-2024/13198",
    "WS/MP18222/2025-2026/184028",
    "WS/MP747/2025-2026/205068",
    "WS/MP18087/2025-2026/178984",
    "WS/MP18357/2025-2026/177245",
    "WS/MP017/2025-2026/160053",
]

REGISTRY_FIELDS = [
    "work_id", "state", "constituency", "work_category", "lifecycle_mode",
    "overall_risk", "risk_band", "primary_risk_component", "secondary_risk_component",
    "primary_reason_title", "recommended_amount", "sanctioned_amount", "total_expenditure",
    "work_data_origin", "scenario_data_origin",
]


def build_demo_work_registry(authoritative):
    rows = []
    missing = []
    for wid in REGISTRY_WORK_IDS:
        src = authoritative.get(wid)
        if src is None:
            missing.append(wid)
            continue
        rows.append({
            "work_id": src["work_id"],
            "state": src["state"],
            "constituency": src["constituency"],
            "work_category": src["work_category"],
            "lifecycle_mode": src["lifecycle_mode"],
            "overall_risk": src["overall_risk"],
            "risk_band": src["risk_band"],
            "primary_risk_component": src["primary_risk_component"],
            "secondary_risk_component": src["secondary_risk_component"],
            "primary_reason_title": src["primary_reason_title"],
            "recommended_amount": src["recommended_amount"],
            "sanctioned_amount": src["sanctioned_amount"],
            "total_expenditure": src["total_expenditure"],
            "work_data_origin": REAL,
            "scenario_data_origin": SYN,
        })
    if missing:
        raise SystemExit(f"FATAL: these Work IDs were not found in the authoritative dataset: {missing}")
    write_csv("demo_work_registry.csv", REGISTRY_FIELDS, rows)
    return rows


# ===========================================================================
# 2. SYNTHETIC USERS
# ===========================================================================

def build_users(registry_rows):
    states_in_registry = sorted({r["state"] for r in registry_rows if r["state"].strip()})
    constituencies = [(r["state"], r["constituency"]) for r in registry_rows if r["state"].strip()]
    users = []
    uid = 1

    def new_user(role, label, state="", constituency=""):
        nonlocal uid
        u = {
            "user_id": f"USR-{uid:04d}",
            "role": role,
            "display_name": label,
            "state": state,
            "constituency": constituency,
            "synthetic": "TRUE",
        }
        uid += 1
        return u

    # MP_TEAM users -- one per state that appears in the registry
    for i, st in enumerate(states_in_registry, start=1):
        users.append(new_user("MP_TEAM", f"MP Team Member {i}", st, ""))

    # DM_DA users -- one per (state, constituency) pair present in the registry
    seen = set()
    di = 1
    for st, con in constituencies:
        key = (st, con)
        if key in seen:
            continue
        seen.add(key)
        users.append(new_user("DM_DA", f"District Authority Officer {di}", st, con))
        di += 1

    # MoSPI admin users -- national-level, not tied to a state
    for i in range(1, 4):
        users.append(new_user("MOSPI_ADMIN", f"MoSPI Monitoring Officer {i}"))

    write_csv(
        "synthetic_users.csv",
        ["user_id", "role", "display_name", "state", "constituency", "synthetic"],
        users,
    )
    return users


# ===========================================================================
# 3. SYNTHETIC CITIZEN REQUESTS
# ===========================================================================

CITIZEN_NEED_CATEGORIES = [
    "Drinking water supply", "Internal road repair", "Street lighting",
    "School infrastructure", "Community hall", "Drainage system",
    "Public health sub-center", "Public toilet complex", "Sports facility",
    "Irrigation channel", "Bridge / culvert repair", "Solar street lighting",
    "Public library", "Anganwadi center upgrade", "Solid waste management",
    "Bus shelter", "Public park", "Handpump / borewell installation",
]

NEED_TEMPLATES = [
    "Residents of the {area} area report that {issue}, affecting daily commute and access to essential services for roughly {count} households.",
    "A citizen suggestion notes that the {category_lower} in {area} has not been upgraded in several years, and {issue}.",
    "Local residents have raised concerns that {issue} near {area}, and are requesting consideration for {category_lower} works.",
    "A grievance was submitted describing how {issue}, particularly affecting students and elderly residents in {area}.",
    "Community members in {area} flagged that {issue}, and requested that the MP consider sanctioning {category_lower} works in the area.",
    "The suggestion describes {issue} in {area}, with an estimated {count} families affected during peak usage hours.",
]

ISSUE_PHRASES = {
    "Drinking water supply": "the existing water supply point runs dry for several hours a day during summer months",
    "Internal road repair": "the internal road remains unpaved and becomes waterlogged during monsoon",
    "Street lighting": "several stretches of the main road remain unlit after dusk, creating safety concerns",
    "School infrastructure": "the local school building has an unrepaired roof and insufficient classroom space",
    "Community hall": "there is no community hall available for local gatherings and government camps",
    "Drainage system": "open drains overflow onto the roadway during heavy rainfall",
    "Public health sub-center": "the nearest health sub-center is several kilometres away with limited operating hours",
    "Public toilet complex": "there is no public toilet facility near the market area",
    "Sports facility": "there is no maintained playground or sports ground for local youth",
    "Irrigation channel": "the irrigation channel is silted and does not carry water reliably to the fields",
    "Bridge / culvert repair": "the culvert connecting the two hamlets is damaged and unsafe during monsoon",
    "Solar street lighting": "the area has no grid electricity access for conventional street lighting",
    "Public library": "there is no reading room or library facility accessible to students in the area",
    "Anganwadi center upgrade": "the anganwadi center lacks adequate space and sanitation facilities",
    "Solid waste management": "garbage collection is irregular and waste accumulates near residential areas",
    "Bus shelter": "commuters have no shelter at the bus stop during rain or peak summer heat",
    "Public park": "there is no maintained green space or park accessible to residents",
    "Handpump / borewell installation": "the nearest functional handpump is over a kilometre from several households",
}

AREA_LABELS = [
    "Ward 3", "Ward 5", "Ward 7", "the eastern colony", "the market area",
    "the riverside settlement", "Sector 2", "the old town area", "the outskirts hamlet",
    "the railway colony", "the northern block", "the southern extension",
    "Ward 11", "the industrial estate road", "the panchayat office area",
]

REQUEST_STATUSES_WEIGHTED = [
    ("SUBMITTED", 30),
    ("NEED_IDENTIFICATION", 22),
    ("SUGGESTED_WORK_IDENTIFIED", 20),
    ("MP_REVIEW", 18),
    ("RECOMMENDATION_CREATED", 20),
    ("RECOMMENDATION_SUBMITTED", 12),
    ("CLOSED_NOT_TAKEN_UP", 8),
]


def weighted_choice(pairs, rng):
    total = sum(w for _, w in pairs)
    x = rng.uniform(0, total)
    upto = 0
    for val, w in pairs:
        upto += w
        if x <= upto:
            return val
    return pairs[-1][0]


def build_citizen_requests(registry_rows, rng):
    n_requests = 130
    linkable = [r for r in registry_rows if r["state"].strip()]
    blank_state_works = [r for r in registry_rows if not r["state"].strip()]

    requests = []
    request_id_n = 1

    # First: a small deliberate set of LINKED requests (state/constituency
    # must exactly match the linked real work), including edge cases linked
    # to registry Work IDs that themselves have blank state/constituency in
    # the authoritative data (2 of the 14 registry rows -- WS/MP446 and
    # WS/MP18019 -- have no state/constituency on file). Those edge-case
    # requests must also carry blank state/constituency, exercising the
    # "linked request geography must exactly equal linked work geography"
    # rule even in the blank case.
    linked_targets = rng.sample(linkable, k=min(12, len(linkable)))
    linked_targets.extend(blank_state_works)  # edge cases: blank-geography links

    for src in linked_targets:
        category = rng.choice(CITIZEN_NEED_CATEGORIES)
        area = rng.choice(AREA_LABELS)
        issue = ISSUE_PHRASES[category]
        template = rng.choice(NEED_TEMPLATES)
        text = template.format(area=area, issue=issue, category_lower=category.lower(), count=rng.choice([40, 60, 85, 120, 150, 200]))
        status = weighted_choice(REQUEST_STATUSES_WEIGHTED, rng)
        days_ago = rng.randint(15, 400)
        created = REF_DATE - dt.timedelta(days=days_ago)
        requests.append({
            "request_id": f"CREQ-{request_id_n:04d}",
            "citizen_need_text": text,
            "need_category": category,
            "state": src["state"],
            "constituency": src["constituency"],
            "linked_work_id": src["work_id"],
            "status": status,
            "created_at": created.isoformat(),
            "data_origin": SYN,
        })
        request_id_n += 1

    # Remaining: UNLINKED requests, spread across a broader synthetic set of
    # state/constituency labels (reusing the states present in the registry
    # plus a few additional common MPLADS states for variety -- these are
    # NOT claimed to correspond to any specific real work).
    extra_states = [
        ("Kerala", "ALAPPUZHA"), ("Punjab", "LUDHIANA"), ("West Bengal", "HOWRAH"),
        ("Gujarat", "SURAT"), ("Odisha", "CUTTACK"), ("Telangana", "WARANGAL"),
        ("Maharashtra", "NASHIK"), ("Bihar", "GAYA"),
    ]
    geo_pool = [(r["state"], r["constituency"]) for r in linkable] + extra_states

    n_remaining = n_requests - len(requests)
    for _ in range(n_remaining):
        category = rng.choice(CITIZEN_NEED_CATEGORIES)
        area = rng.choice(AREA_LABELS)
        issue = ISSUE_PHRASES[category]
        template = rng.choice(NEED_TEMPLATES)
        text = template.format(area=area, issue=issue, category_lower=category.lower(), count=rng.choice([25, 45, 70, 90, 130, 175, 220]))
        status = weighted_choice(REQUEST_STATUSES_WEIGHTED, rng)
        st, con = rng.choice(geo_pool)
        days_ago = rng.randint(5, 450)
        created = REF_DATE - dt.timedelta(days=days_ago)
        requests.append({
            "request_id": f"CREQ-{request_id_n:04d}",
            "citizen_need_text": text,
            "need_category": category,
            "state": st,
            "constituency": con,
            "linked_work_id": "",
            "status": status,
            "created_at": created.isoformat(),
            "data_origin": SYN,
        })
        request_id_n += 1

    # sort by created_at for readability, keep IDs as originally assigned
    requests.sort(key=lambda r: r["created_at"])

    write_csv(
        "synthetic_citizen_requests.csv",
        ["request_id", "citizen_need_text", "need_category", "state", "constituency",
         "linked_work_id", "status", "created_at", "data_origin"],
        requests,
    )
    return requests


# ===========================================================================
# 4. SYNTHETIC WORK RECOMMENDATIONS (required for every RECOMMENDATION_CREATED+ request)
# ===========================================================================

SUGGESTION_REASON_TEMPLATES = [
    "Citizen suggestion frequency and severity for this need category in the area support prioritising this work.",
    "No comparable sanctioned work of this category exists in the immediate area based on the asset registry check.",
    "The need aligns with an underserved category identified during MP team review of pending suggestions.",
    "Field-level input from the MP team indicates this work would address a recurring citizen concern.",
]

PRIORITY_WEIGHTED = [("LOW", 30), ("MEDIUM", 45), ("HIGH", 25)]
MP_DECISION_BY_STATUS = {
    "RECOMMENDATION_CREATED": [("PENDING", 60), ("APPROVED", 25), ("DEFERRED", 15)],
    "RECOMMENDATION_SUBMITTED": [("APPROVED", 80), ("DEFERRED", 20)],
}


def build_recommendations(requests, rng):
    recs = []
    rec_n = 1
    target_statuses = {"RECOMMENDATION_CREATED", "RECOMMENDATION_SUBMITTED"}
    for req in requests:
        if req["status"] not in target_statuses:
            continue
        category = req["need_category"]
        priority = weighted_choice(PRIORITY_WEIGHTED, rng)
        decision_pairs = MP_DECISION_BY_STATUS[req["status"]]
        mp_decision = weighted_choice(decision_pairs, rng)
        estimated_amount = rng.choice([150000, 250000, 400000, 600000, 850000, 1200000, 1800000])
        created_offset = rng.randint(2, 25)
        created_dt = dt.date.fromisoformat(req["created_at"]) + dt.timedelta(days=created_offset)
        if created_dt > REF_DATE:
            created_dt = REF_DATE
        justification = ""
        if mp_decision == "APPROVED":
            justification = "Aligns with constituency development priorities; recommended for further processing."
        elif mp_decision == "DEFERRED":
            justification = "Sound need, but deferred pending budget availability in the current cycle."
        elif mp_decision == "REJECTED":
            justification = "Overlaps significantly with an existing sanctioned work in the same area."
        else:
            justification = "Under review by the MP team; no decision recorded yet."

        status = "SUBMITTED" if req["status"] == "RECOMMENDATION_SUBMITTED" else "DRAFT"

        recs.append({
            "recommendation_id": f"REC-{rec_n:04d}",
            "request_id": req["request_id"],
            "work_id": "",  # nullable -- not yet linked to a sanctioned real Work ID
            "suggested_work_type": category,
            "suggestion_reason": rng.choice(SUGGESTION_REASON_TEMPLATES),
            "proposed_category": category,
            "estimated_amount": estimated_amount,
            "priority": priority,
            "mp_decision": mp_decision,
            "mp_justification": justification,
            "status": status,
            "created_at": created_dt.isoformat(),
            "synthetic": "TRUE",
        })
        rec_n += 1

    write_csv(
        "synthetic_work_recommendations.csv",
        ["recommendation_id", "request_id", "work_id", "suggested_work_type", "suggestion_reason",
         "proposed_category", "estimated_amount", "priority", "mp_decision", "mp_justification",
         "status", "created_at", "synthetic"],
        recs,
    )
    return recs


# ===========================================================================
# 5. SYNTHETIC ASSET REGISTRY
# ===========================================================================

ASSET_TYPES = [
    "Borewell", "School Building", "Community Hall", "Streetlight Cluster",
    "Road Segment", "Health Sub-Center", "Drainage Line", "Public Park",
    "Sports Ground", "Water Tank", "Public Toilet Complex", "Bus Shelter",
    "Anganwadi Center", "Bridge / Culvert", "Library",
]
ASSET_STATUS_WEIGHTED = [("ACTIVE", 60), ("UNDER_MAINTENANCE", 15), ("INACTIVE", 15), ("DECOMMISSIONED", 10)]
CONDITION_WEIGHTED = [("GOOD", 35), ("FAIR", 35), ("POOR", 20), ("CRITICAL", 10)]

# Broad synthetic India bounding box (illustrative only, not tied to any real asset)
INDIA_LAT_RANGE = (8.5, 33.5)
INDIA_LON_RANGE = (68.5, 96.5)


def build_asset_registry(registry_rows, rng):
    n_assets = 200
    state_pool = sorted({r["state"] for r in registry_rows if r["state"].strip()}) + [
        "Kerala", "Punjab", "West Bengal", "Gujarat", "Odisha", "Telangana", "Maharashtra", "Bihar",
    ]
    con_by_state = {}
    for r in registry_rows:
        if r["state"].strip():
            con_by_state.setdefault(r["state"], set()).add(r["constituency"])
    extra_cons = {
        "Kerala": ["ALAPPUZHA"], "Punjab": ["LUDHIANA"], "West Bengal": ["HOWRAH"],
        "Gujarat": ["SURAT"], "Odisha": ["CUTTACK"], "Telangana": ["WARANGAL"],
        "Maharashtra": ["NASHIK"], "Bihar": ["GAYA"],
    }
    for st, cons in extra_cons.items():
        con_by_state.setdefault(st, set()).update(cons)

    assets = []
    for i in range(1, n_assets + 1):
        st = rng.choice(state_pool)
        con = rng.choice(sorted(con_by_state.get(st, {"UNSPECIFIED"})))
        lat = round(rng.uniform(*INDIA_LAT_RANGE), 5)
        lon = round(rng.uniform(*INDIA_LON_RANGE), 5)
        assets.append({
            "asset_id": f"AST-{i:04d}",
            "asset_type": rng.choice(ASSET_TYPES),
            "state": st,
            "constituency": con,
            "synthetic_latitude": lat,
            "synthetic_longitude": lon,
            "asset_status": weighted_choice(ASSET_STATUS_WEIGHTED, rng),
            "installation_year": rng.randint(2005, 2025),
            "condition": weighted_choice(CONDITION_WEIGHTED, rng),
            "synthetic": "TRUE",
        })

    write_csv(
        "synthetic_asset_registry.csv",
        ["asset_id", "asset_type", "state", "constituency", "synthetic_latitude", "synthetic_longitude",
         "asset_status", "installation_year", "condition", "synthetic"],
        assets,
    )
    return assets


# ===========================================================================
# 6. SYNTHETIC SPATIAL SCENARIOS (overlap / nearby-asset demonstration)
# ===========================================================================

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def build_spatial_scenarios(registry_rows, assets, rng):
    scenarios = []
    scen_n = 1
    geo_works = [r for r in registry_rows if r["state"].strip()]
    for src in geo_works:
        # synthetic "reference" coordinate standing in for the work's general
        # area -- explicitly NOT a real MPLADS GIS coordinate.
        ref_lat = round(rng.uniform(*INDIA_LAT_RANGE), 5)
        ref_lon = round(rng.uniform(*INDIA_LON_RANGE), 5)
        same_state_assets = [a for a in assets if a["state"] == src["state"]]
        pool = same_state_assets if same_state_assets else assets
        k = min(2, len(pool))
        nearby = rng.sample(pool, k=k)
        for asset in nearby:
            dist = round(haversine_km(ref_lat, ref_lon, asset["synthetic_latitude"], asset["synthetic_longitude"]), 2)
            scenarios.append({
                "scenario_id": f"SPAT-{scen_n:04d}",
                "work_id": src["work_id"],
                "synthetic_reference_lat": ref_lat,
                "synthetic_reference_lon": ref_lon,
                "asset_id": asset["asset_id"],
                "synthetic_asset_lat": asset["synthetic_latitude"],
                "synthetic_asset_lon": asset["synthetic_longitude"],
                "simulated_distance_km": dist,
                "demonstration_label": "SIMULATED / SYNTHETIC DEMONSTRATION CONTEXT",
                "ui_wording_note": "Demonstration spatial context - synthetic coordinates. Not an actual measured distance between a real MPLADS project and a real asset.",
                "synthetic": "TRUE",
            })
            scen_n += 1

    write_csv(
        "synthetic_spatial_scenarios.csv",
        ["scenario_id", "work_id", "synthetic_reference_lat", "synthetic_reference_lon",
         "asset_id", "synthetic_asset_lat", "synthetic_asset_lon", "simulated_distance_km",
         "demonstration_label", "ui_wording_note", "synthetic"],
        scenarios,
    )
    return scenarios


# ===========================================================================
# 7. SYNTHETIC VENDOR REFERENCE
# ===========================================================================

VENDOR_PREFIXES = ["Shree", "Om", "Sai", "Bharat", "Rajdhani", "Vikas", "Jai", "Uday", "Shakti", "Nav"]
VENDOR_SUFFIXES = ["Constructions", "Infra Projects", "Builders", "Enterprises", "Contractors", "Engineering Works"]
VENDOR_STATUS_WEIGHTED = [("ACTIVE", 55), ("UNDER_REVIEW", 25), ("FLAGGED_FOR_CONTEXT", 20)]


def build_vendor_reference(registry_rows, rng):
    n_vendors = 30
    state_pool = sorted({r["state"] for r in registry_rows if r["state"].strip()}) + [
        "Kerala", "Punjab", "West Bengal", "Gujarat",
    ]
    vendors = []
    used_names = set()
    for i in range(1, n_vendors + 1):
        while True:
            name = f"{rng.choice(VENDOR_PREFIXES)} {rng.choice(VENDOR_SUFFIXES)}"
            if name not in used_names:
                used_names.add(name)
                break
        vendors.append({
            "vendor_id": f"VEND-{i:03d}",
            "vendor_name": name,
            "state": rng.choice(state_pool),
            "status": weighted_choice(VENDOR_STATUS_WEIGHTED, rng),
            "works_count": rng.randint(1, 40),
            "note": "Contextual reference only. NOT an official blacklist. Does not modify risk score, risk band, or risk engine output.",
            "synthetic": "TRUE",
        })

    write_csv(
        "synthetic_vendor_reference.csv",
        ["vendor_id", "vendor_name", "state", "status", "works_count", "note", "synthetic"],
        vendors,
    )
    return vendors


# ===========================================================================
# 8. INVESTIGATION WORKFLOW (cases, evidence, outcomes, feedback)
# ===========================================================================

WORKFLOW_STAGES_ORDERED = [
    "SENTINEL_FLAG", "REVIEW_CASE_CREATED", "ASSIGNED", "INVESTIGATION",
    "EVIDENCE_UPLOADED", "OFFICIAL_FINDING", "RESOLUTION_ACTION",
]

EVIDENCE_TYPES = ["document", "photograph", "inspection_note", "work_order", "measurement_record", "invoice_reference"]

EVIDENCE_DESC_TEMPLATES = {
    "document": "Reference document metadata logged for cross-check against the flagged figure.",
    "photograph": "Site photograph metadata recorded during field visit; no personal data attached.",
    "inspection_note": "Field inspection note summarising observations relevant to the flagged signal.",
    "work_order": "Work order reference metadata logged for verification against expenditure records.",
    "measurement_record": "Physical measurement record logged to compare against the reported work progress.",
    "invoice_reference": "Invoice reference metadata logged for reconciliation against sanctioned amount.",
}

OUTCOME_TYPES = ["EXPLAINED", "REQUIRES_ACTION", "ESCALATED", "INCONCLUSIVE"]

OUTCOME_SUMMARY_TEMPLATES = {
    "EXPLAINED": "Field verification found a documented, legitimate explanation for the flagged signal; no further action required.",
    "REQUIRES_ACTION": "Verification surfaced a genuine discrepancy against supporting records; referred for corrective follow-up.",
    "ESCALATED": "Findings were inconclusive at the district level and the case was escalated for higher-level review.",
    "INCONCLUSIVE": "Available evidence was insufficient to confirm or rule out the flagged concern; case held pending further records.",
}

FEEDBACK_TEMPLATES = [
    ("ALERT_USEFULNESS", "The flagged signal matched what field verification found -- the alert correctly pointed the team to a real discrepancy worth checking."),
    ("ALERT_USEFULNESS", "On review, the flagged figure turned out to be a normal variation for this category of work; the alert was a false positive in this instance."),
    ("EVIDENCE_RESOLUTION", "Uploaded documentation fully resolved the concern once cross-checked against the invoice reference."),
    ("EVIDENCE_RESOLUTION", "The evidence collected was insufficient on its own; a follow-up site visit was needed to reach a conclusion."),
    ("DATA_QUALITY", "The underlying issue was a data-quality gap (missing sanction record) rather than an actual irregularity."),
    ("VERIFICATION_NEEDED", "This case needed an additional round of verification with the implementing agency before it could be closed."),
    ("EXPLANATION_CLARITY", "The risk explanation text was clear enough for the district team to act on without needing to consult the technical detail fields."),
    ("EXPLANATION_CLARITY", "The explanation named the right metric, but the district officer needed the technical detail section to understand the threshold used."),
]


def build_investigations(registry_rows, users, rng):
    n_cases = 8
    dm_users = [u for u in users if u["role"] == "DM_DA"]
    case_sources = registry_rows[:n_cases]  # first 8 registry rows -- fixed, deterministic

    cases = []
    evidence = []
    outcomes = []
    feedback = []

    case_n, ev_n, out_n, fb_n = 1, 1, 1, 1
    mospi_users = [u for u in users if u["role"] == "MOSPI_ADMIN"]

    for idx, src in enumerate(case_sources):
        case_id = f"CASE-{case_n:04d}"
        # deterministic split: first 5 cases reach a finding/outcome, last 3 stay open
        reaches_outcome = idx < 5
        stage = "RESOLUTION_ACTION" if reaches_outcome else WORKFLOW_STAGES_ORDERED[2 + (idx % 3)]
        status = "CLOSED" if reaches_outcome else "IN_PROGRESS" if idx % 2 == 0 else "OPEN"
        assigned = dm_users[idx % len(dm_users)] if dm_users else None

        created_offset = rng.randint(20, 200)
        created_dt = REF_DATE - dt.timedelta(days=created_offset)

        cases.append({
            "case_id": case_id,
            "work_id": src["work_id"],
            "risk_score": src["overall_risk"],
            "risk_band": src["risk_band"],
            "lifecycle_stage": src["lifecycle_mode"],
            "primary_risk_reason": src["primary_reason_title"],
            "workflow_stage": stage,
            "assigned_to": assigned["user_id"] if assigned else "",
            "created_at": created_dt.isoformat(),
            "status": status,
            "risk_field_origin": REAL,
            "workflow_data_origin": SYN,
        })

        n_evidence = rng.choice([2, 3])
        ev_types = rng.sample(EVIDENCE_TYPES, k=n_evidence)
        last_ev_date = created_dt
        for et in ev_types:
            ev_offset = rng.randint(1, 15)
            ev_date = last_ev_date + dt.timedelta(days=ev_offset)
            if ev_date > REF_DATE:
                ev_date = REF_DATE
            last_ev_date = ev_date
            evidence.append({
                "evidence_id": f"EVID-{ev_n:04d}",
                "case_id": case_id,
                "evidence_type": et,
                "description": EVIDENCE_DESC_TEMPLATES[et],
                "uploaded_by": assigned["user_id"] if assigned else "",
                "uploaded_at": ev_date.isoformat(),
                "synthetic": "TRUE",
            })
            ev_n += 1

        if reaches_outcome:
            outcome_type = OUTCOME_TYPES[idx % len(OUTCOME_TYPES)]
            resolved_offset = rng.randint(1, 10)
            resolved_dt = last_ev_date + dt.timedelta(days=resolved_offset)
            if resolved_dt > REF_DATE:
                resolved_dt = REF_DATE
            outcomes.append({
                "outcome_id": f"OUT-{out_n:04d}",
                "case_id": case_id,
                "outcome_type": outcome_type,
                "outcome_summary": OUTCOME_SUMMARY_TEMPLATES[outcome_type],
                "resolved_at": resolved_dt.isoformat(),
                "synthetic": "TRUE",
            })
            out_n += 1

            # feedback tied to this resolved case
            f_type, f_text = FEEDBACK_TEMPLATES[idx % len(FEEDBACK_TEMPLATES)]
            fb_user = mospi_users[idx % len(mospi_users)] if mospi_users else (assigned or {"user_id": ""})
            fb_offset = rng.randint(1, 5)
            fb_dt = resolved_dt + dt.timedelta(days=fb_offset)
            if fb_dt > REF_DATE:
                fb_dt = REF_DATE
            feedback.append({
                "feedback_id": f"FB-{fb_n:04d}",
                "case_id": case_id,
                "request_id": "",
                "feedback_type": f_type,
                "feedback_text": f_text,
                "submitted_by": fb_user["user_id"],
                "rating": rng.randint(3, 5) if "false positive" not in f_text and "insufficient" not in f_text else rng.randint(2, 4),
                "submitted_at": fb_dt.isoformat(),
                "synthetic": "TRUE",
            })
            fb_n += 1

        case_n += 1

    # A couple of additional feedback rows tied to citizen requests rather
    # than investigation cases, to demonstrate the broader feedback loop.
    extra_feedback_texts = [
        ("ALERT_USEFULNESS", "The suggested work type matched the actual community need well once the MP team reviewed it in person."),
        ("EXPLANATION_CLARITY", "The recommendation draft reasoning was easy to follow when presenting the case to the MP for a decision."),
    ]
    for f_type, f_text in extra_feedback_texts:
        fb_user = mospi_users[fb_n % len(mospi_users)] if mospi_users else {"user_id": ""}
        fb_dt = REF_DATE - dt.timedelta(days=rng.randint(1, 60))
        feedback.append({
            "feedback_id": f"FB-{fb_n:04d}",
            "case_id": "",
            "request_id": "",
            "feedback_type": f_type,
            "feedback_text": f_text,
            "submitted_by": fb_user["user_id"],
            "rating": rng.randint(3, 5),
            "submitted_at": fb_dt.isoformat(),
            "synthetic": "TRUE",
        })
        fb_n += 1

    write_csv(
        "synthetic_investigation_cases.csv",
        ["case_id", "work_id", "risk_score", "risk_band", "lifecycle_stage", "primary_risk_reason",
         "workflow_stage", "assigned_to", "created_at", "status", "risk_field_origin", "workflow_data_origin"],
        cases,
    )
    write_csv(
        "synthetic_investigation_evidence.csv",
        ["evidence_id", "case_id", "evidence_type", "description", "uploaded_by", "uploaded_at", "synthetic"],
        evidence,
    )
    write_csv(
        "synthetic_investigation_outcomes.csv",
        ["outcome_id", "case_id", "outcome_type", "outcome_summary", "resolved_at", "synthetic"],
        outcomes,
    )
    write_csv(
        "synthetic_feedback.csv",
        ["feedback_id", "case_id", "request_id", "feedback_type", "feedback_text", "submitted_by",
         "rating", "submitted_at", "synthetic"],
        feedback,
    )
    return cases, evidence, outcomes, feedback


# ===========================================================================
# 9. DEMO SCENARIOS YAML
# ===========================================================================

def build_demo_scenarios_yaml(requests, recs, cases, outcomes, feedback, spatial):
    linked_req = next(r for r in requests if r["linked_work_id"] and r["status"] in
                       ("RECOMMENDATION_CREATED", "RECOMMENDATION_SUBMITTED"))
    linked_rec = next((r for r in recs if r["request_id"] == linked_req["request_id"]), None)
    high_case = next((c for c in cases if c["risk_band"] in ("HIGH", "CRITICAL")), cases[0])
    case_with_outcome = next((o for o in outcomes if o["case_id"] == cases[0]["case_id"]), outcomes[0] if outcomes else None)
    case_evidence_example = cases[0]["case_id"]
    fb_example = feedback[0] if feedback else None
    spatial_example = spatial[0] if spatial else None

    lines = []
    lines.append("# MPLAD Sentinel -- Demo Scenarios")
    lines.append("# All scenario data below is SYNTHETIC_DEMO except explicitly marked REAL_MPLADS fields")
    lines.append("# (work_id, risk_score, risk_band, lifecycle_stage, primary_risk_reason).")
    lines.append("")
    lines.append("scenarios:")

    lines.append("  - id: SCEN-1")
    lines.append("    title: \"Citizen need to MP recommendation\"")
    lines.append("    data_origin: SYNTHETIC_DEMO")
    lines.append(f"    steps:")
    lines.append(f"      - \"Citizen need logged: {linked_req['request_id']} ({linked_req['need_category']})\"")
    lines.append(f"      - \"Linked (for demo only) to real Work ID {linked_req['linked_work_id']} in the same state/constituency\"")
    if linked_rec:
        lines.append(f"      - \"MP team drafts recommendation {linked_rec['recommendation_id']}, priority {linked_rec['priority']}\"")
        lines.append(f"      - \"MP decision recorded: {linked_rec['mp_decision']}\"")
    lines.append("")

    lines.append("  - id: SCEN-2")
    lines.append("    title: \"High/Critical risk to DM investigation\"")
    lines.append("    data_origin: \"MIXED -- risk fields REAL_MPLADS, workflow fields SYNTHETIC_DEMO\"")
    lines.append("    steps:")
    lines.append(f"      - \"REAL_MPLADS Work ID {high_case['work_id']} carries risk_band={high_case['risk_band']} (Stage 2.1.1/2.2.1, unmodified)\"")
    lines.append(f"      - \"Sentinel flag opens synthetic investigation case {high_case['case_id']}\"")
    lines.append(f"      - \"Case assigned to synthetic DM/DA user {high_case['assigned_to']}\"")
    lines.append("")

    lines.append("  - id: SCEN-3")
    lines.append("    title: \"Risk explanation to evidence verification\"")
    lines.append("    data_origin: SYNTHETIC_DEMO")
    lines.append("    steps:")
    lines.append(f"      - \"Case {case_evidence_example} explanation names the real primary_risk_reason from Decision Intelligence\"")
    lines.append(f"      - \"Synthetic evidence metadata (documents, photographs, inspection notes) logged against the case\"")
    lines.append("")

    lines.append("  - id: SCEN-4")
    lines.append("    title: \"Investigation to outcome\"")
    lines.append("    data_origin: SYNTHETIC_DEMO")
    lines.append("    steps:")
    if case_with_outcome:
        lines.append(f"      - \"Case {case_with_outcome['case_id']} reaches outcome {case_with_outcome['outcome_type']}\"")
    lines.append("      - \"Outcome is a demonstration finding only -- not an actual government determination\"")
    lines.append("")

    lines.append("  - id: SCEN-5")
    lines.append("    title: \"Feedback to future model improvement\"")
    lines.append("    data_origin: SYNTHETIC_DEMO")
    lines.append("    steps:")
    if fb_example:
        lines.append(f"      - \"Feedback {fb_example['feedback_id']} ({fb_example['feedback_type']}) logged against a resolved case\"")
    lines.append("      - \"Feedback is stored as a potential future training/evaluation dataset -- no automatic retraining occurs\"")
    lines.append("")

    lines.append("  - id: SCEN-6")
    lines.append("    title: \"Synthetic spatial demonstration\"")
    lines.append("    data_origin: SYNTHETIC_DEMO")
    lines.append("    steps:")
    if spatial_example:
        lines.append(f"      - \"Scenario {spatial_example['scenario_id']} pairs real Work ID {spatial_example['work_id']} with synthetic asset {spatial_example['asset_id']}\"")
        lines.append(f"      - \"simulated_distance_km = {spatial_example['simulated_distance_km']} -- SIMULATED / SYNTHETIC DEMONSTRATION CONTEXT only\"")
    lines.append("      - \"UI must display: 'Demonstration spatial context - synthetic coordinates', never a real-GIS claim\"")
    lines.append("")

    with open(os.path.join(OUT_DIR, "demo_scenarios.yaml"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    rng = random.Random(RANDOM_SEED)

    authoritative = read_authoritative()
    registry_rows = build_demo_work_registry(authoritative)
    users = build_users(registry_rows)
    requests = build_citizen_requests(registry_rows, rng)
    recs = build_recommendations(requests, rng)
    assets = build_asset_registry(registry_rows, rng)
    spatial = build_spatial_scenarios(registry_rows, assets, rng)
    vendors = build_vendor_reference(registry_rows, rng)
    cases, evidence, outcomes, feedback = build_investigations(registry_rows, users, rng)
    build_demo_scenarios_yaml(requests, recs, cases, outcomes, feedback, spatial)

    print("Generation complete.")
    print(f"  demo_work_registry: {len(registry_rows)} rows")
    print(f"  synthetic_users: {len(users)} rows")
    print(f"  synthetic_citizen_requests: {len(requests)} rows")
    print(f"  synthetic_work_recommendations: {len(recs)} rows")
    print(f"  synthetic_asset_registry: {len(assets)} rows")
    print(f"  synthetic_spatial_scenarios: {len(spatial)} rows")
    print(f"  synthetic_vendor_reference: {len(vendors)} rows")
    print(f"  synthetic_investigation_cases: {len(cases)} rows")
    print(f"  synthetic_investigation_evidence: {len(evidence)} rows")
    print(f"  synthetic_investigation_outcomes: {len(outcomes)} rows")
    print(f"  synthetic_feedback: {len(feedback)} rows")


if __name__ == "__main__":
    main()
