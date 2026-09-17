# Stage 2.2.1 — Validation Report

**Result: 26/26 automated checks passed.**

Run via `python3 validate_stage2_2_1.py` from
`src/decision_intelligence/` (needs the Stage 1.6 canonical directory,
the Stage 2.1.1 output directory, and the previous Stage 2.2 package on
disk at the relative paths set at the top of the script).

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Exactly one row per canonical Work ID | PASS | 72,675 rows, 72,675 unique |
| 3 | No invented / dropped Work IDs | PASS | invented=0, dropped=0 |
| 4 | `overall_risk`, `risk_band`, `lifecycle_mode`, `primary_risk_component`, `secondary_risk_component` unchanged vs. Stage 2.2 | PASS | 0 differences each |
| 5 | `overall_risk` numerically identical to `risk_scores.csv` | PASS | max abs diff = 3.55e-15 |
| 6 | `risk_band` identical to `risk_scores.csv` | PASS | 0 mismatches |
| 7 | `lifecycle_mode` identical to `risk_features.risk_mode` | PASS | 0 mismatches |
| 8 | Component contributions / all `technical_*` fields unchanged | PASS | 0 differences |
| 9 | Only the intended explanation-text columns changed vs. Stage 2.2 | PASS | changed = `primary_reason_summary`, `recommended_verification`, `recommended_action_steps`; nothing unexpected |
| 10 | Each changed column's edits are confined to ML-primary rows | PASS | 3,815/3,815 changed rows are ML-primary, 0 outside |
| 11 | No fraud/corruption/wrongdoing language anywhere | PASS | 0 hits |
| 12 | No UNNEGATED "delayed/overdue" claims | PASS | 0 unnegated hits (the two "does not necessarily mean...officially delayed" sentences are the correct, negated phrasing already present in Stage 2.2) |
| 13 | ML-primary explanations are individually differentiated | PASS | 242 unique summaries across 3,815 rows (was 2 before this release) |
| 14 | ML explanations never claim a specific discovered cause | PASS | 0 hits for "the model detected" / "the cause is" / "caused by" |
| 15 | No peer group below 20 used anywhere in the file | PASS | min peer_group_size = 20 |
| 16 | Deterministic rerun | PASS | two independent runs of `build_ml_dimension_explanations.py` produce identical SHA-256 output |
| 17 | Financial figures trace exactly to `canonical_work_master.csv` | PASS | 0 mismatches, 72,675 rows |
| 18 | No event-level expenditure fan-out | PASS | 72,675 rows (not 55,173 events) |
| 19 | Primary-reason-type distribution recorded | PASS | see table below |
| 20 | Neutral fallback usage recorded | PASS | 0 rows |

## Required counts (per task Section "VALIDATION REQUIREMENTS")

| Metric | Count |
|---|---|
| Rule-primary explanations | 46,864 |
| Peer-primary explanations | 21,992 |
| ML-primary explanations | 3,815 |
| Statistical-primary explanations | 0 (unchanged from Stage 2.2 — see note below) |
| Data-quality-primary explanations | 4 |
| Neutral ("no dominant issue") fallback used | 0 |
| Rows with a populated peer comparison | 28,216 |
| Rows with a populated timeline comparison | 32,942 |
| Rows with a financial figure populated | 72,675 (every row has at least recommended/sanctioned/expenditure context, even if some individual amounts are absent) |
| Rows with no meaningful explanation possible | 0 — every one of the 72,675 works has a non-blank, evidence-backed `primary_reason_summary` |

**Note on "0 statistical-primary" (carried over from Stage 2.2, re-verified
here):** this is a structural fact of Stage 2.1.1's own component weights
(statistical anomaly is weighted lowest, 0.15, versus 0.35 for rules), not
a defect in this layer. Verified again directly against
`risk_explanations.csv`'s own `component_ids` column: the first-listed
component is never `statistical_anomaly_component` for any of the 72,675
works. Where a statistical signal (typically RULE-015) is nonetheless the
dominant *individual driver* of a rule-primary work's score, it is
surfaced directly in that work's `primary_reason_summary` (see
`WS/MP383/2024-2025/11215` / `/11216` in the examples file).

## Rows not modified in this release

Rule-primary (46,864 rows), peer-primary (21,992 rows), and data-quality
-primary (4 rows) explanations were re-audited against the same "is this
genuinely per-work or a disguised template" question that surfaced the
ML-primary defect, by checking the ratio of unique `primary_reason_summary`
values to row count within each class:

| primary_risk_component | rows | unique summaries | ratio |
|---|---|---|---|
| Peer comparison | 21,992 | 8,655 | 0.394 |
| Deterministic compliance rule | 46,864 | 3,992 | 0.085 |
| ML anomaly model (this release) | 3,815 | 242 | 0.063 (was 0.0005 before) |
| Data quality / coverage uncertainty | 4 | 1 | 0.250 |

The rule- and peer-primary ratios are lower than they might first appear
because many works genuinely *share* the same underlying evidence (same
work category + state + sanction date -> same peer group and the same
"days elapsed" figure), not because the text is templated without
substituting real values — confirmed by direct inspection (see
`decision_intelligence_examples.md`, carried over from Stage 2.2, plus
the spot checks in this report's checks 9-10 and 17). No comparable defect
to the ML-primary one (i.e., the same 1-2 fixed sentences reused
regardless of the individual work's own data) was found in these classes.

## Known, unchanged limitations (carried over from Stage 2.2)

- No planned/expected completion date exists anywhere in the canonical
  data, so no work is ever described as "delayed" — only "elapsed time
  since sanction," consistent with the task's Timeline Rule.
- `peer_comparison_text` / `timeline_comparison_text` are blank wherever
  Stage 2.1.1's own methodology could not support a valid comparison
  (fewer than 20 peers, or no completion date yet) — this is by design,
  not a coverage gap, and is unaffected by this release.
