# Stage 2.1.1 Verification Record

## Authoritative input

Executed against the actual frozen Stage 1.6 canonical dataset:
`stage1_6_canonical.zip` extracted without modification.

Canonical Work-ID universe: **72,675**.

## Corrections verified

### Peer benchmark

The previous peer fallback bug was corrected by calculating hierarchy
eligibility from the remaining unassigned comparison population. The GLOBAL
fallback is not used when its remaining comparison population has fewer than
20 non-null observations. Missing metric values receive no peer assignment.

Validation result: **0 assigned non-null peer groups below 20** and **0
assigned rows with missing metric values**.

### Explainability

Explanations now expose positive weighted contributions from every current
stage score component through `component_ids` and
`component_contributions`, with human-readable `component_reason_*` fields.

Validation result: **0 missing positive score-component reasons** and **0
unexpected component reasons**.

## Full output checks

| Check | Result |
|---|---:|
| Risk feature rows | 72,675 |
| Risk feature columns | 122 |
| Risk signal rows | 103,414 |
| Risk score rows | 72,675 |
| Explanation rows | 72,675 |
| Top anomaly rows | 100 |
| PRE_SANCTION works | 913 |
| IN_PROGRESS works | 37,892 |
| POST_COMPLETION works | 33,870 |
| Validation checks | **20/20 PASS** |

## Risk distribution

| Band | Count |
|---|---:|
| LOW | 31,900 |
| MEDIUM | 25,988 |
| HIGH | 12,952 |
| CRITICAL | 1,835 |

These are review-priority bands, not fraud probabilities.

## Regression scope

Stage 1.6 was not rebuilt or changed. Existing Stage 2.1 temporal-safety,
Isolation Forest, allocation, parliamentary-term, and non-punitive data-quality
logic was retained. RULE-007 was retained because the actual canonical data
contains no resolved expenditure/sanction ratio above 1.0.

## Output checksums

The following SHA-256 values identify this exact generated output set:

- `risk_features.csv`: `632b6815ec2b1b5a58402e88d857059b376a3a9076afaaf8a5c1251270d0d943`
- `risk_signals.csv`: `64fffa030c7f6c8dcecb6178e24adfe9325095e6bd569eda811362a0f4c22e20`
- `risk_scores.csv`: `a141a5b25e8cd6f733361d33ad0175753710927da89abf7f469676ab857a31b9`
- `risk_explanations.csv`: `15278ad038435c0bc13581d18f98be515566fbb47c61cf978483d538925462d4`
- `top_anomalies.csv`: `874a633af479d46073d522e3d91f14e5ace82d24d297e0b920e66693529ff39a`
- `models/model_metadata.json`: `fb25b519c96eee41a9029b89c899fe598594dd2a0ff19679aa2186d68f1be006`
- `models/isolation_forest.pkl`: `80f446e8898a59b0c0515de2f24afd64349533256f18655a44774ca0ad820480`
- `reports/risk_engine_validation.md`: `383343ddf28b6a817b6786ac2d31cf08f22572da9f158b83b246c78d40b9e1a4`

**Final verdict: STAGE 2.1.1 PASSES.**
