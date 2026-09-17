"""
PART 7 - Allocation passthrough (two tagged snapshots, never merged).
PART 8 - Canonical Work-ID Master: ONE ROW PER UNIQUE VALID WORK ID,
built as the union of valid Work IDs across all four reconciled
project-level source tables. Never copies either prior stage's master
file directly.
"""
import numpy as np
import pandas as pd

from src.canonical.term_analysis import determine_cross_term


def build_allocation_output(allocation_long: pd.DataFrame) -> pd.DataFrame:
    """Allocation is MP/constituency-level context. Both snapshots are
    preserved as separate rows (see normalize_allocation.py docstring
    for why they must not be merged) and are never attached to
    individual works as a work-level budget figure."""
    out = allocation_long.copy()
    out["allocation_is_cumulative_or_aggregate"] = True  # documented assumption, see README
    return out


def _coalesce(*series_list):
    result = series_list[0].copy()
    for s in series_list[1:]:
        result = result.where(result.notna(), s)
    return result


def build_work_master(
    rec_canonical: pd.DataFrame,
    sanc_canonical: pd.DataFrame,
    comp_canonical: pd.DataFrame,
    exp_events: pd.DataFrame,
    exp_summary: pd.DataFrame,
    allocation_long: pd.DataFrame,
) -> pd.DataFrame:
    # per-work-id expenditure source flags (events table doesn't carry a
    # single canonical row already flagged like the other three do)
    if len(exp_events):
        exp_src = exp_events.groupby("work_id")[["source_stage1", "source_stage1_5"]].any().reset_index()
        exp_src = exp_src.rename(columns={"source_stage1": "exp_source_stage1", "source_stage1_5": "exp_source_stage1_5"})
    else:
        exp_src = pd.DataFrame(columns=["work_id", "exp_source_stage1", "exp_source_stage1_5"])

    all_ids = pd.Index(sorted(set(
        rec_canonical["work_id"].dropna()
    ) | set(
        sanc_canonical["work_id"].dropna()
    ) | set(
        comp_canonical["work_id"].dropna()
    ) | set(
        exp_summary["work_id"].dropna()
    )), name="work_id")

    master = pd.DataFrame(index=all_ids).reset_index()

    rec = rec_canonical.add_suffix("__rec").rename(columns={"work_id__rec": "work_id"})
    sanc = sanc_canonical.add_suffix("__sanc").rename(columns={"work_id__sanc": "work_id"})
    comp = comp_canonical.add_suffix("__comp").rename(columns={"work_id__comp": "work_id"})
    exps = exp_summary.add_suffix("__exp").rename(columns={"work_id__exp": "work_id"})

    master = master.merge(rec, on="work_id", how="left")
    master = master.merge(sanc, on="work_id", how="left")
    master = master.merge(comp, on="work_id", how="left")
    master = master.merge(exps, on="work_id", how="left")
    master = master.merge(exp_src, on="work_id", how="left")

    master["recommendation_present"] = master["work_id"].isin(rec["work_id"])
    master["sanction_present"] = master["work_id"].isin(sanc["work_id"])
    master["completion_present"] = master["work_id"].isin(comp["work_id"])
    master["expenditure_present"] = master["work_id"].isin(exps["work_id"])

    master["state"] = _coalesce(master.get("state__sanc"), master.get("state__rec"), master.get("state__comp"))
    master["ida"] = _coalesce(master.get("ida__sanc"), master.get("ida__rec"), master.get("ida__comp"))
    master["mp_name"] = _coalesce(master.get("mp_name__sanc"), master.get("mp_name__rec"), master.get("mp_name__comp"))
    master["constituency"] = _coalesce(master.get("constituency__sanc"), master.get("constituency__rec"), master.get("constituency__comp"))
    master["work_category"] = _coalesce(master.get("work_category__sanc"), master.get("work_category__rec"), master.get("work_category__comp"))
    master["work_description"] = _coalesce(master.get("work_description__sanc"), master.get("work_description__rec"), master.get("work_description__comp"))

    master["recommendation_date"] = master.get("recommended_date__rec")
    master["recommended_amount"] = master.get("recommended_amount__rec")
    master["sanction_date"] = _coalesce(master.get("sanction_date__sanc"), master.get("sanction_date__rec"))
    master["sanction_amount"] = master.get("sanction_amount__sanc")
    master["work_status"] = master.get("work_status__sanc")

    master["completion_date"] = master.get("completion_date__comp")
    master["completion_amount_disbursed"] = master.get("disbursed_amount__comp")
    master["image_present"] = master.get("image_present__comp").fillna(False)

    master["total_expenditure"] = master.get("total_expenditure__exp")
    master["expenditure_event_count"] = master.get("payment_event_count__exp")
    master["first_expenditure_date"] = master.get("first_expenditure_date__exp")
    master["latest_expenditure_date"] = master.get("latest_expenditure_date__exp")

    master["recommendation_term"] = master.get("recommendation_term__rec")
    master["recommendation_term_confidence"] = master.get("recommendation_term_confidence__rec")
    master["sanction_term"] = master.get("sanction_term__sanc")
    master["sanction_term_confidence"] = master.get("sanction_term_confidence__sanc")
    master["completion_term"] = master.get("completion_term__comp")
    master["completion_term_confidence"] = master.get("completion_term_confidence__comp")

    def _cross_term_row(row):
        pairs = [
            (row.get("recommendation_term"), row.get("recommendation_term_confidence")),
            (row.get("sanction_term"), row.get("sanction_term_confidence")),
            (row.get("completion_term"), row.get("completion_term_confidence")),
        ]
        sufficient = [(t, c) for t, c in pairs if c in ("HIGH", "MEDIUM")]
        if len(sufficient) < 2:
            return "Unknown"
        terms = set(t for t, c in sufficient)
        return "TRUE" if len(terms) > 1 else "FALSE"

    master["cross_term_project"] = master.apply(_cross_term_row, axis=1)

    master["source_stage1"] = (
        master.get("source_stage1__rec").fillna(False)
        | master.get("source_stage1__sanc").fillna(False)
        | master.get("source_stage1__comp").fillna(False)
        | master.get("exp_source_stage1").fillna(False)
    )
    master["source_stage1_5"] = (
        master.get("source_stage1_5__rec").fillna(False)
        | master.get("source_stage1_5__sanc").fillna(False)
        | master.get("source_stage1_5__comp").fillna(False)
        | master.get("exp_source_stage1_5").fillna(False)
    )

    master["recommendation_has_conflict"] = master.get("has_conflict__rec").fillna(False)
    master["sanction_has_conflict"] = master.get("has_conflict__sanc").fillna(False)
    master["completion_has_conflict"] = master.get("has_conflict__comp").fillna(False)

    # ---- Allocation context flag (constituency/state match only - MP
    # name is NOT used as a join key here because the two allocation
    # snapshots cover different, largely non-overlapping MP-name
    # cohorts for the same constituencies; see normalize_allocation.py).
    alloc = allocation_long.copy()
    alloc["_state_norm"] = alloc["state"].astype(str).str.strip().str.upper()
    alloc["_const_norm"] = alloc["constituency"].astype(str).str.strip().str.upper()
    alloc_pairs = set(zip(alloc["_state_norm"], alloc["_const_norm"]))

    master["_state_norm"] = master["state"].astype(str).str.strip().str.upper()
    master["_const_norm"] = master["constituency"].astype(str).str.strip().str.upper()
    master["allocation_available"] = master.apply(
        lambda r: (r["_state_norm"], r["_const_norm"]) in alloc_pairs, axis=1
    )
    master = master.drop(columns=["_state_norm", "_const_norm"])

    final_cols = [
        "work_id", "state", "ida", "constituency", "mp_name", "work_category", "work_description",
        "recommendation_present", "recommendation_date", "recommended_amount",
        "sanction_present", "sanction_date", "sanction_amount", "work_status",
        "expenditure_present", "total_expenditure", "expenditure_event_count",
        "first_expenditure_date", "latest_expenditure_date",
        "completion_present", "completion_date", "completion_amount_disbursed", "image_present",
        "allocation_available",
        "recommendation_term", "recommendation_term_confidence",
        "sanction_term", "sanction_term_confidence",
        "completion_term", "completion_term_confidence",
        "cross_term_project",
        "recommendation_has_conflict", "sanction_has_conflict", "completion_has_conflict",
        "source_stage1", "source_stage1_5",
    ]
    return master[[c for c in final_cols if c in master.columns]]
