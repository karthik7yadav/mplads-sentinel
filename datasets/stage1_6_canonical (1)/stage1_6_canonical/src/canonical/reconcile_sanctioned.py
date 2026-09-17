"""
PART 4 - Sanction reconciliation.

The independent reconciliation report found 0 Work IDs common to both
packages' Sanctioned files, so this reconciliation is expected to
reduce to a near-total union with essentially no field conflicts.
Recommendation is never inferred from sanction, and sanction is never
inferred from recommendation - each dataset is reconciled independently.
"""
from src.canonical.normalize_sanctioned import build_normalized_sanctioned
from src.canonical.reconcile_common import reconcile_by_work_id

VALUE_COLS = [
    "state", "ida", "mp_name", "mp_name_normalized", "constituency",
    "work_category", "work_description",
    "recommended_date", "sanction_date", "sanction_amount", "work_status",
    "sanction_term", "sanction_term_confidence",
]

NULL_LIKE = {"sanction_term": {"Unknown"}, "sanction_term_confidence": {"UNKNOWN"}}


def build_sanction_reconciliation():
    long_df, prof1, prof2 = build_normalized_sanctioned()
    canonical, unresolved, conflicts = reconcile_by_work_id(
        long_df, VALUE_COLS, dataset_label="sanctioned", null_like_values=NULL_LIKE,
    )
    return long_df, canonical, unresolved, conflicts, prof1, prof2
