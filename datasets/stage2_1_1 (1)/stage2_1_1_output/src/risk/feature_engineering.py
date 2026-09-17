"""
Part 1 -- Risk Feature Engineering
Part 2 -- Temporal Safety (lifecycle mode + feature availability)

Builds risk_features.csv: exactly one row per canonical Work ID.
Deterministic and reproducible -- no randomness anywhere in this module.
"""

import numpy as np
import pandas as pd

from . import data_loader
from .utils import safe_divide, safe_days_between

# ---------------------------------------------------------------------------
# Feature availability by lifecycle mode (Part 2 -- temporal safety).
# Used by anomaly_detection.py / risk_scoring.py to decide which columns a
# given mode's model/rules are allowed to see. Listed here once so the
# permitted-feature contract lives in exactly one place.
# ---------------------------------------------------------------------------

PRE_SANCTION_ALLOWED_FEATURES = [
    "recommendation_present",
    "recommended_amount",
    "log_recommended_amount",
    "recommendation_missing",
    "days_since_recommendation",
    "recommended_not_sanctioned",
    "pre_unresolved_source_indicator",
    "allocation_available",
    "pre_term_unknown_indicator",
    "pre_conflict_indicator",
    "recommended_amount_percentile_in_peer_group",
    "recommended_amount_robust_z_in_peer_group",
]

IN_PROGRESS_ALLOWED_FEATURES = PRE_SANCTION_ALLOWED_FEATURES + [
    "sanction_present",
    "sanction_amount",
    "log_sanction_amount",
    "sanction_missing",
    "days_recommendation_to_sanction",
    "negative_duration_recommendation_to_sanction",
    "days_since_sanction",
    "expenditure_present",
    "total_expenditure",
    "log_total_expenditure",
    "expenditure_missing",
    "expenditure_to_sanction_ratio",
    "expenditure_to_recommended_ratio",
    "sanction_minus_expenditure",
    "payment_event_count",
    "unique_vendor_count",
    "same_day_multi_payment_indicator",
    "vendor_concentration",
    "expenditure_conflict_indicator",
    "sanctioned_not_expenditure",
    "sanctioned_without_recommendation_on_file",
    "sanction_amount_percentile_in_peer_group",
    "sanction_amount_robust_z_in_peer_group",
    "expenditure_percentile_in_peer_group",
    "expenditure_robust_z_in_peer_group",
    "payment_event_percentile_in_peer_group",
    "in_progress_unresolved_source_indicator",
    "in_progress_term_unknown_indicator",
]

POST_COMPLETION_ALLOWED_FEATURES = IN_PROGRESS_ALLOWED_FEATURES + [
    "completion_present",
    "completion_amount_disbursed",
    "log_completion_amount_disbursed",
    "completion_missing",
    "days_sanction_to_completion",
    "negative_duration_sanction_to_completion",
    "days_recommendation_to_completion",
    "negative_duration_recommendation_to_completion",
    "completion_to_sanction_ratio",
    "expenditure_not_completed",
    "completed_without_expenditure_evidence",
    "post_unresolved_source_indicator",
    "post_term_unknown_indicator",
    "conflict_indicator",
    "duration_percentile_in_peer_group",
    "duration_robust_z_in_peer_group",
]

FEATURE_AVAILABILITY_BY_MODE = {
    "PRE_SANCTION": PRE_SANCTION_ALLOWED_FEATURES,
    "IN_PROGRESS": IN_PROGRESS_ALLOWED_FEATURES,
    "POST_COMPLETION": POST_COMPLETION_ALLOWED_FEATURES,
}

# "Today" for elapsed-time features. Fixed to the canonical data's own most
# recent observed date rather than wall-clock "now", so the pipeline is
# reproducible independent of when it is re-run.
_REFERENCE_DATE = None


def _get_reference_date(work_master: pd.DataFrame) -> pd.Timestamp:
    global _REFERENCE_DATE
    if _REFERENCE_DATE is not None:
        return _REFERENCE_DATE
    all_dates = pd.concat([
        pd.to_datetime(work_master["recommendation_date"], errors="coerce"),
        pd.to_datetime(work_master["sanction_date"], errors="coerce"),
        pd.to_datetime(work_master["completion_date"], errors="coerce"),
        pd.to_datetime(work_master["latest_expenditure_date"], errors="coerce"),
    ])
    _REFERENCE_DATE = all_dates.max()
    return _REFERENCE_DATE


def assign_lifecycle_mode(df: pd.DataFrame) -> pd.Series:
    """
    One current lifecycle mode per work, based purely on which evidence
    exists on file (not on dates), matching PART 2's three named modes.
    """
    mode = pd.Series("PRE_SANCTION", index=df.index)
    mode = mode.where(~df["completion_present"], "POST_COMPLETION")
    in_progress_mask = (~df["completion_present"]) & (df["sanction_present"] | df["expenditure_present"])
    mode = mode.where(~in_progress_mask, "IN_PROGRESS")
    return mode


def _lifecycle_features(df: pd.DataFrame, reference_date: pd.Timestamp) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    out["recommendation_present"] = df["recommendation_present"].astype(bool)
    out["sanction_present"] = df["sanction_present"].astype(bool)
    out["expenditure_present"] = df["expenditure_present"].astype(bool)
    out["completion_present"] = df["completion_present"].astype(bool)

    out["recommendation_date"] = df["recommendation_date"]
    out["sanction_date"] = df["sanction_date"]
    out["completion_date"] = df["completion_date"]

    out["days_recommendation_to_sanction"], out["negative_duration_recommendation_to_sanction"] = (
        safe_days_between(df["sanction_date"], df["recommendation_date"])
    )
    out["days_sanction_to_completion"], out["negative_duration_sanction_to_completion"] = (
        safe_days_between(df["completion_date"], df["sanction_date"])
    )
    out["days_recommendation_to_completion"], out["negative_duration_recommendation_to_completion"] = (
        safe_days_between(df["completion_date"], df["recommendation_date"])
    )

    # Elapsed time since the last known lifecycle event -- used only within
    # a work's *current* mode (see feature-availability lists above), so an
    # in-progress work's "days since sanction" never leaks into a
    # pre-sanction model for a *different* work.
    rec_dt = pd.to_datetime(df["recommendation_date"], errors="coerce")
    sanc_dt = pd.to_datetime(df["sanction_date"], errors="coerce")
    out["days_since_recommendation"] = (reference_date - rec_dt).dt.days.astype("float64")
    out["days_since_sanction"] = (reference_date - sanc_dt).dt.days.astype("float64")

    return out


def _financial_features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    out["recommended_amount"] = pd.to_numeric(df["recommended_amount"], errors="coerce")
    out["sanction_amount"] = pd.to_numeric(df["sanction_amount"], errors="coerce")
    out["total_expenditure"] = pd.to_numeric(df["total_expenditure"], errors="coerce")
    out["completion_amount_disbursed"] = pd.to_numeric(df["completion_amount_disbursed"], errors="coerce")

    out["expenditure_to_sanction_ratio"] = safe_divide(out["total_expenditure"], out["sanction_amount"])
    out["expenditure_to_recommended_ratio"] = safe_divide(out["total_expenditure"], out["recommended_amount"])
    out["completion_to_sanction_ratio"] = safe_divide(out["completion_amount_disbursed"], out["sanction_amount"])
    out["sanction_minus_expenditure"] = out["sanction_amount"] - out["total_expenditure"]
    # sanction_minus_expenditure is only meaningful when both sides exist.
    out["sanction_minus_expenditure"] = out["sanction_minus_expenditure"].where(
        out["sanction_amount"].notna() & out["total_expenditure"].notna()
    )

    for col in ["recommended_amount", "sanction_amount", "total_expenditure", "completion_amount_disbursed"]:
        log_col = f"log_{col}"
        vals = out[col]
        # log1p only defined for >= -1; clip negative artifacts to NaN rather
        # than silently producing complex/NaN-from-error results.
        safe_vals = vals.where(vals >= 0)
        out[log_col] = np.log1p(safe_vals)

    return out


def _payment_features(events: pd.DataFrame, work_ids: pd.Index) -> pd.DataFrame:
    """
    Built directly from canonical_expenditure_events.csv (event-level),
    never deduplicated by Work ID. Only 'resolved' rows are used -- the two
    unresolved grand-total artifact rows (blank work_id) are excluded, same
    as canonical_expenditure_summary.csv does.
    """
    ev = events[events["resolution_status"] == "resolved"].copy()
    ev["disbursed_amount"] = pd.to_numeric(ev["disbursed_amount"], errors="coerce")
    ev["flagged_possible_conflicting_event"] = ev["flagged_possible_conflicting_event"].fillna(False).astype(bool)

    grouped = ev.groupby("work_id")

    payment_event_count = grouped.size().rename("payment_event_count")
    unique_vendor_count = grouped["vendor_name"].nunique().rename("unique_vendor_count")

    # same-day multi-payment: any single expenditure_date with >1 event for that work
    same_day_counts = ev.groupby(["work_id", "expenditure_date"]).size()
    same_day_multi = (same_day_counts > 1).groupby(level=0).any().rename("same_day_multi_payment_indicator")

    # vendor concentration: largest single vendor's share of total disbursed amount
    vendor_totals = ev.groupby(["work_id", "vendor_name"])["disbursed_amount"].sum()
    work_totals = ev.groupby("work_id")["disbursed_amount"].sum()
    max_vendor_totals = vendor_totals.groupby(level=0).max()
    vendor_concentration = (max_vendor_totals / work_totals.replace(0, np.nan)).rename("vendor_concentration")

    expenditure_conflict_indicator = (
        grouped["flagged_possible_conflicting_event"].any().rename("expenditure_conflict_indicator")
    )

    result = pd.concat(
        [payment_event_count, unique_vendor_count, same_day_multi, vendor_concentration, expenditure_conflict_indicator],
        axis=1,
    )
    result = result.reindex(work_ids)
    result["payment_event_count"] = result["payment_event_count"].fillna(0).astype(int)
    result["unique_vendor_count"] = result["unique_vendor_count"].fillna(0).astype(int)
    result["same_day_multi_payment_indicator"] = result["same_day_multi_payment_indicator"].fillna(False).astype(bool)
    result["expenditure_conflict_indicator"] = result["expenditure_conflict_indicator"].fillna(False).astype(bool)
    # vendor_concentration stays NaN where there is no expenditure (correct --
    # "no data" is not the same as "zero concentration").
    return result


def _data_quality_features(df: pd.DataFrame, provenance: pd.DataFrame, payments: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    out["recommendation_missing"] = ~df["recommendation_present"].astype(bool)
    out["sanction_missing"] = ~df["sanction_present"].astype(bool)
    out["expenditure_missing"] = ~df["expenditure_present"].astype(bool)
    out["completion_missing"] = ~df["completion_present"].astype(bool)

    out["allocation_available"] = df["allocation_available"].astype(bool)

    term_cols = ["recommendation_term", "sanction_term", "completion_term"]

    def _is_unknown(series):
        return series.isna() | (series.astype(str).str.strip().str.lower() == "unknown")

    all_terms_unknown = pd.Series(True, index=df.index)
    for c in term_cols:
        all_terms_unknown &= _is_unknown(df[c])
    out["term_unknown_indicator"] = all_terms_unknown

    field_conflict = (
        df["recommendation_has_conflict"].fillna(False).astype(bool)
        | df["sanction_has_conflict"].fillna(False).astype(bool)
        | df["completion_has_conflict"].fillna(False).astype(bool)
    )
    out["field_conflict_indicator"] = field_conflict

    # Stage-safe conflict indicators. A pre-sanction score may only use
    # recommendation-source conflicts; an in-progress score may use
    # recommendation + sanction + expenditure conflicts; post-completion may
    # use the full canonical conflict picture. The legacy all-source flag is
    # retained for audit/reporting only and is never used by a pre/in-progress
    # model or score.
    out["pre_conflict_indicator"] = df["recommendation_has_conflict"].fillna(False).astype(bool)
    out["in_progress_conflict_indicator"] = (
        df["recommendation_has_conflict"].fillna(False).astype(bool)
        | df["sanction_has_conflict"].fillna(False).astype(bool)
        | payments["expenditure_conflict_indicator"].fillna(False).astype(bool)
    )

    # Source-level ambiguity is also stage-scoped. Provenance rows from later
    # lifecycle datasets must not affect an earlier-stage model.
    prov = provenance.copy()
    prov["is_duplicate"] = prov["is_duplicate"].fillna(False).astype(bool)
    prov["is_conflict"] = prov["is_conflict"].fillna(False).astype(bool)
    prov["source_flag"] = prov["is_duplicate"] | prov["is_conflict"]
    stage_datasets = {
        "pre": {"recommended"},
        "in_progress": {"recommended", "sanctioned", "expenditure"},
        "post": {"recommended", "sanctioned", "expenditure", "completed"},
    }
    for label, allowed in stage_datasets.items():
        q = prov[prov["dataset"].isin(allowed)].groupby("canonical_work_id")["source_flag"].any()
        q = q.reindex(df["work_id"]).fillna(False)
        q.index = df.index
        out[f"{label}_unresolved_source_indicator"] = q.astype(bool)
    out["unresolved_source_indicator"] = (
        out["post_unresolved_source_indicator"].astype(bool)
    )

    # Parliamentary-term unknownness is likewise stage-scoped. Never infer a
    # term from dates, IDs, package, or completion; only explicit canonical
    # term fields are consulted.
    def _unknown(s):
        return s.isna() | (s.astype(str).str.strip().str.lower() == "unknown")
    out["pre_term_unknown_indicator"] = _unknown(df["recommendation_term"])
    out["in_progress_term_unknown_indicator"] = _unknown(df["recommendation_term"]) & _unknown(df["sanction_term"])
    out["post_term_unknown_indicator"] = _unknown(df["recommendation_term"]) & _unknown(df["sanction_term"]) & _unknown(df["completion_term"])
    out["term_unknown_indicator"] = out["post_term_unknown_indicator"]

    return out


def _lifecycle_state_features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    rec = df["recommendation_present"].astype(bool)
    san = df["sanction_present"].astype(bool)
    exp = df["expenditure_present"].astype(bool)
    comp = df["completion_present"].astype(bool)

    out["recommended_not_sanctioned"] = rec & ~san
    out["sanctioned_not_expenditure"] = san & ~exp
    out["expenditure_not_completed"] = exp & ~comp
    out["completed_without_expenditure_evidence"] = comp & ~exp
    out["sanctioned_without_recommendation_on_file"] = san & ~rec

    return out


def build_risk_features() -> pd.DataFrame:
    work_master = data_loader.load_work_master()
    events = data_loader.load_expenditure_events()
    provenance = data_loader.load_provenance()

    reference_date = _get_reference_date(work_master)

    base = pd.DataFrame(index=work_master.index)
    base["work_id"] = work_master["work_id"]
    base["state"] = work_master["state"]
    base["constituency"] = work_master["constituency"]
    base["work_category"] = work_master["work_category"]
    base["mp_name"] = work_master["mp_name"]
    base["work_status"] = work_master["work_status"]

    lifecycle = _lifecycle_features(work_master, reference_date)
    financial = _financial_features(work_master)
    payments = _payment_features(events, work_master["work_id"])
    payments.index = work_master.index  # aligned by reindex(work_ids) already; keep positional index
    dq = _data_quality_features(work_master, provenance, payments)
    states = _lifecycle_state_features(work_master)

    features = pd.concat([base, lifecycle, financial, payments, dq, states], axis=1)

    # conflict_indicator (Part 1.D) combines field-level + expenditure-event conflicts.
    features["conflict_indicator"] = (
        features["field_conflict_indicator"] | features["expenditure_conflict_indicator"]
    )

    features["risk_mode"] = assign_lifecycle_mode(work_master).values

    # Sanity: exactly one row per canonical Work ID, no duplicate work_ids.
    assert features["work_id"].is_unique
    assert len(features) == len(work_master)

    return features


def reference_date_used() -> pd.Timestamp:
    """Exposed for reporting/validation purposes."""
    if _REFERENCE_DATE is None:
        wm = data_loader.load_work_master()
        return _get_reference_date(wm)
    return _REFERENCE_DATE
