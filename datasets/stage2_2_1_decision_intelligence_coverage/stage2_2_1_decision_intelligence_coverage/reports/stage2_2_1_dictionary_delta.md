# Stage 2.2.1 — Field Dictionary (delta from Stage 2.2)

All 47 columns are unchanged in name, type, and meaning from Stage 2.2's
`decision_intelligence_dictionary.md` (carried over unmodified in this
package — see that file for the full field-by-field reference). This
document covers only what changed in this release: the *content* of
three columns, for one subset of rows.

## Columns with changed content (ML-primary rows only, 3,815 of 72,675)

### `primary_reason_summary`
- **Scope of change:** rows where `primary_risk_component` ==
  `"ML anomaly model (atypical combination of characteristics)"`.
- **Source columns now used (in addition to what Stage 2.2 already used):**
  from `stage2_1_1_output/risk_features.csv` —
  `recommended_amount_percentile_in_peer_group`,
  `sanction_amount_percentile_in_peer_group`,
  `expenditure_percentile_in_peer_group`,
  `exp_sanction_ratio_percentile_in_peer_group`,
  `expenditure_to_sanction_ratio_statistical_anomaly` (+ `_percentile`),
  `expenditure_to_recommended_ratio_statistical_anomaly` (+ `_percentile`),
  `duration_percentile_in_peer_group`,
  `rec_sanction_duration_percentile_in_peer_group`,
  `days_recommendation_to_sanction_statistical_anomaly` (+ `_percentile`),
  `days_sanction_to_completion_statistical_anomaly` (+ `_percentile`),
  `completion_to_sanction_ratio_statistical_anomaly` (+ `_percentile`),
  `payment_event_percentile_in_peer_group`,
  `unique_vendor_count_statistical_anomaly` (+ `_percentile`),
  `vendor_concentration_statistical_anomaly` (+ `_percentile`),
  `same_day_multi_payment_indicator`.
- **Logic:** see `build_ml_dimension_explanations.py`. Any column above
  that crosses Stage 2.1.1's own `HIGH_PERCENTILE_THRESHOLD` (0.95 /
  0.05) or `ROBUST_Z_ANOMALY_THRESHOLD` (3.5) — both constants imported
  unchanged from `stage2_1_1_output/src/risk/config.py` — is named
  explicitly in the sentence, with its percentile value. If none cross
  the threshold, the sentence says so explicitly rather than implying an
  unsupported dimension.

### `recommended_verification`, `recommended_action_steps`
- **Scope of change:** same 3,815 rows.
- **Logic:** if one or more dimensions were individually flagged (see
  above), the verification steps name those dimensions specifically
  ("Review this work's `<dimension>` figures against comparable works").
  Otherwise the steps retain Stage 2.2's original generic wording
  ("review the full record... for anything that does not individually
  stand out but looks unusual in combination").

## Columns explicitly confirmed unchanged (all 72,675 rows)

`work_id`, `state`, `constituency`, `work_category`, `work_description`,
`lifecycle_mode`, `overall_risk`, `risk_band`, `primary_risk_component`,
`secondary_risk_component`, `why_it_matters`, `confidence_or_data_availability_note`,
`recommended_amount`, `sanctioned_amount`, `total_expenditure`,
`expenditure_to_sanction_ratio`, `expenditure_event_count`,
`peer_metric_name`, `peer_level`, `peer_group_size`, `peer_median`,
`peer_mean`, `peer_percentile`, `peer_deviation`, `peer_comparison_text`,
`recommendation_date`, `sanction_date`, `completion_date`,
`implementation_duration_days`, `peer_duration_median`,
`duration_deviation`, `timeline_comparison_text`, `technical_signal`,
`technical_metric`, `technical_value`, `technical_threshold`,
`technical_component`, `technical_component_contribution`,
`available_financial_information`, `available_lifecycle_information`,
`available_completion_information`, `data_quality_note`,
`recommended_action_title` -- all byte-identical (float columns compared
with a 1e-6 tolerance to allow for harmless CSV round-trip repr noise;
see `validate_stage2_2_1.py` check 9).
