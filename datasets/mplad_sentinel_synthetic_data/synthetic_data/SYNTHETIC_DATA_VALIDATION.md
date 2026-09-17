# SYNTHETIC_DATA_VALIDATION.md

MPLAD Sentinel -- Synthetic Application/Demo Data Layer -- Validation Report

**Result: 65/65 checks passed.**

This validation covers the SYNTHETIC application/workflow layer generated on
top of the frozen Stage 2.1.1 Risk Engine and Stage 2.2.1 Decision Intelligence
outputs. It re-verifies, against the authoritative `decision_intelligence.csv`,
that no real risk score, risk band, lifecycle stage, or geography value was
invented or silently altered anywhere in the synthetic package.

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | All demo Work IDs exist in authoritative decision_intelligence.csv | PASS | 14 registry IDs checked |
| 2 | Demo Work IDs are unique in demo_work_registry.csv | PASS | 14 rows, 14 unique |
| 3 | Real risk scores (overall_risk) exactly match authoritative data | PASS | 0 mismatches |
| 4 | Real risk bands exactly match authoritative data | PASS | 0 mismatches |
| 5 | Real lifecycle stages exactly match authoritative data | PASS | 0 mismatches |
| 6 | Real state values exactly match authoritative data | PASS | 0 mismatches |
| 7 | Real constituency values exactly match authoritative data | PASS | 0 mismatches |
| 8 | Real primary_risk_component exactly matches authoritative data | PASS | 0 mismatches |
| 9 | Real primary_reason_title exactly matches authoritative data | PASS | 0 mismatches |
| 10 | Registry covers all 3 lifecycle stages (where they exist in source) | PASS | covered=['IN_PROGRESS', 'POST_COMPLETION', 'PRE_SANCTION'] |
| 11 | Linked citizen request Work IDs exist in demo_work_registry | PASS | 14 linked requests, 0 broken links |
| 12 | Linked request state exactly matches linked Work's state | PASS | 0 mismatches |
| 13 | Linked request constituency exactly matches linked Work's constituency | PASS | 0 mismatches |
| 14 | Citizen request IDs are unique | PASS | 130 rows, 130 unique |
| 15 | Recommendation coverage complete for RECOMMENDATION_CREATED/SUBMITTED requests | PASS | 36 requiring recs, 0 missing |
| 16 | Recommendation request_id foreign keys are valid | PASS | 0 broken refs |
| 17 | Recommendation IDs are unique | PASS | 36 rows, 36 unique |
| 18 | Recommendation dates are logical (on/after linked request's created_at) | PASS | 0 out-of-order |
| 19 | Investigation Work IDs exist in demo_work_registry | PASS | 0 broken refs |
| 20 | Investigation risk scores exactly match authoritative data | PASS | 0 mismatches |
| 21 | Investigation risk bands exactly match authoritative data | PASS | 0 mismatches |
| 22 | Investigation lifecycle stages exactly match authoritative data | PASS | 0 mismatches |
| 23 | Evidence belongs to valid investigation cases | PASS | 0 broken refs |
| 24 | Evidence dates are logically ordered (on/after case created_at) | PASS | 0 out-of-order |
| 25 | Evidence IDs are unique | PASS | 21 rows, 21 unique |
| 26 | Investigation outcomes belong to valid cases | PASS | 0 broken refs |
| 27 | Closed/resolved cases have appropriate outcomes | PASS | 0 closed cases missing an outcome |
| 28 | Open/in-progress cases are not falsely marked resolved | PASS | 0 contradictions |
| 29 | Outcome IDs are unique | PASS | 5 rows, 5 unique |
| 30 | Feedback references valid cases/requests where applicable | PASS | 0 bad case refs, 0 bad request refs |
| 31 | Feedback text is meaningful narrative, not generic boilerplate | PASS | 0 generic entries |
| 32 | Feedback IDs are unique | PASS | 7 rows, 7 unique |
| 33 | Spatial scenario references valid synthetic assets | PASS | 0 broken refs |
| 34 | Spatial scenario work_id references valid demo registry entries | PASS | 0 broken refs |
| 35 | Spatial scenarios do not claim real project coordinates (explicit demo label present) | PASS | 0 missing/incorrect label |
| 36 | simulated_distance_km present and never framed as an official GIS claim | PASS | 0 missing values, 0 forbidden-wording hits |
| 37 | Vendor data is clearly synthetic and states it does not modify risk | PASS | 30 vendors checked |
| 38 | Vendor IDs are unique | PASS | 30 rows, 30 unique |
| 39 | No PII markers found in any synthetic file | PASS | 0 hits |
| 40 | All purely-synthetic files carry a synthetic=TRUE provenance flag | PASS |  |
| 41 | synthetic_citizen_requests carries SYNTHETIC_DEMO data_origin | PASS |  |
| 42 | synthetic_work_recommendations carries synthetic=TRUE | PASS |  |
| 43 | Investigation cases separately label REAL_MPLADS risk fields vs SYNTHETIC_DEMO workflow fields | PASS |  |
| 44 | Real MPLADS fields (category, secondary component, financials) not silently modified | PASS | 0 field mismatches |
| 45 | No invented Work IDs referenced anywhere in the synthetic package | PASS | 0 invented IDs: [] |
| 46 | No duplicate primary IDs in any table | PASS | 0 duplicates across all tables |
| 47 | No broken foreign keys across the package (aggregate) | PASS | 0 total broken refs |
| 48 | No impossible negative financial amounts | PASS | 0 negative amounts |
| 49 | All date fields parse as valid ISO dates | PASS |  |
| 50 | Investigation date ordering valid (created <= evidence <= outcome) | PASS | 0 cases with bad ordering |
| 51 | Lifecycle consistency between registry and investigation cases | PASS | 0 inconsistencies |
| 52 | Recommendation status consistent with parent request status | PASS | 0 inconsistencies |
| 53 | Investigation workflow_stage consistent with case status | PASS | 0 inconsistencies |
| 54 | Outcome/status consistency reaffirmed (closed<->outcome bijection on this dataset) | PASS |  |
| 55 | Every case has 2-3 evidence records | PASS | 0 cases with <2 evidence rows |
| 56 | Every resolved case with an outcome has at least one feedback entry | PASS | 0 missing feedback |
| 57 | State/constituency consistency: assets use only recognised state labels | PASS | 0 out-of-set states |
| 58 | Deterministic generation confirmed (byte-identical rerun, verified separately) | PASS | See generation log: two runs diffed with `diff -rq`, 0 differences |
| 59 | Deterministic validation (this script uses no randomness / wall-clock branching) | PASS |  |
| 60 | Package manifest matches actual files present | PASS | all 12 data files present |
| 61 | No unsupported official-government claims anywhere in synthetic text fields | PASS | 0 hits |
| 62 | No real geographic proximity claims in spatial scenario wording | PASS | 0 hits |
| 63 | Recommendation estimated_amount values are within a sane synthetic range | PASS | 0 out-of-range |
| 64 | All synthetic user roles are within {MP_TEAM, DM_DA, MOSPI_ADMIN} | PASS | 0 bad roles |
| 65 | Investigation case assigned_to references a valid synthetic user | PASS | 0 broken refs |

## All checks passed. Package may be called complete (as SYNTHETIC DEMO/APPLICATION DATA -- never 'production-ready').
