# Stage 2.2.1 — Decision Intelligence Coverage

**Stage 2.2.1 changes only the human-readable decision-intelligence
layer. It does not retrain, reweight, rethreshold, or modify the
Stage 2.1.1 risk engine.**

## What this release is

A targeted quality pass on Stage 2.2's `decision_intelligence.csv`,
scoped to one concrete, verified gap found during review: all 3,815 rows
whose review priority is primarily driven by the ML anomaly model used
one of only two fixed template sentences, always naming the same four
dimensions regardless of whether that individual work's own data
supported each one. This violates the task spec's own instruction (in
"PRIMARY REASON LOGIC", item C) to "identify only the dimensions that
are actually supported by the available feature data."

This release fixes that, and only that. It is not a rebuild of Stage 2.2,
not a rebuild of the risk engine, and does not touch any frozen field.

## Files in this package

```
decision_intelligence.csv                         72,675 rows, one per Work ID -- identical to Stage 2.2
                                                   except primary_reason_summary / recommended_verification /
                                                   recommended_action_steps for the 3,815 ML-primary rows
decision_intelligence_sample.csv                  the same 48-row curated sample as Stage 2.2, refreshed
                                                   from this release's file (only 1 of the 48 rows differs --
                                                   the ML-dominant required test case)
examples/
  ml_before_after_examples.csv                    4 full before/after text pairs (2 flagged-dimension,
                                                   2 combination-only cases)
reports/
  stage2_2_1_change_report.md                     what was wrong, what was fixed, what was deliberately
                                                   left alone, and why
  stage2_2_1_validation.md                        26/26 checks against this release's validation checklist
  stage2_2_1_validation_raw.txt                   raw stdout of the validation script run
  stage2_2_1_dictionary_delta.md                  which columns' content changed and from which source
                                                   columns, plus a confirmed-unchanged list for the rest
  stage2_2_1_required_examples_regression.md      the 8 mandated regression Work IDs, checked individually
  decision_intelligence_dictionary.md             Stage 2.2's full field dictionary, carried over unmodified
                                                   (still accurate -- no field was added, removed, or retyped)
  decision_intelligence_examples.md               Stage 2.2's full example write-up, carried over unmodified
src/decision_intelligence/
  build_ml_dimension_explanations.py              the new logic for this release: computes, per ML-primary
                                                   work, which financial / duration / payment-pattern
                                                   dimensions individually cross Stage 2.1.1's own outlier
                                                   thresholds, and regenerates that work's explanation text
                                                   accordingly
  validate_stage2_2_1.py                          this release's 26-point validation script
  build_decision_intelligence.py, build_part2_helpers.py, build_part3_reasons.py,
  build_part4_main.py, build_part5_run.py, full_build.py, step1_peer_recompute.py,
  validate_decision_intelligence.py               Stage 2.2's original build pipeline, carried over
                                                   unmodified -- this is what still produces every column
                                                   and every row this release did not touch
README.md                                         this file
```

## How to reproduce

```
# from the environment used to build Stage 2.2 (Stage 1.6 canonical dir
# and Stage 2.1.1 output dir on disk):
python3 step1_peer_recompute.py && python3 full_build.py            # reproduces Stage 2.2's decision_intelligence.csv
python3 build_ml_dimension_explanations.py                          # produces ml_explanation_updates.csv (3,815 rows)
# merge ml_explanation_updates.csv into decision_intelligence.csv by
# work_id, overwriting only primary_reason_summary /
# recommended_verification / recommended_action_steps
python3 validate_stage2_2_1.py                                      # 26/26 checks
```

`build_ml_dimension_explanations.py` was independently rerun twice; both
runs produced byte-identical output (SHA-256 match) — fully deterministic,
no randomness.

## What changed, in one sentence

For the 3,815 works whose top risk driver is the unsupervised anomaly
model, the explanation now names the specific financial, timeline, or
payment-pattern measurement(s) that are individually unusual for that
work — or says plainly that no single measurement is extreme and the
signal is a genuine combination effect — instead of always listing all
four possible dimensions regardless of whether the data backs each one.

## What did not change

`overall_risk`, `risk_band`, `lifecycle_mode`, every component
contribution, every `technical_*` field, and all 43 other columns are
byte-identical to Stage 2.2 for all 72,675 rows (verified in
`validate_stage2_2_1.py`, checks 4, 8, 9). Nothing was retrained,
re-weighted, or re-thresholded — the two constants used in this release's
new logic (percentile 0.95/0.05, robust z 3.5) are Stage 2.1.1's own,
already-in-production `HIGH_PERCENTILE_THRESHOLD` and
`ROBUST_Z_ANOMALY_THRESHOLD`, imported unchanged from
`stage2_1_1_output/src/risk/config.py`.

## Human-in-the-loop

Unchanged from Stage 2.2: Sentinel identifies works for review and
provides evidence-based signals. Final action remains with the
authorized official. The output is a review priority, not a fraud
probability or a finding of wrongdoing.

## Not in scope for this release

No dashboard work was done (per the task brief's explicit instruction not
to proceed to dashboard development). No changes to rule-, peer-, or
data-quality-primary explanations, which were audited and found not to
have the defect this release targets (see
`reports/stage2_2_1_change_report.md`, "What was NOT changed and why").
