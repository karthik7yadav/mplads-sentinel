"""
Stage 2.2.1 -- ML-primary explanation enhancement.

Gap being fixed (found during review of Stage 2.2):
  All 3,815 rows where `primary_risk_component` == ML anomaly model used
  exactly ONE of two template sentences (varying only by lifecycle_mode),
  always listing the same four dimensions ("financial amounts, durations,
  payment patterns, and data completeness") regardless of which of those
  dimensions actually had anything unusual in the individual work's own
  data. This does not satisfy the task-spec requirement (Section C,
  "PRIMARY REASON LOGIC"):

      "identify only the dimensions that are actually supported by the
       available feature data. Do NOT fabricate a specific cause."

This script recomputes, per ML-primary work, which of
{financial, duration/timeline, payment-pattern} dimensions have at least
one measurement that crosses Stage 2.1.1's OWN, already-defined outlier
thresholds (HIGH_PERCENTILE_THRESHOLD / (1-HIGH_PERCENTILE_THRESHOLD) =
0.95 / 0.05 for peer-relative percentiles, ROBUST_Z_ANOMALY_THRESHOLD =
3.5 for robust z-scores, and the pre-computed `*_statistical_anomaly`
boolean flags Stage 2.1.1 itself produces for global/portfolio-wide
checks). No new thresholds are invented; these are the exact constants
already defined in stage2_1_1_output/src/risk/config.py.

Data-quality/completeness evidence for these rows continues to be carried
in the existing, separate `data_quality_note` field (already populated by
Stage 2.2) rather than being duplicated here, to avoid two fields telling
the same story in different words.

The Isolation Forest itself is NOT re-run, retrained, or reweighted.
overall_risk / risk_band / lifecycle_mode / component contributions are
untouched. Only text in primary_reason_summary, why_it_matters,
recommended_verification, and recommended_action_steps is regenerated,
and ONLY for rows where primary_risk_component is the ML anomaly model.
"""
import pandas as pd
import numpy as np

# ---------------------------------------------------------------------
# Thresholds -- copied verbatim from stage2_1_1_output/src/risk/config.py
# (HIGH_PERCENTILE_THRESHOLD, ROBUST_Z_ANOMALY_THRESHOLD). Not new values.
# ---------------------------------------------------------------------
HIGH_PCT = 0.95
LOW_PCT = 1.0 - HIGH_PCT          # 0.05, symmetric
ROBUST_Z_THRESH = 3.5

FINANCIAL_PEER = [
    ("recommended_amount_percentile_in_peer_group", "recommended amount"),
    ("sanction_amount_percentile_in_peer_group", "sanctioned amount"),
    ("expenditure_percentile_in_peer_group", "total expenditure"),
    ("exp_sanction_ratio_percentile_in_peer_group", "expenditure-to-sanction ratio"),
]
FINANCIAL_GLOBAL = [
    ("expenditure_to_sanction_ratio_statistical_anomaly",
     "expenditure_to_sanction_ratio_percentile", "expenditure-to-sanction ratio"),
    ("expenditure_to_recommended_ratio_statistical_anomaly",
     "expenditure_to_recommended_ratio_percentile", "expenditure-to-recommended ratio"),
]
DURATION_PEER = [
    ("duration_percentile_in_peer_group", "implementation duration (sanction to completion)"),
    ("rec_sanction_duration_percentile_in_peer_group", "time from recommendation to sanction"),
]
DURATION_GLOBAL = [
    ("days_recommendation_to_sanction_statistical_anomaly",
     "days_recommendation_to_sanction_percentile", "time from recommendation to sanction"),
    ("days_sanction_to_completion_statistical_anomaly",
     "days_sanction_to_completion_percentile", "implementation duration"),
    ("completion_to_sanction_ratio_statistical_anomaly",
     "completion_to_sanction_ratio_percentile", "completion-amount-to-sanction ratio"),
]
PAYMENT_PEER = [
    ("payment_event_percentile_in_peer_group", "number of payment events"),
]
PAYMENT_GLOBAL = [
    ("unique_vendor_count_statistical_anomaly", "unique_vendor_count_percentile", "number of distinct vendors"),
    ("vendor_concentration_statistical_anomaly", "vendor_concentration_percentile", "vendor concentration"),
]


def _pct_extreme(row, col):
    v = row.get(col)
    if pd.isna(v):
        return None
    if v >= HIGH_PCT or v <= LOW_PCT:
        return v
    return None


def _flag(row, col):
    v = row.get(col)
    return bool(v) if pd.notna(v) else False


def evaluate_dimensions(row):
    """Returns dict of dimension -> list of human-readable evidence phrases,
    using ONLY values present in this row's own risk_features record."""
    ev = {"financial": [], "duration": [], "payment": []}

    for pcol, label in FINANCIAL_PEER:
        v = _pct_extreme(row, pcol)
        if v is not None:
            ev["financial"].append(f"{label} ({v*100:.1f}th percentile among comparable works)")
    for flagcol, pcol, label in FINANCIAL_GLOBAL:
        if _flag(row, flagcol):
            pv = row.get(pcol)
            suffix = f" ({pv*100:.1f}th percentile across the portfolio)" if pd.notna(pv) else " (portfolio-wide outlier)"
            ev["financial"].append(f"{label}{suffix}")

    for pcol, label in DURATION_PEER:
        v = _pct_extreme(row, pcol)
        if v is not None:
            ev["duration"].append(f"{label} ({v*100:.1f}th percentile among comparable works)")
    for flagcol, pcol, label in DURATION_GLOBAL:
        if _flag(row, flagcol):
            pv = row.get(pcol)
            suffix = f" ({pv*100:.1f}th percentile across the portfolio)" if pd.notna(pv) else " (portfolio-wide outlier)"
            ev["duration"].append(f"{label}{suffix}")

    for pcol, label in PAYMENT_PEER:
        v = _pct_extreme(row, pcol)
        if v is not None:
            ev["payment"].append(f"{label} ({v*100:.1f}th percentile among comparable works)")
    for flagcol, pcol, label in PAYMENT_GLOBAL:
        if _flag(row, flagcol):
            pv = row.get(pcol)
            suffix = f" ({pv*100:.1f}th percentile across the portfolio)" if pd.notna(pv) else " (portfolio-wide outlier)"
            ev["payment"].append(f"{label}{suffix}")
    if _flag(row, "same_day_multi_payment_indicator"):
        ev["payment"].append("multiple payments recorded on the same day")

    return ev


def _join_items(items):
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return "; ".join(items[:-1]) + f"; and {items[-1]}"


def build_texts(row, dims):
    stage = "completed" if row["lifecycle_mode"] == "POST_COMPLETION" else "in-progress"
    flagged = []
    for key, name in [("financial", "financial"), ("duration", "timeline/duration"), ("payment", "payment-pattern")]:
        if dims[key]:
            flagged.append((name, dims[key]))

    if flagged:
        dim_names = _join_items([f"{name} ({_join_items(items)})" for name, items in flagged])
        summary = (
            "No single deterministic rule explains this work's review priority. An unsupervised "
            f"anomaly model ranks its overall combination of characteristics as atypical relative to "
            f"other {stage} works. Looking at this work's own individual measurements (not just the "
            f"combination), the following stood out on their own: {dim_names}. This is a holistic "
            "pattern signal: it does not point to one single field as 'the' cause, and 'unusual' does "
            "not mean 'improper'."
        )
        verify_dims = ", ".join(name for name, _ in flagged)
        verification = (
            f"1. Review this work's {verify_dims} figures against comparable works. | "
            "2. Review the full record for consistency across the underlying financial, payment, and lifecycle fields."
        )
        action_steps = verification
    else:
        summary = (
            "No single deterministic rule explains this work's review priority, and no individual "
            "measurement for this work (financial amounts, timeline/duration, or payment pattern) is "
            f"extreme enough on its own to cross the portfolio's outlier thresholds. An unsupervised "
            f"anomaly model nonetheless ranks the overall combination of this work's characteristics as "
            f"atypical relative to other {stage} works -- the signal reflects several moderately unusual "
            "values considered together, not any single flagged figure. This is a holistic pattern "
            "signal: it does not point to one specific field, and 'unusual' does not mean 'improper'."
        )
        verification = (
            "1. Review this work's full record against similar works at the same lifecycle stage. | "
            "2. Inspect the underlying financial, payment, and lifecycle records for anything that "
            "does not individually stand out but looks unusual in combination."
        )
        action_steps = verification

    why_it_matters = (
        f"This work is currently in progress (sanctioned, but not yet marked completed)." if stage == "in-progress"
        else "This work has been recorded as completed."
    ) + " The model ranks this work as atypical relative to others at the same lifecycle stage; it is a starting point for review, not a finding."

    return summary, why_it_matters, verification, action_steps


if __name__ == "__main__":
    feats = pd.read_csv("ml_features_subset.csv")
    di = pd.read_csv(
        "stage2_2_decision_intelligence/decision_intelligence.csv",
        usecols=["work_id", "lifecycle_mode", "primary_risk_component"],
    )
    merged = feats.merge(di, on="work_id", how="left")
    assert (merged["primary_risk_component"] == "ML anomaly model (atypical combination of characteristics)").all()

    out_rows = []
    n_flagged = 0
    for _, row in merged.iterrows():
        dims = evaluate_dimensions(row)
        if any(dims.values()):
            n_flagged += 1
        summary, why, verify, steps = build_texts(row, dims)
        out_rows.append({
            "work_id": row["work_id"],
            "primary_reason_summary": summary,
            "why_it_matters": why,
            "recommended_verification": verify,
            "recommended_action_steps": steps,
        })

    out_df = pd.DataFrame(out_rows)
    out_df.to_csv("ml_explanation_updates.csv", index=False)
    print(f"Rows with >=1 individually-supported dimension: {n_flagged} / {len(merged)}")
    print(f"Rows with combination-only signal (no single measurement crosses threshold): {len(merged) - n_flagged}")
    print(f"Unique primary_reason_summary values: {out_df['primary_reason_summary'].nunique()}")
