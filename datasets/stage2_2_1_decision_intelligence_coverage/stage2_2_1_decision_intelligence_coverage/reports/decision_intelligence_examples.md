# Stage 2.2 -- Decision Intelligence: Manually Reviewed Examples

Eight required test cases (Section 20 of the task spec) plus notes on what each one demonstrates. Every value below is read directly from `decision_intelligence.csv` as actually produced by this build -- nothing here was hand-edited or assumed from a prior screenshot.

## A. Required target example

**Work ID:** `WS/MP383/2024-2025/11215`  
**Why this case was picked:** The specific high-priority example named in the task spec (Section 19), independently recalculated from source data rather than assumed from any prior screenshot.

**Identity**

- `work_id`: WS/MP383/2024-2025/11215
- `state`: Rajasthan
- `constituency`: RAJSAMAND
- `work_category`: Normal/Others
- `lifecycle_mode`: IN_PROGRESS

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 96.25
- `risk_band`: CRITICAL
- `primary_risk_component`: Deterministic compliance rule
- `secondary_risk_component`: ML anomaly model (atypical combination of characteristics)

**Human interpretation**

- `primary_reason_title`: Unusual expenditure as a share of the sanctioned amount compared with the overall portfolio
- `primary_reason_summary`: This work's expenditure as a share of the sanctioned amount is 23.8%. Across the overall portfolio of comparable-stage works, this is lower than typical (around the 4.6th percentile).
- `why_it_matters`: This work is currently in progress (sanctioned, but not yet marked completed). Extreme values relative to the overall dataset warrant a look, though several MPLADS ratios cluster tightly around typical values — which can make even modest real-world differences appear statistically extreme.
- `recommended_verification`: 1. Review the flagged figure against supporting documentation. | 2. Compare against comparable works before concluding the value is unusual.

**Peer context**

- `peer_metric_name`: expenditure as a share of the sanctioned amount
- `peer_level`: same work category, state, and constituency
- `peer_group_size`: 21.0
- `peer_median`: 0.24
- `peer_comparison_text`: This work: 23.8%. Comparable works (same work category, state, and constituency, n=21): median 24.0%, mean 41.8%. That is 0.2 percentage points below the peer median, at the 47.6th percentile among comparable works.

**Timeline context**

- `implementation_duration_days`: 625.0
- `timeline_comparison_text`: This work has been in sanctioned/in-progress status for approximately 625 days so far. No official planned/expected completion date is available in the source data, so this is elapsed time, not a delay determination.

**Technical details**

- `technical_signal`: RULE-015
- `technical_metric`: expenditure_to_sanction_ratio
- `technical_value`: 50.0
- `technical_threshold`: 3.5
- `technical_component`: rule_risk_component

**Action**

- `recommended_action_title`: Verify flagged figures

**Data quality**

- `confidence_or_data_availability_note`: Conflicting values exist across source records for this work; Some contributing source records for this work could not be fully resolved.

---

## B. Peer-dominant case

**Work ID:** `WS/MP18167/2025-2026/228471`  
**Why this case was picked:** Highest-risk work where peer comparison (not a rule, not ML, not raw statistics) is the single highest-weighted score component.

**Identity**

- `work_id`: WS/MP18167/2025-2026/228471
- `state`: Rajasthan
- `constituency`: JHUNJHUNU
- `work_category`: Normal/Others
- `lifecycle_mode`: POST_COMPLETION

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 78.07142857142857
- `risk_band`: CRITICAL
- `primary_risk_component`: Peer comparison
- `secondary_risk_component`: Deterministic compliance rule

**Human interpretation**

- `primary_reason_title`: Notable difference from peer works on total expenditure
- `primary_reason_summary`: Compared with peer works, this work's total expenditure stands out. This work: ₹48,015. Comparable works (same work category, state, and constituency, n=50): median ₹476,371, mean ₹392,631. That is about 0.1× the peer median (below it), at the 4.0th percentile among comparable works.
- `why_it_matters`: This work has been recorded as completed. Although not extreme enough to trigger an automatic compliance rule, this work differs from comparable works on this measure, which contributed to its review priority.
- `recommended_verification`: 1. Compare this work with peer works of the same category/state/constituency. | 2. Confirm the underlying figures against documentation.

**Peer context**

- `peer_metric_name`: total expenditure
- `peer_level`: same work category, state, and constituency
- `peer_group_size`: 50.0
- `peer_median`: 476371.0
- `peer_comparison_text`: This work: ₹48,015. Comparable works (same work category, state, and constituency, n=50): median ₹476,371, mean ₹392,631. That is about 0.1× the peer median (below it), at the 4.0th percentile among comparable works.

**Timeline context**

- `implementation_duration_days`: *(not populated -- no valid basis for this field on this work)*
- `timeline_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Technical details**

- `technical_signal`: peer_anomaly_component
- `technical_metric`: expenditure
- `technical_value`: 25.0
- `technical_threshold`: *(not populated -- no valid basis for this field on this work)*
- `technical_component`: peer_anomaly_component

**Action**

- `recommended_action_title`: Compare with peer works

**Data quality**

- `confidence_or_data_availability_note`: Conflicting values exist across source records for this work; Some contributing source records for this work could not be fully resolved; The parliamentary term for this work's record could not be determined.

---

## C. ML-dominant case

**Work ID:** `WS/MP446/2023-2024/122215`  
**Why this case was picked:** Highest-risk work where the Isolation Forest anomaly model is the single highest-weighted score component.

**Identity**

- `work_id`: WS/MP446/2023-2024/122215
- `state`: *(not populated -- no valid basis for this field on this work)*
- `constituency`: *(not populated -- no valid basis for this field on this work)*
- `work_category`: *(not populated -- no valid basis for this field on this work)*
- `lifecycle_mode`: IN_PROGRESS

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 72.25
- `risk_band`: HIGH
- `primary_risk_component`: ML anomaly model (atypical combination of characteristics)
- `secondary_risk_component`: Peer comparison

**Human interpretation**

- `primary_reason_title`: Atypical overall combination of recorded characteristics
- `primary_reason_summary`: Considered together — financial amounts, durations, payment patterns, and data completeness — this work's overall profile is unusual relative to other in-progress works. This is a holistic pattern signal from an unsupervised anomaly model: it does not point to one specific field, and 'unusual' does not mean 'improper'.
- `why_it_matters`: This work is currently in progress (sanctioned, but not yet marked completed). The model ranks this work as atypical relative to others at the same lifecycle stage; it is a starting point for review, not a finding.
- `recommended_verification`: 1. Review this work's full record against similar works at the same lifecycle stage. | 2. Inspect the underlying financial, payment, and lifecycle records.

**Peer context**

- `peer_metric_name`: *(not populated -- no valid basis for this field on this work)*
- `peer_level`: *(not populated -- no valid basis for this field on this work)*
- `peer_group_size`: *(not populated -- no valid basis for this field on this work)*
- `peer_median`: *(not populated -- no valid basis for this field on this work)*
- `peer_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Timeline context**

- `implementation_duration_days`: *(not populated -- no valid basis for this field on this work)*
- `timeline_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Technical details**

- `technical_signal`: ml_anomaly_component
- `technical_metric`: *(not populated -- no valid basis for this field on this work)*
- `technical_value`: 20.0
- `technical_threshold`: *(not populated -- no valid basis for this field on this work)*
- `technical_component`: ml_anomaly_component

**Action**

- `recommended_action_title`: Review holistically against similar works

**Data quality**

- `confidence_or_data_availability_note`: Conflicting values exist across source records for this work; No sanction record on file; Some contributing source records for this work could not be fully resolved; The parliamentary term for this work's record could not be determined.

---

## D. Statistical-dominant case

**Work ID:** `WS/MP383/2024-2025/11216`  
**Why this case was picked:** No work in this dataset has the standalone `statistical_anomaly_component` as its single highest-weighted component (see the validation report). The closest, most faithful equivalent -- and the spec's own worked example (Section 3) is itself a RULE-015 case -- is a work where RULE-015 (the general statistical-anomaly rule) is the single highest-severity signal driving `rule_risk_component`. Shown here is a second, distinct RULE-015 case (a different Work ID from case A) to demonstrate the pattern generalizes.

**Identity**

- `work_id`: WS/MP383/2024-2025/11216
- `state`: Rajasthan
- `constituency`: RAJSAMAND
- `work_category`: Normal/Others
- `lifecycle_mode`: IN_PROGRESS

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 95.13574126534466
- `risk_band`: CRITICAL
- `primary_risk_component`: Deterministic compliance rule
- `secondary_risk_component`: ML anomaly model (atypical combination of characteristics)

**Human interpretation**

- `primary_reason_title`: Unusual expenditure as a share of the sanctioned amount compared with the overall portfolio
- `primary_reason_summary`: This work's expenditure as a share of the sanctioned amount is 18.8%. Across the overall portfolio of comparable-stage works, this is lower than typical (around the 3.7th percentile).
- `why_it_matters`: This work is currently in progress (sanctioned, but not yet marked completed). Extreme values relative to the overall dataset warrant a look, though several MPLADS ratios cluster tightly around typical values — which can make even modest real-world differences appear statistically extreme.
- `recommended_verification`: 1. Review the flagged figure against supporting documentation. | 2. Compare against comparable works before concluding the value is unusual.

**Peer context**

- `peer_metric_name`: expenditure as a share of the sanctioned amount
- `peer_level`: same work category, state, and constituency
- `peer_group_size`: 21.0
- `peer_median`: 0.24
- `peer_comparison_text`: This work: 18.8%. Comparable works (same work category, state, and constituency, n=21): median 24.0%, mean 41.8%. That is 5.2 percentage points below the peer median, at the 28.6th percentile among comparable works.

**Timeline context**

- `implementation_duration_days`: 625.0
- `timeline_comparison_text`: This work has been in sanctioned/in-progress status for approximately 625 days so far. No official planned/expected completion date is available in the source data, so this is elapsed time, not a delay determination.

**Technical details**

- `technical_signal`: RULE-015
- `technical_metric`: expenditure_to_sanction_ratio
- `technical_value`: 50.0
- `technical_threshold`: 3.5
- `technical_component`: rule_risk_component

**Action**

- `recommended_action_title`: Verify flagged figures

**Data quality**

- `confidence_or_data_availability_note`: Conflicting values exist across source records for this work; Some contributing source records for this work could not be fully resolved.

---

## E. Data-quality-dominant case

**Work ID:** `WS/MP18019/2025-2026/216372`  
**Why this case was picked:** One of only 4 works nationwide where data-quality/coverage uncertainty (missing or unresolved records) is the single highest-weighted score component -- note the LOW risk band, since the engine's data-quality cap (Section 2 of the spec; `DATA_QUALITY_COMPONENT_CAP` in Stage 2.1.1) prevents missingness alone from ever pushing a work into HIGH/CRITICAL.

**Identity**

- `work_id`: WS/MP18019/2025-2026/216372
- `state`: *(not populated -- no valid basis for this field on this work)*
- `constituency`: *(not populated -- no valid basis for this field on this work)*
- `work_category`: *(not populated -- no valid basis for this field on this work)*
- `lifecycle_mode`: IN_PROGRESS

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 15.803423959854758
- `risk_band`: LOW
- `primary_risk_component`: Data quality / coverage uncertainty
- `secondary_risk_component`: ML anomaly model (atypical combination of characteristics)

**Human interpretation**

- `primary_reason_title`: Information gaps affecting this work's record
- `primary_reason_summary`: No sanction record on file; Some contributing source records for this work could not be fully resolved; The parliamentary term for this work's record could not be determined.
- `why_it_matters`: This work is currently in progress (sanctioned, but not yet marked completed). Missing or unresolved source information limits how completely this work's record can be verified from the available data alone; it is not, by itself, evidence of any issue.
- `recommended_verification`: 1. Obtain the missing or unresolved source records referenced above. | 2. Confirm the work's current status directly with the implementing agency where records are incomplete.

**Peer context**

- `peer_metric_name`: *(not populated -- no valid basis for this field on this work)*
- `peer_level`: *(not populated -- no valid basis for this field on this work)*
- `peer_group_size`: *(not populated -- no valid basis for this field on this work)*
- `peer_median`: *(not populated -- no valid basis for this field on this work)*
- `peer_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Timeline context**

- `implementation_duration_days`: *(not populated -- no valid basis for this field on this work)*
- `timeline_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Technical details**

- `technical_signal`: data_quality_component
- `technical_metric`: *(not populated -- no valid basis for this field on this work)*
- `technical_value`: 5.0
- `technical_threshold`: *(not populated -- no valid basis for this field on this work)*
- `technical_component`: data_quality_component

**Action**

- `recommended_action_title`: Obtain missing records

**Data quality**

- `confidence_or_data_availability_note`: No sanction record on file; Some contributing source records for this work could not be fully resolved; The parliamentary term for this work's record could not be determined.

---

## F. PRE_SANCTION work

**Work ID:** `WS/MP508/2023-2024/13249`  
**Why this case was picked:** Highest-risk work currently in the PRE_SANCTION lifecycle stage (recommended, not yet sanctioned).

**Identity**

- `work_id`: WS/MP508/2023-2024/13249
- `state`: Bihar
- `constituency`: JHANJHARPUR
- `work_category`: Normal/Others
- `lifecycle_mode`: PRE_SANCTION

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 61.642857142857146
- `risk_band`: HIGH
- `primary_risk_component`: Deterministic compliance rule
- `secondary_risk_component`: Peer comparison

**Human interpretation**

- `primary_reason_title`: Recommendation pending sanction for an extended period
- `primary_reason_summary`: This work was recommended on 2023-08-26 — approximately 1,096 days ago — but has no sanction on file.
- `why_it_matters`: This work has not yet been sanctioned. Extended pre-sanction delays can reflect administrative backlog, funding constraints, or a work that has stalled before ever being formally sanctioned.
- `recommended_verification`: 1. Confirm the current administrative/sanctioning status with the implementing agency. | 2. If the work is still active, request an updated timeline for sanction.

**Peer context**

- `peer_metric_name`: *(not populated -- no valid basis for this field on this work)*
- `peer_level`: *(not populated -- no valid basis for this field on this work)*
- `peer_group_size`: *(not populated -- no valid basis for this field on this work)*
- `peer_median`: *(not populated -- no valid basis for this field on this work)*
- `peer_comparison_text`: *(not populated -- no valid basis for this field on this work)*

**Timeline context**

- `implementation_duration_days`: 1096.0
- `timeline_comparison_text`: This work has been awaiting sanction for approximately 1,096 days since it was recommended.

**Technical details**

- `technical_signal`: RULE-001
- `technical_metric`: lifecycle_delay
- `technical_value`: 1096.0
- `technical_threshold`: 365.0
- `technical_component`: rule_risk_component

**Action**

- `recommended_action_title`: Confirm sanctioning status

**Data quality**

- `confidence_or_data_availability_note`: The parliamentary term for this work's record could not be determined.

---

## G. IN_PROGRESS work

**Work ID:** `WS/MP18112/2025-2026/177331`  
**Why this case was picked:** A HIGH-band work currently in the IN_PROGRESS lifecycle stage (sanctioned, not yet completed) -- selected because it demonstrates a documented Stage 2.1.1 limitation directly (see note below).

**Identity**

- `work_id`: WS/MP18112/2025-2026/177331
- `state`: Maharashtra
- `constituency`: AMRAVATI(SC)
- `work_category`: Normal/Others
- `lifecycle_mode`: IN_PROGRESS

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 74.99074605869922
- `risk_band`: HIGH
- `primary_risk_component`: Deterministic compliance rule
- `secondary_risk_component`: Peer comparison

**Human interpretation**

- `primary_reason_title`: Unusual expenditure as a share of the sanctioned amount compared with similar works
- `primary_reason_summary`: This work's expenditure as a share of the sanctioned amount stands out from comparable works. This work: 98.4%. Comparable works (same work category and state, n=174): median 99.9%, mean 95.4%. That is 1.5 percentage points below the peer median, at the 19.0th percentile among comparable works.
- `why_it_matters`: This work is currently in progress (sanctioned, but not yet marked completed). Financial or count anomalies relative to comparable works can have a legitimate explanation (e.g. phased projects, larger scope) but should be confirmed against documentation.
- `recommended_verification`: 1. Compare this work with peer works of the same category/state/constituency. | 2. Verify the underlying financial/payment documentation.

**Peer context**

- `peer_metric_name`: expenditure as a share of the sanctioned amount
- `peer_level`: same work category and state
- `peer_group_size`: 174.0
- `peer_median`: 0.9992406666666668
- `peer_comparison_text`: This work: 98.4%. Comparable works (same work category and state, n=174): median 99.9%, mean 95.4%. That is 1.5 percentage points below the peer median, at the 19.0th percentile among comparable works.

**Timeline context**

- `implementation_duration_days`: 373.0
- `timeline_comparison_text`: This work has been in sanctioned/in-progress status for approximately 373 days so far. No official planned/expected completion date is available in the source data, so this is elapsed time, not a delay determination.

**Technical details**

- `technical_signal`: RULE-014
- `technical_metric`: exp_sanction_ratio
- `technical_value`: 13.190247136019796
- `technical_threshold`: 3.5
- `technical_component`: rule_risk_component

**Action**

- `recommended_action_title`: Compare with peer works

**Data quality**

- `confidence_or_data_availability_note`: The parliamentary term for this work's record could not be determined.

---

## H. POST_COMPLETION work

**Work ID:** `WS/MP18177/2025-2026/168464`  
**Why this case was picked:** A HIGH-band completed work, showing both financial peer context and timeline peer context populated together.

**Identity**

- `work_id`: WS/MP18177/2025-2026/168464
- `state`: Tamil Nadu
- `constituency`: ERODE
- `work_category`: Normal/Others
- `lifecycle_mode`: POST_COMPLETION

**Risk (unchanged from Stage 2.1.1)**

- `overall_risk`: 74.97734077364363
- `risk_band`: HIGH
- `primary_risk_component`: Deterministic compliance rule
- `secondary_risk_component`: Peer comparison

**Human interpretation**

- `primary_reason_title`: Unusual recommended amount compared with similar works
- `primary_reason_summary`: This work's recommended amount stands out from comparable works. This work: ₹3,000,000. Comparable works (same work category, state, and constituency, n=47): median ₹600,000, mean ₹788,704. That is about 5.0× the peer median (above it), at the 100.0th percentile among comparable works.
- `why_it_matters`: This work has been recorded as completed. Financial or count anomalies relative to comparable works can have a legitimate explanation (e.g. phased projects, larger scope) but should be confirmed against documentation.
- `recommended_verification`: 1. Compare this work with peer works of the same category/state/constituency. | 2. Verify the underlying financial/payment documentation.

**Peer context**

- `peer_metric_name`: recommended amount
- `peer_level`: same work category, state, and constituency
- `peer_group_size`: 47.0
- `peer_median`: 600000.0
- `peer_comparison_text`: This work: ₹3,000,000. Comparable works (same work category, state, and constituency, n=47): median ₹600,000, mean ₹788,704. That is about 5.0× the peer median (above it), at the 100.0th percentile among comparable works.

**Timeline context**

- `implementation_duration_days`: 225.0
- `timeline_comparison_text`: This work: 225 days. Comparable works (same work category, state, and constituency, n=47): median 28 days, mean 78 days. That is about 8.0× the peer median (above it), at the 91.5th percentile among comparable works.

**Technical details**

- `technical_signal`: RULE-014
- `technical_metric`: recommended_amount
- `technical_value`: 8.093889113719142
- `technical_threshold`: 3.5
- `technical_component`: rule_risk_component

**Action**

- `recommended_action_title`: Compare with peer works

**Data quality**

- `confidence_or_data_availability_note`: The parliamentary term for this work's record could not be determined.

---

## Cross-cutting observations from manual review

- **Sign-awareness confirmed (cases A and D).** Both RULE-015 cases have a *negative* robust z-score on `expenditure_to_sanction_ratio` (this work spent far *less* of its sanction than the portfolio norm, not more), and both `primary_reason_summary` fields correctly say "lower than typical", not "higher". The raw rule signal text alone (`Strong overall statistical anomaly ... (robust z = 50.0)`) does not reveal direction since severity is computed from the absolute z-score -- this is exactly the kind of misreading the interpretation layer exists to prevent.

- **Global vs. peer nuance surfaced honestly (case A).** Work `WS/MP383/2024-2025/11215` is a *global* statistical outlier on its expenditure ratio (4.6th percentile across the whole portfolio) but is *unremarkable* among its 21 closest peers (47.6th percentile, essentially at the peer median). Both facts are shown side by side (in `primary_reason_summary` and `peer_comparison_text` respectively) rather than picking one narrative -- the spec's guidance not to "mix unrelated peer groups" or overstate a single comparison is respected by presenting both instead of collapsing them into one claim.

- **A large robust z-score does not always mean a large real-world difference (case G).** Work `WS/MP18112/2025-2026/177331` triggered RULE-014 with a peer robust z-score of 13.19 (multiples over the 3.5 threshold) on its expenditure ratio -- but the actual figures are 98.4% spent versus a peer median of 99.9%, a difference of only 1.5 percentage points. This is the exact "spike-shaped distribution" limitation Stage 2.1.1's own README documents (most works cluster tightly near a ratio of 1.0, so the median absolute deviation is tiny and even small real-world differences produce large z-scores). `peer_comparison_text` reports the 1.5-percentage-point figure, not the alarming z=13.19, which is the entire point of this layer.

- **RULE-007 never appears as a primary driver in this dataset.** RULE-007 ("expenditure exceeds sanction") fires whenever `expenditure_to_sanction_ratio > 1.0`, but its severity (`_severity_from_ratio`, capped at CRITICAL only when the ratio exceeds 2.0) is consistently outranked by RULE-005/006 (CRITICAL date-inconsistency signals), RULE-013 (conflicting records), or RULE-014/015 (peer/statistical anomalies) whenever those also apply to the same work. Confirmed directly against `risk_signals.csv`: RULE-007 signals do exist in the data, they are just never top-ranked. The traceability spot-check in the validation report therefore uses RULE-012 instead.

- **No `PRE_SANCTION` work reaches CRITICAL.** The highest-risk `PRE_SANCTION` work in the dataset (case F) is HIGH (61.6), consistent with `PRE_SANCTION`'s narrower signal set (only RULE-001 and the recommended-amount peer/ML components are eligible pre-sanction -- see `RULE_MODE_ELIGIBILITY` and `PEER_METRICS_BY_STAGE['PRE_SANCTION']` in Stage 2.1.1).
