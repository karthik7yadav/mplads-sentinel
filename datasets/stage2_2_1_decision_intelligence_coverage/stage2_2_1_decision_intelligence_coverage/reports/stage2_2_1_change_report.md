# Stage 2.2.1 — Change Report

## Scope of this release

Stage 2.2.1 is a **targeted text fix**, not a rebuild. It changes exactly
**three columns**, and only for the **3,815 rows** (5.25% of the 72,675-row
dataset) where `primary_risk_component == "ML anomaly model (atypical
combination of characteristics)"`:

- `primary_reason_summary`
- `recommended_verification`
- `recommended_action_steps`

`why_it_matters` was reviewed and left unchanged (see "What was NOT
changed and why" below). Every other column, every other row, is
byte-identical to the previous Stage 2.2 delivery. This is verified
programmatically in `validate_stage2_2_1.py` (checks 4, 8, 9, 10).

## What was wrong

Reviewing the existing Stage 2.2 output against the task brief's own
Section C requirement —

> "identify only the dimensions that are actually supported by the
> available feature data... Do NOT fabricate a specific cause."

— showed that **all 3,815 ML-primary rows used exactly one of two fixed
template sentences**, varying only by lifecycle stage (in-progress vs.
completed), and both templates always named the **same four dimensions**
("financial amounts, durations, payment patterns, and data completeness")
regardless of whether that specific work's own data actually showed
anything unusual on each of those four axes.

This is a defensible design as a fallback, but it does not do what the
brief specifically asks for: identifying *only the dimensions actually
supported by the data*, per work. For a work whose *only* unusual
characteristic was, say, an extremely low total expenditure relative to
peers, the old text implied duration and payment-pattern anomalies were
also part of the picture, when neither was individually true.

## What was fixed

`build_ml_dimension_explanations.py` recomputes, for each ML-primary work,
whether any of its own recorded measurements in **three** dimension groups
— financial, timeline/duration, payment-pattern — individually cross
Stage 2.1.1's **own, pre-existing, unmodified** outlier thresholds:

- Peer-relative percentile ≥ 0.95 or ≤ 0.05
  (`HIGH_PERCENTILE_THRESHOLD` / its complement, from
  `stage2_1_1_output/src/risk/config.py`)
- Robust z-score ≥ 3.5 in absolute value (`ROBUST_Z_ANOMALY_THRESHOLD`,
  same file)
- Stage 2.1.1's own pre-computed `*_statistical_anomaly` boolean flags
  (global/portfolio-wide checks)
- `same_day_multi_payment_indicator` (an existing boolean feature)

No new thresholds were invented. Every number quoted in the new text
(a percentile, a flag) is read directly from `risk_features.csv` —
the same frozen Stage 2.1.1 file the rest of Stage 2.2 already uses.

Data-quality/completeness evidence is **not** duplicated into this text,
because it is already carried in the separate, pre-existing
`data_quality_note` column for every row (rule-, peer-, and ML-primary
alike) — adding it here would just repeat the same fact in two columns.

Two outcomes are possible per work, and the new text says which applies:

1. **621 works** have at least one individually-flagged measurement.
   The new text names it/them specifically, e.g.:
   > "...the following stood out on their own: financial (total
   > expenditure (1.4th percentile among comparable works))."

2. **3,194 works** have no single measurement crossing the threshold —
   this is a genuine "the combination is unusual even though no one
   number is" case, which is an accurate and *more honest* statement
   than the old blanket four-dimension claim, and is exactly the kind
   of case an unsupervised anomaly model is meant to catch. The new
   text says so plainly:
   > "...no individual measurement for this work (financial amounts,
   > timeline/duration, or payment pattern) is extreme enough on its
   > own to cross the portfolio's outlier thresholds... the signal
   > reflects several moderately unusual values considered together."

`recommended_verification` / `recommended_action_steps` were updated in
parallel so an official reviewing a flagged-dimension work is pointed at
the specific figures that stood out, rather than a generic "review
everything" instruction.

## Before / after examples

See `examples/ml_before_after_examples.csv` for four full before/after
pairs (two flagged-dimension cases, two combination-only cases).

Illustrative excerpt (flagged-dimension case, `WS/MP017/2025-2026/169195`):

- **Before:** "Considered together — financial amounts, durations,
  payment patterns, and data completeness — this work's overall profile
  is unusual relative to other in-progress works."
- **After:** "...Looking at this work's own individual measurements (not
  just the combination), the following stood out on their own: financial
  (total expenditure (1.4th percentile among comparable works))."

## What was NOT changed and why

- **`overall_risk`, `risk_band`, `lifecycle_mode`, all component
  contributions, all `technical_*` fields**: untouched, verified
  byte-identical (checks 4–8).
- **`why_it_matters`**: left as-is. It already correctly states the
  work's lifecycle stage and that this is "a starting point for review,
  not a finding" — nothing in it names unsupported dimensions, so it did
  not have the defect this release targets.
- **Rule-primary rows (46,864), peer-primary rows (21,992), data-quality
  rows (4)**: reviewed and found to already use per-work, evidence-backed
  values (actual dates, amounts, peer medians/percentiles) rather than
  fixed templates — no comparable defect was found in these classes. See
  `reports/stage2_2_1_validation.md`, "Rows not modified in this release."
- **`peer_comparison_text` / `timeline_comparison_text` blanks (44,459 /
  39,733 rows)**: audited and confirmed to be legitimately blank — every
  blank corresponds to a metric with no valid ≥20-work peer group or no
  completion date, never a bug where available evidence went unused
  (checked programmatically: 0 rows have a peer group but a blank peer
  text, and 0 rows have a duration figure but a blank timeline text).

## Validation summary

`validate_stage2_2_1.py`: **26/26 checks pass**, including a byte-level
determinism check (two independent reruns of
`build_ml_dimension_explanations.py` produce identical SHA-256 hashes).

Final file: `decision_intelligence.csv`,
sha256 = `405407005450bc864864b2583bc16196a9b72230501e8aa19e8298bc7d3c39cd`
