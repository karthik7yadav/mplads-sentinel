# Stage 2.2 -- `decision_intelligence.csv` Field Dictionary

One row per canonical Work ID (72,675 rows, primary key `work_id`). This
layer never changes `overall_risk`, `risk_band`, `lifecycle_mode`, or any
Stage 2.1.1 component score -- it only translates already-computed
signals into human-readable, evidence-traceable explanations. Every field
below is either copied unchanged from a Stage 1.6 / Stage 2.1.1 source
column, or built deterministically from those columns (never invented,
never estimated).

Only fields that could actually be derived from the supplied data are
populated for a given work; unavailable fields are left blank/NaN rather
than filled with a placeholder.

## IDENTITY

| Field | Source | Notes |
|---|---|---|
| `work_id` | `canonical_work_master.work_id` | Primary key. |
| `state` | `canonical_work_master.state` | |
| `constituency` | `canonical_work_master.constituency` | |
| `work_category` | `canonical_work_master.work_category` | |
| `work_description` | `canonical_work_master.work_description` | |
| `lifecycle_mode` | `risk_features.risk_mode` (== `risk_scores.risk_mode`) | `PRE_SANCTION` / `IN_PROGRESS` / `POST_COMPLETION`. Verified identical to Stage 2.1.1 for all 72,675 rows (validation check 6). |

## RISK (unchanged from Stage 2.1.1 -- carried through, never recomputed)

| Field | Source | Notes |
|---|---|---|
| `overall_risk` | `risk_scores.overall_risk` | Byte-for-byte unchanged (validation check 4). |
| `risk_band` | `risk_scores.risk_band` | Unchanged (validation check 5). |
| `primary_risk_component` | Derived from `risk_explanations.component_ids` (first entry) | Human-readable label for whichever of the 5 score components (rule / statistical / ML / peer / data-quality) contributes the *most weighted points* to this work's score. Ordering and the underlying weighted-contribution values are Stage 2.1.1's own (`explainability._component_reasons`), not recomputed. |
| `secondary_risk_component` | Second entry of `component_ids` | Same as above, second-ranked. |

## HUMAN INTERPRETATION

| Field | Notes |
|---|---|
| `primary_reason_title` | Short plain-English headline for the work's primary driver (a specific rule, a peer-comparison metric, the ML anomaly model, a statistical metric, or data-quality gaps). |
| `primary_reason_summary` | 1-3 sentences with the actual value(s) behind the primary driver -- currency amounts, percentages, day counts, peer medians -- never a bare statistic like "z = 50.0" (that lives in TECHNICAL DETAILS instead). |
| `why_it_matters` | Ties the primary driver to the work's current lifecycle stage in plain language. |
| `recommended_verification` | 1-2 concrete, signal-specific verification steps for the official (never a generic "investigate this work"). |
| `confidence_or_data_availability_note` | Which data-quality/coverage flags (missing records, unresolved sources, conflicts, unknown parliamentary term) apply to this work at its current stage -- always populated, independent of whether data-quality was the primary driver. |

## FINANCIAL CONTEXT (copied unchanged from `canonical_work_master.csv` / `risk_features.csv`)

| Field | Source |
|---|---|
| `recommended_amount` | `canonical_work_master.recommended_amount` |
| `sanctioned_amount` | `canonical_work_master.sanction_amount` |
| `total_expenditure` | `canonical_work_master.total_expenditure` |
| `expenditure_to_sanction_ratio` | `risk_features.expenditure_to_sanction_ratio` |
| `expenditure_event_count` | `canonical_work_master.expenditure_event_count` (pre-aggregated at the work level in Stage 1.6 -- this layer never joins the 55,173-row `canonical_expenditure_events.csv` directly, which would fan out the one-row-per-work structure) |

## PEER CONTEXT (populated only when a valid peer comparison exists)

All values in this section describe **one specific metric** -- whichever
of the 7 peer-benchmarked metrics is most relevant to the primary reason
(named in `peer_metric_name`). They are populated **only** when Stage
2.1.1's own peer-assignment logic (imported directly from
`src/risk/peer_benchmark.py`, not reimplemented) found a peer group of at
least `PEER_MIN_GROUP_SIZE` (20) comparable works with a non-null value
for that metric.

| Field | Notes |
|---|---|
| `peer_metric_name` | Which of the 7 peer-benchmarked metrics this row's peer figures describe (e.g. "expenditure as a share of the sanctioned amount"). |
| `peer_level` | Which level of the peer hierarchy was actually used (same work category+state+constituency; same work category+state; same work category nationwide; or the full dataset), always stated -- never a silent fallback. |
| `peer_group_size` | Number of comparable works in that peer group. Always >= 20 (validation check 9). |
| `peer_median` / `peer_mean` | Recomputed directly from the same peer group Stage 2.1.1's own code assigns (re-derived via the imported `_peer_assignment_for_metric` function; **not** stored in Stage 2.1.1's own outputs, since `risk_features.csv` only stores the *deviation* from the median, not the median itself). Cross-validated: for every row, `(value - peer_median) / abs(peer_median)` reproduces Stage 2.1.1's own stored `..._deviation_from_peer_median` to within 1e-6 (0 mismatches across all 7 metrics, all rows). |
| `peer_percentile` | = `risk_features.<metric>_percentile_in_peer_group`, unchanged. |
| `peer_deviation` | = `risk_features.<metric>_deviation_from_peer_median`, unchanged. |
| `peer_comparison_text` | Full plain-English sentence: this work's value, the peer median/mean, the direction and magnitude of the difference, and the percentile. |

## TIMELINE CONTEXT

Distinguishes **actual elapsed duration** from **peer-relative duration**
from **official delay** (Section 8 of the task spec) -- this layer never
claims a work is "officially delayed" anywhere, because no
planned/expected completion date exists anywhere in the canonical data
(validation check 11 confirms zero unnegated delay claims in the output).

| Field | Notes |
|---|---|
| `recommendation_date` / `sanction_date` / `completion_date` | Copied unchanged from `canonical_work_master.csv`. |
| `implementation_duration_days` | For `POST_COMPLETION` works: `days_sanction_to_completion`. For `IN_PROGRESS` works: `days_since_sanction` (elapsed time so far, explicitly labelled as such, not a delay). For `PRE_SANCTION` works: `days_since_recommendation`. |
| `peer_duration_median` / `duration_deviation` | Only populated for `POST_COMPLETION` works with a valid peer benchmark on `days_sanction_to_completion` (16,628 of 33,870 completed works meet the >=20-peer minimum; the rest have no reliable peer duration comparison and are left blank rather than compared against an unreliable benchmark). |
| `timeline_comparison_text` | Plain-English sentence; always frames `IN_PROGRESS`/`PRE_SANCTION` durations as elapsed time, never as delay. |

## TECHNICAL DETAILS (for on-demand disclosure, not the primary explanation)

| Field | Notes |
|---|---|
| `technical_signal` | The specific `RULE-0xx` id if a rule signal is the primary driver, otherwise the internal Stage 2.1.1 component name (`peer_anomaly_component`, `ml_anomaly_component`, `statistical_anomaly_component`, or `data_quality_component`) that actually drives the score -- always matches `primary_risk_component`, never an unrelated lower-priority signal. |
| `technical_metric` | The underlying column name the signal is based on (e.g. `expenditure_to_sanction_ratio`, `payment_event`), where applicable. |
| `technical_value` | For rule-primary rows: the exact `signal_value` from `risk_signals.csv` (validated to match exactly, 0 mismatches -- check 16). For component-primary rows (no single rule dominates): that component's weighted contribution to the final score. |
| `technical_threshold` | The exact rule threshold from `risk_signals.csv`, where applicable. |
| `technical_component` | The raw Stage 2.1.1 component id driving the score (`rule_risk_component`, `peer_anomaly_component`, `ml_anomaly_component`, `statistical_anomaly_component`, or `data_quality_component`). |
| `technical_component_contribution` | That component's weighted contribution to `overall_risk`, from `risk_explanations.component_contributions`, unchanged. |

## EVIDENCE

| Field | Notes |
|---|---|
| `available_financial_information` | Which of recommended/sanctioned/expenditure figures are on file. |
| `available_lifecycle_information` | Recommendation/sanction dates on file, plus `work_status` as recorded. |
| `available_completion_information` | Completion date and amount disbursed at completion, if the work is marked completed. |
| `data_quality_note` | Same content as `confidence_or_data_availability_note` (kept as two fields to match the task spec's field list; both are always populated). |

## ACTION

| Field | Notes |
|---|---|
| `recommended_action_title` | Short (2-4 word) action label tied to the actual primary driver (e.g. "Compare with peer works", "Reconcile expenditure against sanction") -- never a generic "investigate this work". |
| `recommended_action_steps` | The same 1-2 concrete steps as `recommended_verification`, numbered. |

## What was deliberately left out

Fields listed in the task spec's suggested schema that are **not**
present here were omitted because Stage 1.6 / Stage 2.1.1 do not contain
supporting data for them, per the anti-hallucination rule (Section 23 of
the task spec): no official planned/expected completion date exists
anywhere in the source (so no delay column was created), and no
document-availability / image-content field beyond `image_present`
(already a Stage 1.6 boolean, not surfaced separately here since it was
not part of the risk engine's own signal set).
