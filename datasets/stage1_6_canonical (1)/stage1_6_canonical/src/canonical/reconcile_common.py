"""
PARTS 3/4/6 shared engine - reconcile a long (multi-row-per-work-id,
multi-package) normalized table down to one canonical logical record
per valid Work ID, WITHOUT fuzzy matching. Work ID is the only linkage
key ever used here.

Rewritten with vectorized pandas groupby operations for performance at
25k-55k distinct work_ids (a pure-Python per-group loop measured ~80s
for 27k groups on one dataset alone, which does not scale across all
datasets run in sequence). Rules are unchanged from the original design.

Rules implemented (per Stage 1.6 spec):
  - Rows with a missing/unresolved work_id are NEVER dropped and NEVER
    assigned an invented work_id. Returned separately as "unresolved".
  - For a given valid work_id, if a field has exactly one distinct
    non-null value across every contributing row (any package), that
    value becomes canonical - not a conflict.
  - If a field has >1 distinct non-null value, that is a CONFLICT.
    Canonical value defaults to None ("Unknown") with both source
    values preserved in the conflict table (Part 10), unless the
    caller supplies `preferred_package` (only used where an external,
    evidence-backed note justifies a tie-break) - the conflict is
    still logged either way.
"""
import pandas as pd
import numpy as np


def reconcile_by_work_id(
    long_df: pd.DataFrame,
    value_cols: list[str],
    dataset_label: str,
    preferred_package: str | None = None,
    preferred_package_reason: str = "",
    null_like_values: dict | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    null_like_values = null_like_values or {}
    df = long_df.copy()

    unresolved = df[df["work_id"].isna()].copy()
    unresolved["resolution_status"] = "unresolved_missing_work_id"
    unresolved["unresolved_record_id"] = unresolved["source_record_id"]

    resolved = df[df["work_id"].notna()].copy()

    resolved["_is_s1"] = resolved["source_package"] == "STAGE1_SNAPSHOT"
    resolved["_is_s15"] = resolved["source_package"] == "STAGE1_5_SNAPSHOT"
    presence = resolved.groupby("work_id")[["_is_s1", "_is_s15"]].any()
    n_rows = resolved.groupby("work_id").size().rename("n_source_rows")

    canonical = pd.DataFrame(index=presence.index)
    canonical["n_source_rows"] = n_rows
    canonical["source_stage1"] = presence["_is_s1"]
    canonical["source_stage1_5"] = presence["_is_s15"]
    canonical["is_cross_package_duplicate"] = presence["_is_s1"] & presence["_is_s15"]
    canonical["has_conflict"] = False

    conflict_rows = []

    for col in value_cols:
        if col not in resolved.columns:
            canonical[col] = None
            continue

        null_like = null_like_values.get(col)
        if null_like:
            work_series = resolved[col].where(~resolved[col].isin(null_like), np.nan)
        else:
            work_series = resolved[col]

        tmp = pd.DataFrame({"work_id": resolved["work_id"].values, "_v": work_series.values})
        nunique = tmp.groupby("work_id")["_v"].nunique(dropna=True)
        first_val = tmp.groupby("work_id")["_v"].first()

        all_null_mask = nunique == 0
        if null_like and all_null_mask.any():
            raw_tmp = pd.DataFrame({"work_id": resolved["work_id"].values, "_v": resolved[col].values})
            fallback = raw_tmp.groupby("work_id")["_v"].first()
            first_val = first_val.where(~all_null_mask, fallback)

        canonical[col] = first_val
        conflict_mask = nunique > 1
        canonical.loc[conflict_mask, "has_conflict"] = True

        if conflict_mask.any():
            conflicted_ids = nunique[conflict_mask].index
            sub = resolved[resolved["work_id"].isin(conflicted_ids)]
            for work_id, g in sub.groupby("work_id"):
                g1 = g.loc[g["_is_s1"], col].dropna()
                if null_like:
                    g1 = g1[~g1.isin(null_like)]
                g2 = g.loc[g["_is_s15"], col].dropna()
                if null_like:
                    g2 = g2[~g2.isin(null_like)]
                vals_1 = list(dict.fromkeys(g1.tolist()))
                vals_2 = list(dict.fromkeys(g2.tolist()))

                if preferred_package == "STAGE1_SNAPSHOT" and vals_1:
                    canonical_val = vals_1[0]
                    reason, confidence = preferred_package_reason, "MEDIUM_EVIDENCE_BACKED_TIEBREAK"
                elif preferred_package == "STAGE1_5_SNAPSHOT" and vals_2:
                    canonical_val = vals_2[0]
                    reason, confidence = preferred_package_reason, "MEDIUM_EVIDENCE_BACKED_TIEBREAK"
                else:
                    canonical_val = None
                    reason = "differing non-null values across snapshots; no defensible deterministic tie-break"
                    confidence = "LOW_NO_TIEBREAK"

                canonical.at[work_id, col] = canonical_val
                conflict_rows.append({
                    "dataset": dataset_label,
                    "work_id": work_id,
                    "field": col,
                    "value_stage1": "; ".join(str(v) for v in vals_1) if vals_1 else None,
                    "value_stage1_5": "; ".join(str(v) for v in vals_2) if vals_2 else None,
                    "selected_canonical_value": canonical_val,
                    "reason": reason,
                    "confidence": confidence,
                })

    canonical_df = canonical.reset_index()
    conflicts_df = pd.DataFrame(conflict_rows, columns=[
        "dataset", "work_id", "field", "value_stage1", "value_stage1_5",
        "selected_canonical_value", "reason", "confidence",
    ])
    return canonical_df, unresolved, conflicts_df
