# Stage 2.1.1 Correction Report

## Scope

Stage 2.1.1 is a targeted correction to the frozen Stage 2.1 Risk Engine.
Stage 1.6 canonical data was not rebuilt, reconciled, or modified.

Two independently verified Stage 2.1 findings were corrected:

1. peer benchmark fallback could label a peer group as trusted even though
   the actual comparison set had fewer than 20 non-null observations;
2. risk explanations described rule signals but did not expose positive
   statistical, ML, peer, or data-quality score components that could move
   the final review-priority score.

RULE-007 was intentionally **not** changed: independent calculation on the
actual Stage 1.6 canonical expenditure events found a maximum resolved
expenditure/sanction ratio of 1.0 and zero works above 1.0, so the rule was
implemented correctly but simply did not trigger in this snapshot.

## Peer benchmark correction

The corrected algorithm evaluates peer-group eligibility on the **remaining
unassigned comparison population at each hierarchy level**. This prevents
rows already assigned at a more-specific level from being counted toward the
size of a broader fallback group.

The GLOBAL fallback is also subject to `PEER_MIN_GROUP_SIZE = 20`. If fewer
than 20 non-null observations remain, the metric is left unbenchmarked rather
than comparing against a tiny residual group.

Rows whose metric value is null never receive a peer assignment.

Independent validation on the real Stage 1.6 data found:

- assigned non-null peer groups below 20: **0**
- assigned rows with missing metric values: **0**

## Explainability correction

`risk_explanations.csv` now contains:

- `component_reason_1` through `component_reason_3`
- `component_ids`
- `component_contributions`

The component reasons are ranked by their **actual weighted contribution**
to the current-stage overall score. Positive contributions from rules,
statistical anomalies, Isolation Forest, peer anomalies, and data-quality
uncertainty are therefore visible in the explanation.

Data-quality language is explicitly framed as uncertainty/coverage requiring
verification, not as evidence of wrongdoing. ML and peer reasons describe
unusualness and never claim fraud.

## Real-canonical validation

The corrected pipeline was executed against the actual Stage 1.6 canonical
dataset containing 72,675 Work IDs.

- `risk_features.csv`: 72,675 rows × 122 columns
- `risk_signals.csv`: 103,414 signal rows
- `risk_scores.csv`: 72,675 rows
- `risk_explanations.csv`: 72,675 rows
- `top_anomalies.csv`: 100 rows
- lifecycle populations: PRE 913 / IN_PROGRESS 37,892 / POST 33,870
- validation: **20/20 PASS**

Risk distribution after the correction:

| Band | Count |
|---|---:|
| LOW | 31,900 |
| MEDIUM | 25,988 |
| HIGH | 12,952 |
| CRITICAL | 1,835 |

The distribution is a review-priority distribution, not a fraud probability.

## Regression guarantees

The correction did not alter:

- Stage 1.6 canonical Work-ID universe;
- Stage 1/1.5 reconciliation;
- temporal-safety rules already hardened in Stage 2.1;
- Isolation Forest configuration or lifecycle training populations;
- RULE-007 implementation;
- allocation semantics;
- parliamentary-term non-inference policy;
- data-quality non-punitive treatment.

The changed outputs are expected to differ from Stage 2.1 where peer
assignments affect peer anomaly scores, final scores, or explanations. The
changes are therefore not treated as a byte-for-byte regression against the
previous Stage 2.1 outputs.

## Final status

**STAGE 2.1.1 PASSES — corrected peer benchmarking and complete component-level explainability verified on the real Stage 1.6 canonical data.**
