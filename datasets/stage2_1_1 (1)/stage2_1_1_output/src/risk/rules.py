"""
Part 5 -- Deterministic Compliance / Rule Engine

Produces risk_signals.csv: one row per detected signal (a work can have
zero, one, or many signals). Every rule is a REVIEW TRIGGER, not proof of
wrongdoing -- severity communicates "how far past a documented threshold",
nothing more. Thresholds live in config.py so they are auditable and
adjustable without touching this logic.
"""

import numpy as np
import pandas as pd

from .config import RULE_THRESHOLDS

# Which lifecycle stage(s) a signal is safe to count toward, for temporal-
# safety purposes (Part 2). A signal that depends on sanction/expenditure
# data can never count toward a work's PRE_SANCTION-stage score, even if
# the work has since progressed further -- that would leak future
# information into an earlier stage's risk value. Rationale per rule:
#   - RULE-001 depends only on recommendation/sanction-absence -> safe
#     the moment a work is recommended, i.e. PRE_SANCTION eligible.
#   - RULE-002/003/007/008/009/011/012/013/014*/015 depend on sanction
#     and/or expenditure data -> IN_PROGRESS and POST_COMPLETION only.
#   - RULE-004/005/006/010 depend on completion data -> POST_COMPLETION only.
# (*RULE-014 can in principle be driven by a pre-sanction-safe peer metric,
#  but the pre-sanction stage already gets its own peer signal via
#  peer_anomaly_component, so RULE-014 itself is scoped to the later
#  stages to keep eligibility simple and conservative.)
RULE_MODE_ELIGIBILITY = {
    "RULE-001": {"PRE_SANCTION", "IN_PROGRESS", "POST_COMPLETION"},
    "RULE-002": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-003": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-004": {"POST_COMPLETION"},
    "RULE-005": {"POST_COMPLETION"},
    "RULE-006": {"POST_COMPLETION"},
    "RULE-007": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-008": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-009": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-010": {"POST_COMPLETION"},
    "RULE-011": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-012": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-013": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-014": {"IN_PROGRESS", "POST_COMPLETION"},
    "RULE-015": {"IN_PROGRESS", "POST_COMPLETION"},
}

SEVERITY_WEIGHT = {"LOW": 1.0, "MEDIUM": 2.0, "HIGH": 4.0, "CRITICAL": 7.0}
# A weighted-severity sum at or above this value saturates the rule
# component at 100. Configurable, documented here alongside the weights.
RULE_COMPONENT_SATURATION_POINT = 10.0

RULE_DEFINITIONS = {
    "RULE-001": "Recommended but not sanctioned after an unusually long interval.",
    "RULE-002": "Sanctioned but no expenditure evidence on file after an unusually long interval.",
    "RULE-003": "Expenditure evidence exists without a sanction record on file.",
    "RULE-004": "Completed but no expenditure evidence on file.",
    "RULE-005": "Completion date recorded before sanction date.",
    "RULE-006": "Completion date recorded before recommendation date.",
    "RULE-007": "Total expenditure exceeds the sanctioned amount.",
    "RULE-008": "Expenditure-to-sanction ratio is unusually high relative to comparable works.",
    "RULE-009": "Recommendation-to-sanction duration is unusually long relative to comparable works.",
    "RULE-010": "Sanction-to-completion duration is unusually long relative to comparable works.",
    "RULE-011": "Number of payment events is unusually high relative to comparable works.",
    "RULE-012": "A single vendor accounts for an unusually high share of total disbursed expenditure.",
    "RULE-013": "Conflicting expenditure records exist for this work (same work/date/vendor, differing status or amount).",
    "RULE-014": "Strong peer-relative financial anomaly (robust z-score far from comparable works).",
    "RULE-015": "Strong general statistical anomaly (robust z-score far from the overall distribution).",
}


def _severity_from_ratio(ratio: pd.Series, thresholds=(1.0, 1.5, 2.0)) -> pd.Series:
    sev = pd.Series("LOW", index=ratio.index)
    sev = sev.where(ratio < thresholds[0], "MEDIUM")
    sev = sev.where(ratio < thresholds[1], "HIGH")
    sev = sev.where(ratio < thresholds[2], "CRITICAL")
    return sev


def _severity_from_multiple_of_threshold(value: pd.Series, threshold: float) -> pd.Series:
    ratio = value / threshold
    sev = pd.Series("MEDIUM", index=value.index)
    sev = sev.where(ratio < 1.5, "HIGH")
    sev = sev.where(ratio < 2.0, "CRITICAL")
    return sev


def _severity_from_abs_z(z: pd.Series, threshold: float) -> pd.Series:
    az = z.abs()
    sev = pd.Series("MEDIUM", index=z.index)
    sev = sev.where(az < threshold * 1.3, "HIGH")
    sev = sev.where(az < threshold * 1.8, "CRITICAL")
    return sev


def _build_rows(df, mask, signal_id, signal_type, severity, value_col, threshold, explanation_fn, source_fields):
    idx = df.index[mask.fillna(False)]
    if len(idx) == 0:
        return None
    sub = df.loc[idx]
    rows = pd.DataFrame({
        "work_id": sub["work_id"].values,
        "risk_mode": sub["risk_mode"].values,
        "signal_id": signal_id,
        "signal_type": signal_type,
        "severity": severity.loc[idx].values if isinstance(severity, pd.Series) else severity,
        "signal_value": sub[value_col].values if value_col else np.nan,
        "threshold": threshold,
        "explanation": explanation_fn(sub) if callable(explanation_fn) else explanation_fn,
        "source_fields": source_fields,
    })
    return rows


def compute_rule_signals(features: pd.DataFrame) -> pd.DataFrame:
    df = features
    T = RULE_THRESHOLDS
    all_rows = []

    # RULE-001
    mask = df["recommended_not_sanctioned"] & (df["days_since_recommendation"] > T["RULE_001_days_since_recommendation_no_sanction"])
    sev = _severity_from_multiple_of_threshold(df["days_since_recommendation"], T["RULE_001_days_since_recommendation_no_sanction"])
    rows = _build_rows(
        df, mask, "RULE-001", "lifecycle_delay", sev, "days_since_recommendation",
        T["RULE_001_days_since_recommendation_no_sanction"],
        lambda s: ("Recommended " + s["days_since_recommendation"].round(0).astype(int).astype(str)
                   + " days ago with no sanction on file (threshold "
                   + str(T["RULE_001_days_since_recommendation_no_sanction"]) + " days)."),
        "recommendation_date,recommendation_present,sanction_present",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-002
    mask = df["sanctioned_not_expenditure"] & (df["days_since_sanction"] > T["RULE_002_days_since_sanction_no_expenditure"])
    sev = _severity_from_multiple_of_threshold(df["days_since_sanction"], T["RULE_002_days_since_sanction_no_expenditure"])
    rows = _build_rows(
        df, mask, "RULE-002", "lifecycle_delay", sev, "days_since_sanction",
        T["RULE_002_days_since_sanction_no_expenditure"],
        lambda s: ("Sanctioned " + s["days_since_sanction"].round(0).astype(int).astype(str)
                   + " days ago with no expenditure evidence on file (threshold "
                   + str(T["RULE_002_days_since_sanction_no_expenditure"]) + " days)."),
        "sanction_date,sanction_present,expenditure_present",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-003 (structural/common -- see canonical Stage 1.6 limitations; kept LOW severity)
    mask = df["expenditure_present"] & ~df["sanction_present"]
    rows = _build_rows(
        df, mask, "RULE-003", "data_consistency", "LOW", None, np.nan,
        "Expenditure records exist for this Work ID but no sanction record is present in the canonical data "
        "(a known structural gap between the Stage 1/1.5 source populations -- see canonical Stage 1.6 limitations).",
        "expenditure_present,sanction_present",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-004: common source-population gap; treat as a verification/data-
    # availability signal rather than a high-severity anomaly.
    mask = df["completed_without_expenditure_evidence"]
    rows = _build_rows(
        df, mask, "RULE-004", "data_consistency", "LOW", None, np.nan,
        "Work is marked completed but no expenditure evidence is present in the canonical data.",
        "completion_present,expenditure_present",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-005
    mask = df["negative_duration_sanction_to_completion"]
    rows = _build_rows(
        df, mask, "RULE-005", "data_consistency", "CRITICAL", None, np.nan,
        "Recorded completion date is earlier than the recorded sanction date.",
        "sanction_date,completion_date",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-006
    mask = df["negative_duration_recommendation_to_completion"]
    rows = _build_rows(
        df, mask, "RULE-006", "data_consistency", "CRITICAL", None, np.nan,
        "Recorded completion date is earlier than the recorded recommendation date.",
        "recommendation_date,completion_date",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-007
    ratio_thr = T["RULE_007_expenditure_over_sanction_ratio"]
    mask = df["expenditure_to_sanction_ratio"] > ratio_thr
    sev = _severity_from_ratio(df["expenditure_to_sanction_ratio"])
    rows = _build_rows(
        df, mask, "RULE-007", "financial", sev, "expenditure_to_sanction_ratio", ratio_thr,
        lambda s: ("Total expenditure is " + (s["expenditure_to_sanction_ratio"] * 100).round(1).astype(str)
                   + "% of the sanctioned amount."),
        "total_expenditure,sanction_amount",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-008 (peer-relative expenditure/sanction ratio)
    if "exp_sanction_ratio_percentile_in_peer_group" in df.columns:
        pctl_thr = T["RULE_008_peer_percentile_threshold"]
        mask = df["exp_sanction_ratio_percentile_in_peer_group"] >= pctl_thr
        rows = _build_rows(
            df, mask, "RULE-008", "peer_financial", "HIGH", "exp_sanction_ratio_percentile_in_peer_group", pctl_thr,
            lambda s: ("Expenditure-to-sanction ratio is at the " + (s["exp_sanction_ratio_percentile_in_peer_group"] * 100).round(1).astype(str)
                       + "th percentile among comparable works ("
                       + s["exp_sanction_ratio_peer_level_used"].astype(str) + ")."),
            "expenditure_to_sanction_ratio,work_category,state,constituency",
        )
        if rows is not None:
            all_rows.append(rows)

    # RULE-009 (peer-relative recommendation-to-sanction duration)
    if "rec_sanction_duration_percentile_in_peer_group" in df.columns:
        pctl_thr = T["RULE_009_010_duration_percentile_threshold"]
        mask = df["rec_sanction_duration_percentile_in_peer_group"] >= pctl_thr
        rows = _build_rows(
            df, mask, "RULE-009", "peer_duration", "MEDIUM", "rec_sanction_duration_percentile_in_peer_group", pctl_thr,
            lambda s: ("Recommendation-to-sanction duration is at the " + (s["rec_sanction_duration_percentile_in_peer_group"] * 100).round(1).astype(str)
                       + "th percentile among comparable works ("
                       + s["rec_sanction_duration_peer_level_used"].astype(str) + ")."),
            "days_recommendation_to_sanction,work_category,state,constituency",
        )
        if rows is not None:
            all_rows.append(rows)

    # RULE-010 (peer-relative sanction-to-completion duration)
    if "duration_percentile_in_peer_group" in df.columns:
        pctl_thr = T["RULE_009_010_duration_percentile_threshold"]
        mask = df["duration_percentile_in_peer_group"] >= pctl_thr
        rows = _build_rows(
            df, mask, "RULE-010", "peer_duration", "MEDIUM", "duration_percentile_in_peer_group", pctl_thr,
            lambda s: ("Sanction-to-completion duration is at the " + (s["duration_percentile_in_peer_group"] * 100).round(1).astype(str)
                       + "th percentile among comparable works ("
                       + s["duration_peer_level_used"].astype(str) + ")."),
            "days_sanction_to_completion,work_category,state,constituency",
        )
        if rows is not None:
            all_rows.append(rows)

    # RULE-011 (peer-relative payment event count)
    if "payment_event_percentile_in_peer_group" in df.columns:
        pctl_thr = T["RULE_011_payment_count_percentile_threshold"]
        mask = df["payment_event_percentile_in_peer_group"] >= pctl_thr
        rows = _build_rows(
            df, mask, "RULE-011", "peer_payment", "MEDIUM", "payment_event_percentile_in_peer_group", pctl_thr,
            lambda s: ("Payment event count is at the " + (s["payment_event_percentile_in_peer_group"] * 100).round(1).astype(str)
                       + "th percentile among comparable works ("
                       + s["payment_event_peer_level_used"].astype(str) + ")."),
            "payment_event_count,work_category,state,constituency",
        )
        if rows is not None:
            all_rows.append(rows)

    # RULE-012 (vendor concentration)
    conc_thr = T["RULE_012_vendor_concentration_threshold"]
    mask = (df["vendor_concentration"] >= conc_thr) & (df["payment_event_count"] >= 2)
    rows = _build_rows(
        df, mask, "RULE-012", "vendor", "MEDIUM", "vendor_concentration", conc_thr,
        lambda s: ("A single vendor accounts for " + (s["vendor_concentration"] * 100).round(1).astype(str)
                   + "% of total disbursed expenditure across " + s["payment_event_count"].astype(str) + " payment events."),
        "vendor_concentration,payment_event_count",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-013
    mask = df["expenditure_conflict_indicator"]
    rows = _build_rows(
        df, mask, "RULE-013", "data_consistency", "MEDIUM", None, np.nan,
        "One or more expenditure events for this Work ID have conflicting status/amount across source records "
        "(same work, date, and vendor; retained for human review, not auto-resolved).",
        "expenditure_conflict_indicator",
    )
    if rows is not None:
        all_rows.append(rows)

    # RULE-014 (strong peer-relative financial anomaly -- any of the peer robust-z columns)
    # Only use peer metrics available by the current lifecycle mode.
    peer_metric_cols_by_mode = {
        "PRE_SANCTION": ["recommended_amount_robust_z_in_peer_group"],
        "IN_PROGRESS": [
            "recommended_amount_robust_z_in_peer_group", "sanction_amount_robust_z_in_peer_group",
            "expenditure_robust_z_in_peer_group", "payment_event_robust_z_in_peer_group",
            "rec_sanction_duration_robust_z_in_peer_group", "exp_sanction_ratio_robust_z_in_peer_group",
        ],
        "POST_COMPLETION": [
            "recommended_amount_robust_z_in_peer_group", "sanction_amount_robust_z_in_peer_group",
            "expenditure_robust_z_in_peer_group", "payment_event_robust_z_in_peer_group",
            "rec_sanction_duration_robust_z_in_peer_group", "exp_sanction_ratio_robust_z_in_peer_group",
            "duration_robust_z_in_peer_group",
        ],
    }
    peer_z_cols = [c for c in peer_metric_cols_by_mode["POST_COMPLETION"] if c in df.columns]
    z_thr = T["RULE_014_peer_robust_z_threshold"]
    if peer_z_cols:
        abs_z_df = df[peer_z_cols].abs()
        peer_z_abs_max = abs_z_df.max(axis=1)
        driving_col = abs_z_df.fillna(-1).idxmax(axis=1)
        tmp = df.copy()
        tmp["_peer_z_abs_max"] = peer_z_abs_max
        tmp["_driving_col"] = driving_col
        sev = _severity_from_abs_z(peer_z_abs_max, z_thr)
        for mode, mode_cols in peer_metric_cols_by_mode.items():
            if mode == "PRE_SANCTION":
                continue
            mode_mask = (df["risk_mode"] == mode) & df[[c for c in mode_cols if c in df.columns]].abs().max(axis=1).ge(z_thr)
            rows = _build_rows(
                tmp, mode_mask, "RULE-014", "peer_financial", sev, "_peer_z_abs_max", z_thr,
                lambda s: ("Strong peer-relative anomaly on " + s["_driving_col"].str.replace("_robust_z_in_peer_group", "", regex=False)
                           + " (robust z = " + s["_peer_z_abs_max"].round(2).astype(str) + ")."),
                "recommended_amount,sanction_amount,total_expenditure,work_category,state,constituency",
            )
            if rows is not None:
                all_rows.append(rows)

    # RULE-015 (strong general statistical anomaly -- global robust z, non-peer)
    z_cols_by_mode = {
        "PRE_SANCTION": [],
        "IN_PROGRESS": [
            "expenditure_to_sanction_ratio_robust_z", "expenditure_to_recommended_ratio_robust_z",
            "vendor_concentration_robust_z", "days_recommendation_to_sanction_robust_z",
            "unique_vendor_count_robust_z",
        ],
        "POST_COMPLETION": [
            "expenditure_to_sanction_ratio_robust_z", "expenditure_to_recommended_ratio_robust_z",
            "completion_to_sanction_ratio_robust_z", "vendor_concentration_robust_z",
            "days_recommendation_to_sanction_robust_z", "days_sanction_to_completion_robust_z",
            "unique_vendor_count_robust_z",
        ],
    }
    z_thr2 = T["RULE_015_statistical_robust_z_threshold"]
    for mode, mode_cols in z_cols_by_mode.items():
        cols = [c for c in mode_cols if c in df.columns]
        if not cols:
            continue
        abs_z_df2 = df[cols].abs()
        global_z_abs_max = abs_z_df2.max(axis=1)
        driving_col2 = abs_z_df2.fillna(-1).idxmax(axis=1)
        mask = (df["risk_mode"] == mode) & (global_z_abs_max >= z_thr2)
        tmp = df.copy()
        tmp["_global_z_abs_max"] = global_z_abs_max
        tmp["_driving_col2"] = driving_col2
        sev = _severity_from_abs_z(global_z_abs_max, z_thr2)
        rows = _build_rows(
            tmp, mask, "RULE-015", "statistical", sev, "_global_z_abs_max", z_thr2,
            lambda s: ("Strong overall statistical anomaly on " + s["_driving_col2"].str.replace("_robust_z", "", regex=False)
                       + " (robust z = " + s["_global_z_abs_max"].round(2).astype(str) + ")."),
            ",".join(c.replace("_robust_z", "") for c in cols),
        )
        if rows is not None:
            all_rows.append(rows)

    if not all_rows:
        return pd.DataFrame(columns=[
            "work_id", "risk_mode", "signal_id", "signal_type", "severity",
            "signal_value", "threshold", "explanation", "source_fields",
        ])

    signals = pd.concat(all_rows, ignore_index=True)
    return signals


def compute_rule_component(signals: pd.DataFrame, work_ids: pd.Index, stage: str) -> pd.Series:
    """
    Severity-weighted, saturating 0-100 rule-risk component for one
    lifecycle stage, using only signals eligible for that stage (Part 2
    temporal safety). Works with zero eligible signals score 0, not NaN --
    "no rule fired" is a real, known state, not missing information.
    """
    eligible_ids = {rid for rid, modes in RULE_MODE_ELIGIBILITY.items() if stage in modes}
    if signals.empty:
        return pd.Series(0.0, index=work_ids)
    sub = signals[signals["signal_id"].isin(eligible_ids)].copy()
    sub["weight"] = sub["severity"].map(SEVERITY_WEIGHT).fillna(1.0)
    weighted_sum = sub.groupby("work_id")["weight"].sum()
    weighted_sum = weighted_sum.reindex(work_ids).fillna(0.0)
    component = (weighted_sum / RULE_COMPONENT_SATURATION_POINT * 100.0).clip(upper=100.0)
    return component
