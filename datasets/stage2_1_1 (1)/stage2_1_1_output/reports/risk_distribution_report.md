# Stage 2 Risk Engine -- Risk Distribution Report

All figures below are REVIEW-PRIORITY distributions, not fraud-rate estimates. A HIGH or CRITICAL band means a work deserves human attention sooner, not that wrongdoing has been confirmed.

## Overall risk-band distribution

| Band | Count | % of works |
|---|---|---|
| CRITICAL | 1835 | 2.52% |
| HIGH | 12952 | 17.82% |
| MEDIUM | 25988 | 35.76% |
| LOW | 31900 | 43.89% |

## Distribution by lifecycle mode

| Lifecycle mode | LOW | MEDIUM | HIGH | CRITICAL | Total |
|---|---|---|---|---|---|
| IN_PROGRESS | 17705 | 13272 | 6018 | 897 | 37892 |
| POST_COMPLETION | 14195 | 11881 | 6856 | 938 | 33870 |
| PRE_SANCTION | 0 | 835 | 78 | 0 | 913 |

## Distribution by state (top 15 by CRITICAL+HIGH count)

| State | LOW | MEDIUM | HIGH | CRITICAL |
|---|---|---|---|---|
| Uttar Pradesh | 2257 | 5104 | 3370 | 322 |
| West Bengal | 734 | 1556 | 753 | 121 |
| Bihar | 1484 | 1354 | 747 | 39 |
| Madhya Pradesh | 928 | 1825 | 687 | 95 |
| Telangana | 867 | 695 | 645 | 100 |
| Punjab | 720 | 1111 | 533 | 144 |
| Rajasthan | 274 | 762 | 463 | 166 |
| Andhra Pradesh | 484 | 983 | 546 | 67 |
| Odisha | 857 | 1202 | 497 | 89 |
| Tamil Nadu | 1453 | 1205 | 464 | 106 |
| Gujarat | 1473 | 1625 | 418 | 28 |
| Karnataka | 263 | 794 | 318 | 117 |
| Jharkhand | 371 | 637 | 381 | 3 |
| Chhattisgarh | 328 | 688 | 322 | 50 |
| Kerala | 458 | 501 | 256 | 78 |

## Distribution by work category (top 15 by CRITICAL+HIGH count)

| Work category | LOW | MEDIUM | HIGH | CRITICAL |
|---|---|---|---|---|
| Normal/Others | 14559 | 21894 | 11232 | 1743 |
| Repair and Renovation | 172 | 245 | 107 | 39 |
| Trust and Society | 60 | 62 | 43 | 18 |
| Bar and Associations | 0 | 1 | 0 | 0 |

## Most common risk signals

| Signal | Count | Description |
|---|---|---|
| RULE-003 | 30485 | Expenditure evidence exists without a sanction record on file. |
| RULE-002 | 25620 | Sanctioned but no expenditure evidence on file after an unusually long interval. |
| RULE-004 | 22884 | Completed but no expenditure evidence on file. |
| RULE-014 | 10153 | Strong peer-relative financial anomaly (robust z-score far from comparable works). |
| RULE-012 | 4386 | A single vendor accounts for an unusually high share of total disbursed expenditure. |
| RULE-015 | 3616 | Strong general statistical anomaly (robust z-score far from the overall distribution). |
| RULE-011 | 2141 | Number of payment events is unusually high relative to comparable works. |
| RULE-009 | 1294 | Recommendation-to-sanction duration is unusually long relative to comparable works. |
| RULE-013 | 978 | Conflicting expenditure records exist for this work (same work/date/vendor, differing status or amount). |
| RULE-001 | 942 | Recommended but not sanctioned after an unusually long interval. |
| RULE-010 | 878 | Sanction-to-completion duration is unusually long relative to comparable works. |
| RULE-008 | 37 | Expenditure-to-sanction ratio is unusually high relative to comparable works. |

## Top anomaly categories (signal_type breakdown)

| Signal type | Count |
|---|---|
| data_consistency | 54347 |
| lifecycle_delay | 26562 |
| peer_financial | 10190 |
| vendor | 4386 |
| statistical | 3616 |
| peer_duration | 2172 |
| peer_payment | 2141 |

## Missing-data impact

- No recommendation record on file: 45426 works (62.51%)
- No sanction record on file: 40675 works (55.97%)
- No expenditure evidence on file: 36691 works (50.49%)
- No completion record on file: 38805 works (53.40%)
- Source-level duplicate/conflict flagged in provenance: 21015 works (28.92%)
- Parliamentary term unknown across all lifecycle stages: 67982 works (93.54%)

Missing data is treated as uncertainty, not evidence of wrongdoing -- see STAGE2_RISK_ENGINE_README.md and the data_quality_component cap in risk_scoring.py.