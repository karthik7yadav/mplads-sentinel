# Stage 2.1.1 -- MPLADS Sentinel: Risk & Intelligence Engine (Corrected)

## Purpose

Stage 2 builds the core intelligence layer for MPLADS Sentinel: it takes
the canonical, reconciled Stage 1.6 dataset (72,675 Work IDs) and, for
every work, answers two of the project's four guiding questions:

1. **WHAT is unusual** about this work?
2. **WHY** is it unusual (in terms traceable to real data)?

It does **not** attempt to answer "does the context suggest a legitimate
explanation" or "what should the official do" beyond a first-pass
suggested verification step -- those are strengthened by later stages
(weather/context, GIS, satellite/evidence, computer vision, citizen
feedback, and the final dashboard/workflow layer).

**This is a REVIEW-PRIORITY engine, not a fraud detector.** There is no
reliable labelled fraud/non-fraud ground truth for MPLADS works, so no
supervised classifier, fraud probability, or fabricated label was built
anywhere in this pipeline. Every score in `risk_scores.csv` is a
`risk_band` / `overall_risk` **review priority**, meant to help a human
official decide what to look at first -- not a determination of
wrongdoing.

## Architecture

```
canonical Stage 1.6 CSVs
        |
        v
feature_engineering.py  ---> risk_features.csv  (Parts 1-2: features + temporal-safety mode tagging)
        |
        v
peer_benchmark.py        (Part 3: percentile / robust-z vs. peer works)
        |
        v
anomaly_detection.py      (Part 4: global statistical anomalies)
        |                 (Part 6: per-stage Isolation Forest models)
        v
rules.py                 ---> risk_signals.csv   (Part 5: 15 deterministic compliance rules)
        |
        v
risk_scoring.py           ---> risk_scores.csv    (Part 7: 5-component weighted 0-100 score)
        |
        v
explainability.py         ---> risk_explanations.csv (Parts 8-9: reasons + recommended action)
        |
        v
top_anomalies.py          ---> top_anomalies.csv  (Part 10)
        |
        v
reports.py / validation.py ---> reports/*.md       (Parts 11-13)
```

`build_risk_engine.py` runs the whole chain in this order and writes every
file listed in the Stage 2 spec's expected output tree.

## Inputs

Only the canonical Stage 1.6 files are used as the authoritative source:
`canonical_work_master.csv`, `canonical_recommended.csv`,
`canonical_sanctioned.csv`, `canonical_expenditure_events.csv`,
`canonical_expenditure_summary.csv`, `canonical_completed.csv`,
`canonical_allocation.csv`, `canonical_provenance.csv`, plus the Stage 1.6
validation/conflicts reports for cross-checking. Stage 1 and Stage 1.5
outputs were **not** touched, reconciled, or rebuilt.

## Feature engineering (Parts 1-2)

`risk_features.csv` has exactly one row per canonical Work ID (72,675
rows, verified unique). Feature groups: lifecycle (presence flags, dates,
durations -- negative durations are never silently produced, they're
flagged instead), financial (amounts, safe ratios, log1p transforms),
payment (from event-level `canonical_expenditure_events.csv`, never
deduplicated), data-quality (missingness, source-level conflicts,
allocation availability, unknown parliamentary terms), and lifecycle-state
signals (e.g. "sanctioned but no expenditure evidence").

**Temporal safety**: every work is tagged with a current `risk_mode`
(`PRE_SANCTION`, `IN_PROGRESS`, or `POST_COMPLETION`) based purely on
which records exist. `feature_engineering.FEATURE_AVAILABILITY_BY_MODE`
is the single source of truth for which columns each stage is allowed to
see; it's enforced in the Isolation Forest training/scoring, the rule
engine's per-signal stage eligibility (`rules.RULE_MODE_ELIGIBILITY`), and
the peer/statistical components used in `risk_scoring.py`. Validation
check #10 confirms no ML model ever used a column outside its stage's
whitelist.

## Peer benchmarking (Part 3)

Peer hierarchy, most specific first, with automatic fallback whenever a
group has fewer than 20 members with a non-null value for the metric in
question:

1. `work_category + state + constituency`
2. `work_category + state`
3. `work_category`
4. Global (all works)

Every peer-relative column records which level was actually used
(`<metric>_peer_level_used`), so a fallback is always visible, never
silent. Percentile rank, robust (MAD-based) z-score, and deviation from
peer median are computed per metric: recommended amount, sanction amount,
total expenditure, payment event count, sanction-to-completion duration,
recommendation-to-sanction duration, and the expenditure/sanction ratio.

## Statistical anomaly detection (Part 4)

Global (non-peer-conditioned) robust z-scores, percentile ranks, and IQR
fencing on scale-free ratios and counts (expenditure/sanction ratio,
expenditure/recommended ratio, completion/sanction ratio, vendor
concentration, key durations, unique vendor count). This complements peer
benchmarking rather than duplicating it -- these are measures where a
single overall distribution is already a defensible comparison.

**Known limitation:** several ratios (notably `expenditure_to_sanction_ratio`)
are heavily spike-shaped -- most works sit at or very near 1.0 -- which
makes the median absolute deviation extremely small. Robust z-scores on
such distributions are clipped to +/-50 (`utils.robust_z_scores`) to avoid
reporting cosmetically absurd values (e.g. z=450) while preserving
correct ranking and severity behavior.

## Deterministic rules (Part 5)

Fifteen configurable rules (`RULE-001` through `RULE-015`, defined and
documented in `src/risk/rules.py` and `config.RULE_THRESHOLDS`), covering
lifecycle delays, data-consistency checks, financial overruns, peer- and
statistically-anomalous durations/amounts/payment patterns, vendor
concentration, and conflicting expenditure records. Every signal in
`risk_signals.csv` carries its own `threshold`, `severity`, `explanation`,
and `source_fields` -- these are **review triggers, not proof of
wrongdoing**. `RULE-003` (expenditure without a sanction record) is kept
at LOW severity by design: it reflects a known, common structural gap
between the Stage 1/1.5 source populations (roughly 30% of works), not an
unusual event.

Each rule is tagged with which lifecycle stage(s) it may count toward
(`RULE_MODE_ELIGIBILITY`), so a rule that depends on completion data (e.g.
`RULE-004`) can never contribute to a work's `pre_sanction_risk`, even
retrospectively.

## Isolation Forest (Part 6)

Three separate models (fixed `random_state=42`), stored together in
`models/isolation_forest.pkl` as `{mode: {"model": ..., "columns": ...}}`:

- **PRE_SANCTION**: trained only on the 913 works currently in
  PRE_SANCTION, using recommendation-stage-safe features.
- **IN_PROGRESS**: trained only on the 37,892 works currently in
  IN_PROGRESS, using recommendation + sanction + in-progress expenditure
  features.
- **POST_COMPLETION**: trained only on completed works (33,870 works),
  using the full feature set including completion data.

Preprocessing: booleans -> 0/1; numeric NaNs are median-imputed with a
companion `<col>__was_missing` indicator (never silently zero-filled);
skewed monetary features use their log1p transforms as inputs. Anomaly
scores are `-decision_function()` (so higher = more anomalous), scaled to
0-100 independently per stage via 1st/99th-percentile-clipped min-max
scaling (`utils.min_max_scale_0_100`). `models/model_metadata.json`
records the feature list, preprocessing, random seed, contamination
(0.05, an assumed review-priority proportion -- **not** a fraud-rate
estimate), training row count, excluded-row count/reason, and the
`scikit-learn` version used.

Isolation Forest never sees the final risk score, rule-generated signals,
or any other stage's future-only fields (validation checks #9-10).

## Risk scoring (Part 7)

For each of the three stages, `risk_scoring.py` computes five 0-100
components and combines them with stage-specific configurable weights
(`config.RISK_COMPONENT_WEIGHTS`):

| Component | What it measures |
|---|---|
| `rule_risk_component` | Severity-weighted, saturating sum of eligible rule signals |
| `statistical_anomaly_component` | Share of global statistical-anomaly checks that fired |
| `ml_anomaly_component` | Scaled Isolation Forest anomaly score for that stage |
| `peer_anomaly_component` | Max, across relevant peer metrics, of percentile/robust-z-based anomaly score |
| `data_quality_component` | Weighted share of data-quality flags present (missingness, unresolved sources, conflicts, unknown terms) |

**Data-quality issues can never dominate the score on their own**: the
`data_quality_component`'s contribution to the final 0-100 score is hard-
capped at `DATA_QUALITY_COMPONENT_CAP` (30 points), regardless of its
configured weight (validation check #17).

`pre_sanction_risk`, `in_progress_risk`, and `post_completion_risk` are
each computed only for works that have actually reached that stage
(otherwise `NaN` -- never a fabricated value). `overall_risk` and
`risk_band` mirror the stage matching the work's current `risk_mode`.
Bands: 0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL (continuous
score, half-open band boundaries so no value falls in a gap).

## Explainability (Part 8)

`risk_explanations.csv` gives every work its top 3 signals (highest
severity first, ties broken by rule order), a natural-language
explanation built directly from those signals' own `explanation` text
(never a generic template), and the union of `source_fields` behind them
as `evidence_fields`. Works with zero eligible signals get an explicit
"no signals detected" explanation rather than an invented reason.

## Recommended action (Part 9)

Each signal's `signal_type` maps to a suggested **human** verification
step (verify documentation, inspect physically, compare with peers,
request additional records, etc. -- see `explainability.ACTION_BY_SIGNAL_TYPE`).
These are suggestions for officials, never automatic or punitive
determinations.

## Top anomalies (Part 10)

`top_anomalies.csv` lists the 100 highest-`overall_risk` works with
state/constituency/category context, their major signal IDs, and their
explanation/recommended action, for fast triage.

## Limitations (do not silently "fix" these -- see canonical Stage 1.6 reports)

- ~30% of canonical works have expenditure evidence but no sanction
  record on file, and a similar share of completed works have no
  expenditure evidence -- a known gap between the Stage 1/1.5 source
  populations, not evidence of wrongdoing on its own (RULE-003/004 reflect
  this but are severity-calibrated accordingly).
- Parliamentary term is unknown for the large majority of works
  (`term_unknown_indicator`); this pipeline never infers a term.
- `canonical_allocation.csv` is MP/constituency-level context only and is
  **never** treated as a work-level budget anywhere in this pipeline
  (only the boolean `allocation_available` is used).
- Unresolved source records and expenditure conflicts from Stage 1.6 are
  preserved as-is (surfaced via `unresolved_source_indicator`,
  `expenditure_conflict_indicator`, and RULE-013), not resolved or
  dropped.
- Robust z-scores on spike-shaped ratio distributions are clipped at
  +/-50 for reporting sanity (see Part 4 above).
- Peer groups fall back toward a broader group (and ultimately global)
  whenever fewer than 20 comparable works exist; this is always visible
  via `<metric>_peer_level_used`, never silent.

## Reproducibility

- Fixed random seed (42) everywhere randomness is possible (Isolation
  Forest only -- every other component is deterministic arithmetic).
- The "reference date" used for elapsed-time features is derived from the
  canonical data's own latest observed date, not wall-clock time, so
  re-running the pipeline against the same input always produces the same
  output.
- All thresholds and weights live in `src/risk/config.py`.
- Re-run the full pipeline with: `python3 build_risk_engine.py`
  (takes roughly 30 seconds end-to-end on the full 72,675-work dataset).

## Validation

See `reports/risk_engine_validation.md` for the full 17-point checklist
(row-count integrity, score bounds, no division-by-zero, no negative
financial values, explicit missing-data handling, ML reproducibility, no
target/temporal leakage, signal/explanation traceability, conflict
preservation, allocation/term-inference guards, no fraud-probability
language, and the data-quality cap). All 17 checks pass as of the last
build.


## Stage 2.1 -- Independent Audit & Hardening

Stage 2 was independently audited against the actual implementation and regenerated from the frozen Stage 1.6 canonical dataset. The hardening pass made only targeted corrections; Stage 1.6 data and Work IDs were not rebuilt or reconciled.

### Corrections made

1. **Temporal leakage in lifecycle models**: PRE_SANCTION and IN_PROGRESS Isolation Forests are now trained only on the current lifecycle population, preventing eventual sanction/completion outcomes from shaping earlier-stage training distributions.
2. **Stage-specific data-quality features**: provenance conflicts/duplicates and parliamentary-term unknownness are now scoped to the data sources available by each lifecycle stage. Later expenditure/completion conflicts cannot influence earlier-stage scores.
3. **Stage-specific statistical anomaly components**: completion-only statistical anomalies cannot contribute to IN_PROGRESS risk.
4. **Stage-specific RULE-014/RULE-015**: peer/global robust-z signals are restricted to metrics available in the current lifecycle stage.
5. **RULE-004 calibration**: completed-without-expenditure is retained as a verification/data-availability signal at LOW severity because Stage 1.6 established that this is a common source-population gap, not by itself evidence of wrongdoing.
6. **Portable paths**: hard-coded `/home/claude/...` paths were removed. The build now accepts `--canonical-dir` and `--output-dir`, with project-relative defaults and environment-variable overrides.
7. **Validation strengthened**: temporal validation now checks actual current-stage training population sizes and stage-specific statistical components, and a new rule-signal temporal-safety check was added.

### Hardened build

- Canonical works: **72,675**
- Risk features: **72,675 rows × 122 columns**
- Risk signals: **103,448**
- Risk scores: **72,675**
- Lifecycle modes: PRE_SANCTION **913**, IN_PROGRESS **37,892**, POST_COMPLETION **33,870**
- Risk bands: LOW **31,932**, MEDIUM **26,020**, HIGH **12,882**, CRITICAL **1,841**
- Validation: **18/18 PASS**
- Independent reproducibility rerun: **all CSV/report hashes matched; model pickle matched**

Run with:

`python3 build_risk_engine.py --canonical-dir <PATH_TO_STAGE1_6_CANONICAL> --output-dir <OUTPUT_DIR>`

This artifact remains a **review-priority / decision-support system**, not a fraud classifier or automatic enforcement system.


## Stage 2.1.1 corrections

This package contains the Stage 2.1.1 targeted corrections. Peer hierarchy
eligibility is evaluated on the remaining unassigned comparison population,
and the GLOBAL fallback is subject to the same minimum peer-group size of 20.
If no trusted peer group remains, the metric is left unbenchmarked. Missing
metric values never receive a peer assignment.

Risk explanations now expose the positive weighted contributions of the five
score components (rules, statistical anomalies, ML anomaly, peer anomaly, and
data-quality uncertainty) in addition to the top rule signals. This makes
component-driven score differences visible without turning model unusualness
into a fraud determination.

See `reports/stage2_1_1_correction_report.md` for the correction scope and
real-canonical validation results.
