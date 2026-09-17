"""
PART 3 - Recommendation reconciliation.

No preferred package: the independent reconciliation report found only
11 Work IDs common to both packages' Recommended files, so cross-package
conflicts are expected to be rare. Where a genuine conflict occurs with
no external evidence to prefer one snapshot, canonical value = Unknown
and both values are preserved in the conflict report (Part 10).
"""
from src.canonical.normalize_recommended import build_normalized_recommended
from src.canonical.reconcile_common import reconcile_by_work_id

VALUE_COLS = [
    "state", "ida", "mp_name", "mp_name_normalized", "constituency",
    "work_category", "work_description",
    "recommended_date", "recommended_amount", "sanction_date",
    "recommendation_term", "recommendation_term_confidence",
]

NULL_LIKE = {"recommendation_term": {"Unknown"}, "recommendation_term_confidence": {"UNKNOWN"}}


def build_recommendation_reconciliation():
    long_df, prof1, prof2 = build_normalized_recommended()
    canonical, unresolved, conflicts = reconcile_by_work_id(
        long_df, VALUE_COLS, dataset_label="recommended", null_like_values=NULL_LIKE,
    )
    return long_df, canonical, unresolved, conflicts, prof1, prof2
