# SYNTHETIC_DATA_DICTIONARY.md

MPLAD Sentinel — Synthetic Application/Demo Data Layer — Field Dictionary

This layer sits **above** the frozen pipeline:

```
Stage 1.6 Canonical Data Foundation
  -> Stage 2.1.1 Risk Engine
  -> Stage 2.2.1 Decision Intelligence
  -> SYNTHETIC APPLICATION/WORKFLOW DATA (this package)
```

Every table below is either:
- **REAL_MPLADS** — copied verbatim from `decision_intelligence.csv` (Stage 2.2.1), never recomputed, or
- **SYNTHETIC_DEMO** — generated purely to demonstrate the MP / DM-DA / MoSPI application workflow, and explicitly not official government data.

---

## demo_work_registry.csv — REAL_MPLADS

14 real Work IDs drawn from the authoritative `decision_intelligence.csv`, used as the fixed anchor points for every other synthetic table.

| Field | Origin | Notes |
|---|---|---|
| `work_id` | REAL | Primary key. Copied exactly. |
| `state`, `constituency`, `work_category` | REAL | Copied exactly. |
| `lifecycle_mode` | REAL | PRE_SANCTION / IN_PROGRESS / POST_COMPLETION. |
| `overall_risk`, `risk_band` | REAL | Never recomputed. |
| `primary_risk_component`, `secondary_risk_component` | REAL | Copied exactly. |
| `primary_reason_title` | REAL | Copied exactly. |
| `recommended_amount`, `sanctioned_amount`, `total_expenditure` | REAL | Copied exactly. |
| `work_data_origin` | Label | Always `REAL_MPLADS`. |
| `scenario_data_origin` | Label | Always `SYNTHETIC_DEMO` — marks that this row is being *used in* a synthetic demo scenario, not that the row itself is synthetic. |

## synthetic_users.csv — SYNTHETIC_DEMO

Fictional accounts standing in for the three role types. No real personal information.

| Field | Notes |
|---|---|
| `user_id` | Primary key, e.g. `USR-0001`. |
| `role` | `MP_TEAM` \| `DM_DA` \| `MOSPI_ADMIN`. |
| `display_name` | Generic role-based label (e.g. "MP Team Member 1") — not a real name. |
| `state`, `constituency` | Populated for MP_TEAM/DM_DA users, tied to registry geography. |
| `synthetic` | Always `TRUE`. |

## synthetic_citizen_requests.csv — SYNTHETIC_DEMO

~130 synthetic citizen need submissions demonstrating the "Citizen Need -> Need Identification -> Suggested Work -> MP Review -> Recommendation Draft -> Recommendation Submission" pipeline.

| Field | Notes |
|---|---|
| `request_id` | Primary key. |
| `citizen_need_text` | Synthetic, realistic, non-generic description. No PII. |
| `need_category` | One of 18 need categories (water, roads, lighting, health, etc). |
| `state`, `constituency` | For linked requests, exactly matches the linked real Work's geography. For unlinked requests, drawn from a broader synthetic pool. |
| `linked_work_id` | Nullable. When populated, must exist in `demo_work_registry.csv`. Most requests are intentionally unlinked. |
| `status` | SUBMITTED \| NEED_IDENTIFICATION \| SUGGESTED_WORK_IDENTIFIED \| MP_REVIEW \| RECOMMENDATION_CREATED \| RECOMMENDATION_SUBMITTED \| CLOSED_NOT_TAKEN_UP. |
| `created_at` | ISO date. |
| `data_origin` | Always `SYNTHETIC_DEMO`. |

## synthetic_work_recommendations.csv — SYNTHETIC_DEMO

One row for every citizen request whose status is `RECOMMENDATION_CREATED` or `RECOMMENDATION_SUBMITTED` (coverage is validated).

| Field | Notes |
|---|---|
| `recommendation_id` | Primary key. |
| `request_id` | Foreign key -> `synthetic_citizen_requests.request_id`. |
| `work_id` | Nullable — left blank; these are draft recommendations, not yet linked to a sanctioned real Work ID. |
| `suggested_work_type`, `proposed_category` | Derived from the parent request's need category. |
| `suggestion_reason` | Synthetic justification narrative. |
| `estimated_amount` | Synthetic figure, plausible range (₹1.5L–₹18L). |
| `priority` | LOW / MEDIUM / HIGH. |
| `mp_decision` | PENDING / APPROVED / DEFERRED / REJECTED. |
| `mp_justification` | Synthetic narrative tied to the decision. |
| `status` | DRAFT (for RECOMMENDATION_CREATED requests) or SUBMITTED (for RECOMMENDATION_SUBMITTED requests). |
| `created_at` | On/after the parent request's `created_at`. |
| `synthetic` | Always `TRUE`. |

## synthetic_asset_registry.csv — SYNTHETIC_DEMO

200 fictional public assets for the "nearby assets & overlap check" demo.

| Field | Notes |
|---|---|
| `asset_id` | Primary key. |
| `asset_type` | Borewell, School Building, Community Hall, etc. |
| `state`, `constituency` | Synthetic geography (may overlap with registry states for demo linkage). |
| `synthetic_latitude`, `synthetic_longitude` | **Entirely synthetic** — random coordinates inside a broad India bounding box, not tied to any real asset location. |
| `asset_status` | ACTIVE / UNDER_MAINTENANCE / INACTIVE / DECOMMISSIONED. |
| `installation_year` | 2005–2025. |
| `condition` | GOOD / FAIR / POOR / CRITICAL. |
| `synthetic` | Always `TRUE`. |

## synthetic_spatial_scenarios.csv — SYNTHETIC_DEMO

Pairs a real registry Work ID with 1–2 synthetic nearby assets and a **synthetic reference coordinate** standing in for the work's general area (never a real MPLADS GIS coordinate, which does not exist in the source data).

| Field | Notes |
|---|---|
| `scenario_id` | Primary key. |
| `work_id` | Real Work ID (for demo context only — the coordinates paired with it are synthetic). |
| `synthetic_reference_lat/lon` | Synthetic stand-in for the work's location. |
| `asset_id` | Foreign key -> `synthetic_asset_registry.asset_id`. |
| `synthetic_asset_lat/lon` | Copied from the asset registry. |
| `simulated_distance_km` | Haversine distance between the two **synthetic** coordinates. Never a real measured distance. |
| `demonstration_label` | Always `"SIMULATED / SYNTHETIC DEMONSTRATION CONTEXT"`. |
| `ui_wording_note` | Mandatory UI copy: *"Demonstration spatial context - synthetic coordinates."* Any UI must never say "Government GIS confirms this asset is nearby." |
| `synthetic` | Always `TRUE`. |

## synthetic_vendor_reference.csv — SYNTHETIC_DEMO

30 fictional vendor entries. Explicitly **not** an official blacklist and never modifies the risk engine.

| Field | Notes |
|---|---|
| `vendor_id` | Primary key. |
| `vendor_name` | Generic, non-identifying synthetic business name. |
| `state` | Synthetic geography. |
| `status` | ACTIVE / UNDER_REVIEW / FLAGGED_FOR_CONTEXT. |
| `works_count` | Synthetic contextual figure. |
| `note` | Always states this is contextual only, not an official blacklist, and does not modify risk score/band/engine output. |
| `synthetic` | Always `TRUE`. |

## synthetic_investigation_cases.csv — MIXED (risk fields REAL_MPLADS, workflow fields SYNTHETIC_DEMO)

8 investigation cases against real registry Work IDs, following: Sentinel Flag -> Review Case Created -> Assigned -> Investigation -> Evidence Uploaded -> Official Finding -> Resolution/Action.

| Field | Origin | Notes |
|---|---|---|
| `case_id` | Synthetic | Primary key. |
| `work_id` | Real | Foreign key -> `demo_work_registry.work_id`. |
| `risk_score`, `risk_band`, `lifecycle_stage`, `primary_risk_reason` | **REAL** | Copied exactly from the registry/authoritative data — never recalculated. |
| `workflow_stage` | Synthetic | Current point in the 7-stage workflow. |
| `assigned_to` | Synthetic | Foreign key -> `synthetic_users.user_id` (a DM_DA user). |
| `created_at` | Synthetic | ISO date. |
| `status` | Synthetic | OPEN / IN_PROGRESS / CLOSED. |
| `risk_field_origin` | Label | Always `REAL_MPLADS`. |
| `workflow_data_origin` | Label | Always `SYNTHETIC_DEMO`. |

## synthetic_investigation_evidence.csv — SYNTHETIC_DEMO

2–3 metadata-only evidence records per case. No fake official documents are fabricated — only evidence *metadata* (type + description), matching the "Image & Evidence Verification" step in the platform design.

| Field | Notes |
|---|---|
| `evidence_id` | Primary key. |
| `case_id` | Foreign key -> `synthetic_investigation_cases.case_id`. |
| `evidence_type` | document / photograph / inspection_note / work_order / measurement_record / invoice_reference. |
| `description` | Synthetic metadata-level description. |
| `uploaded_by` | Foreign key -> `synthetic_users.user_id`. |
| `uploaded_at` | On/after the parent case's `created_at`. |
| `synthetic` | Always `TRUE`. |

## synthetic_investigation_outcomes.csv — SYNTHETIC_DEMO

Demonstration outcomes for 5 of the 8 cases (the other 3 remain open/in-progress, matching the required "cases without outcomes should remain open" rule).

| Field | Notes |
|---|---|
| `outcome_id` | Primary key. |
| `case_id` | Foreign key -> `synthetic_investigation_cases.case_id`. |
| `outcome_type` | EXPLAINED / REQUIRES_ACTION / ESCALATED / INCONCLUSIVE — demonstration outcomes only, never claimed as actual government findings. |
| `outcome_summary` | Synthetic narrative. |
| `resolved_at` | On/after the case's latest evidence date. |
| `synthetic` | Always `TRUE`. |

## synthetic_feedback.csv — SYNTHETIC_DEMO

Meaningful narrative feedback (not generic boilerplate), covering alert usefulness, evidence resolution, data-quality issues, verification needs, and explanation clarity. Framed as a potential future training/evaluation dataset — **not** automatic retraining.

| Field | Notes |
|---|---|
| `feedback_id` | Primary key. |
| `case_id`, `request_id` | Nullable foreign keys — feedback may attach to either. |
| `feedback_type` | ALERT_USEFULNESS / EVIDENCE_RESOLUTION / DATA_QUALITY / VERIFICATION_NEEDED / EXPLANATION_CLARITY. |
| `feedback_text` | Meaningful synthetic narrative. |
| `submitted_by` | Foreign key -> `synthetic_users.user_id`. |
| `rating` | 1–5, synthetic. |
| `submitted_at` | ISO date. |
| `synthetic` | Always `TRUE`. |

## demo_scenarios.yaml — SYNTHETIC_DEMO

6 end-to-end demonstration scenarios referencing real generated IDs from the tables above, each explicitly labeled with its data origin (REAL_MPLADS / SYNTHETIC_DEMO / MIXED).
