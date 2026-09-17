"""
Part 7 -- Risk Scoring

Produces risk_scores.csv: one row per canonical Work ID, with a
REVIEW-PRIORITY score (0-100) per lifecycle stage plus an overall score
matched to the work's current stage. NOT a fraud probability -- see
STAGE2_RISK_ENGINE_README.md.
"""

import numpy as np
import pandas as pd

from .config import RISK_COMPONENT_WEIGHTS, DATA_QUALITY_COMPONENT_CAP, RISK_BANDS
from .rules import compute_rule_component
from .utils import min_max_scale_0_100

# Peer metrics considered relevant to each lifecycle stage, for the
# peer_anomaly_component. Excluding a metric from a stage is a temporal-
# safety decision, same rationale as feature_engineering's availability
# lists (e.g. sanction/expenditure peer metrics never feed PRE_SANCTION).
PEER_METRICS_BY_STAGE = {
    "PRE_SANCTION": ["recommended_amount"],
    "IN_PROGRESS": ["recommended_amount", "sanction_amount", "expenditure", "payment_event",
                     "rec_sanction_duration", "exp_sanction_ratio"],
    "POST_COMPLETION": ["recommended_amount", "sanction_amount", "expenditure", "payment_event",
                         "rec_sanction_duration", "exp_sanction_ratio", "duration"],
}

# Data-quality signals considered for each stage's data_quality_component.
# Each entry is (column_name, weight).
DQ_SIGNALS_BY_STAGE = {
    "PRE_SANCTION": [
        ("recommendation_missing", 1.0),
        ("pre_unresolved_source_indicator", 2.0),
        ("pre_term_unknown_indicator", 1.0),
        ("pre_conflict_indicator", 3.0),
    ],
    "IN_PROGRESS": [
        ("sanction_missing", 1.0),
        ("expenditure_missing", 1.0),
        ("in_progress_unresolved_source_indicator", 2.0),
        ("in_progress_conflict_indicator", 3.0),
        ("in_progress_term_unknown_indicator", 1.0),
    ],
    "POST_COMPLETION": [
        ("completion_missing", 1.0),
        ("post_unresolved_source_indicator", 2.0),
        ("conflict_indicator", 3.0),
        ("post_term_unknown_indicator", 1.0),
    ],
}


def _peer_anomaly_component(df: pd.DataFrame, metrics: list[str]) -> pd.Series:
    """
    For each relevant peer metric, converts percentile (rescaled so 0.5 ->
    0 and 1.0 -> 100) and robust z (scaled so |z|=5 -> 100) into a 0-100
    per-metric anomaly score, then takes the MAX across metrics for each
    work -- being extreme on any single axis is what matters here, so
    averaging across many metrics would wash out a strong single-axis
    anomaly.
    """
    per_metric_scores = []
    for m in metrics:
        pct_col = f"{m}_percentile_in_peer_group"
        z_col = f"{m}_robust_z_in_peer_group"
        score = pd.Series(np.nan, index=df.index)
        if pct_col in df.columns:
            pct_score = ((df[pct_col] - 0.5) / 0.5 * 100.0).clip(lower=0)
            score = pct_score
        if z_col in df.columns:
            z_score = (df[z_col].abs() / 5.0 * 100.0).clip(upper=100.0)
            score = pd.concat([score, z_score], axis=1).max(axis=1, skipna=True)
        per_metric_scores.append(score)
    if not per_metric_scores:
        return pd.Series(0.0, index=df.index)
    combined = pd.concat(per_metric_scores, axis=1)
    result = combined.max(axis=1, skipna=True)
    return result.fillna(0.0)


def _data_quality_component(df: pd.DataFrame, stage: str) -> pd.Series:
    signals = DQ_SIGNALS_BY_STAGE[stage]
    max_possible = sum(w for _, w in signals)
    weighted = pd.Series(0.0, index=df.index)
    for col, weight in signals:
        if col in df.columns:
            weighted += df[col].fillna(False).astype(bool).astype(float) * weight
    return (weighted / max_possible * 100.0).clip(upper=100.0)


def _assign_risk_band(score: pd.Series) -> pd.Series:
    """
    RISK_BANDS gives integer-labelled ranges (0-24, 25-49, ...) for human
    readability, but scores are continuous floats -- so bands are applied
    as half-open intervals [lo, hi) except the final band, which is closed
    at 100, to avoid gaps like 24.5 matching nothing.
    """
    band = pd.Series(np.nan, index=score.index, dtype=object)
    n_bands = len(RISK_BANDS)
    for i, (lo, hi, label) in enumerate(RISK_BANDS):
        if i == n_bands - 1:
            mask = score.notna() & (score >= lo) & (score <= hi)
        else:
            mask = score.notna() & (score >= lo) & (score < hi + 1)
        band.loc[mask] = label
    return band


def compute_risk_scores(features: pd.DataFrame, signals: pd.DataFrame, ml_scores: pd.DataFrame) -> pd.DataFrame:
    df = features.join(ml_scores)
    work_ids = df.index

    stage_eligibility_mask = {
        "PRE_SANCTION": pd.Series(True, index=df.index),
        "IN_PROGRESS": df["sanction_present"] | df["expenditure_present"],
        "POST_COMPLETION": df["completion_present"],
    }

    out = pd.DataFrame(index=df.index)
    out["work_id"] = df["work_id"]

    for stage in ["PRE_SANCTION", "IN_PROGRESS", "POST_COMPLETION"]:
        eligible = stage_eligibility_mask[stage]

        rule_component = compute_rule_component(signals, df["work_id"], stage)
        rule_component.index = df.index  # aligned by work_id order already since features has 1 row/work_id

        stat_component = df[f"statistical_anomaly_component_{stage.lower()}"]
        # Stage-specific statistical components prevent completion-only
        # anomalies from contributing to IN_PROGRESS risk.

        ml_col = f"ml_anomaly_component_{stage.lower()}"
        ml_component = df[ml_col] if ml_col in df.columns else pd.Series(np.nan, index=df.index)

        peer_component = _peer_anomaly_component(df, PEER_METRICS_BY_STAGE[stage])

        dq_component = _data_quality_component(df, stage)

        weights = RISK_COMPONENT_WEIGHTS[stage]
        dq_contribution = (weights["data_quality_component"] * dq_component).clip(upper=DATA_QUALITY_COMPONENT_CAP)

        overall = (
            weights["rule_risk_component"] * rule_component.fillna(0.0)
            + weights["statistical_anomaly_component"] * stat_component.fillna(0.0)
            + weights["ml_anomaly_component"] * ml_component.fillna(0.0)
            + weights["peer_anomaly_component"] * peer_component.fillna(0.0)
            + dq_contribution
        )
        overall = overall.clip(lower=0, upper=100)
        overall = overall.where(eligible)  # NaN where the work hasn't reached this stage

        stage_lower = stage.lower()
        out[f"{stage_lower}_risk"] = overall
        out[f"rule_risk_component_{stage_lower}"] = rule_component.where(eligible)
        out[f"statistical_anomaly_component_{stage_lower}"] = stat_component.where(eligible)
        out[f"ml_anomaly_component_{stage_lower}"] = ml_component.where(eligible)
        out[f"peer_anomaly_component_{stage_lower}"] = peer_component.where(eligible)
        out[f"data_quality_component_{stage_lower}"] = dq_component.where(eligible)

    # overall_risk / band / components = whichever stage matches the
    # work's CURRENT lifecycle mode (its most advanced reached stage).
    mode = df["risk_mode"]
    out["risk_mode"] = mode
    out["overall_risk"] = np.select(
        [mode == "PRE_SANCTION", mode == "IN_PROGRESS", mode == "POST_COMPLETION"],
        [out["pre_sanction_risk"], out["in_progress_risk"], out["post_completion_risk"]],
        default=np.nan,
    )
    out["risk_band"] = _assign_risk_band(pd.Series(out["overall_risk"], index=out.index))

    for comp in ["rule_risk_component", "statistical_anomaly_component", "ml_anomaly_component",
                 "peer_anomaly_component", "data_quality_component"]:
        out[comp] = np.select(
            [mode == "PRE_SANCTION", mode == "IN_PROGRESS", mode == "POST_COMPLETION"],
            [out[f"{comp}_pre_sanction"], out[f"{comp}_in_progress"], out[f"{comp}_post_completion"]],
            default=np.nan,
        )

    return out
