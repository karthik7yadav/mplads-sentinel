"""
PART 6 - Completion reconciliation.

Evidence for the Stage-1-as-base tie-break (documented in
reports/completion_reconciliation.csv for every conflict actually hit):
the independent reconciliation report found Stage 1's Works_Completed
(33,871 rows) is a superset of Stage 1.5's Works_Completed (20,001
rows) - all 20,000 of Stage 1.5's resolvable completed Work IDs already
appear in Stage 1, and of the 20,001 shared rows only 1 differs in a
core project field. This is used ONLY as the tie-break of last resort
when a field's non-null values genuinely differ; it never causes a
valid Stage-1.5-only record or a Stage-1.5-only populated field to be
dropped (those are filled in via the normal coalesce-when-one-is-null
path, not this tie-break).

Image handling is intentionally NOT included in the generic tie-break:
image_present is merged as an OR across snapshots (a missing image in
one snapshot is never evidence the image doesn't exist), independent
of which snapshot is treated as "base" for other fields.
"""
import pandas as pd

from src.canonical.normalize_completed import build_normalized_completed
from src.canonical.reconcile_common import reconcile_by_work_id

VALUE_COLS = [
    "state", "ida", "mp_name", "mp_name_normalized", "constituency",
    "work_category", "work_description",
    "completion_date", "disbursed_amount",
    "completion_term", "completion_term_confidence",
]

NULL_LIKE = {"completion_term": {"Unknown"}, "completion_term_confidence": {"UNKNOWN"}}

PREFERRED_REASON = (
    "Stage 1 Works_Completed (33,871 rows) is the broader/superset completed "
    "population; Stage 1.5's 20,000 resolvable completed Work IDs are "
    "(per the independent reconciliation report) already contained within "
    "Stage 1's completed population. Used only as a last-resort tie-break "
    "when both snapshots report a differing non-null value for the same "
    "Work ID; the conflict is logged either way."
)


def _reconcile_image(long_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (image_df indexed by work_id, image_conflicts_df)."""
    resolved = long_df[long_df["work_id"].notna()].copy()
    rows = []
    conflicts = []
    for work_id, group in resolved.groupby("work_id", sort=False):
        with_image = group[group["image_present"] == True]
        image_present_final = bool(len(with_image) > 0)
        image_final = None
        if len(with_image):
            distinct_images = with_image["image"].dropna().unique().tolist()
            if len(distinct_images) == 1:
                image_final = distinct_images[0]
            elif len(distinct_images) > 1:
                # Prefer Stage 1's image value as the documented base, but log it.
                stage1_imgs = with_image[with_image["source_package"] == "STAGE1_SNAPSHOT"]["image"].dropna().unique().tolist()
                image_final = stage1_imgs[0] if stage1_imgs else distinct_images[0]
                conflicts.append({
                    "dataset": "completed",
                    "work_id": work_id,
                    "field": "image",
                    "value_stage1": "; ".join(str(v) for v in with_image[with_image["source_package"] == "STAGE1_SNAPSHOT"]["image"].dropna().unique()),
                    "value_stage1_5": "; ".join(str(v) for v in with_image[with_image["source_package"] == "STAGE1_5_SNAPSHOT"]["image"].dropna().unique()),
                    "selected_canonical_value": image_final,
                    "reason": "Both snapshots provide a non-null but different image reference for the same Work ID; Stage 1 preferred as documented base.",
                    "confidence": "MEDIUM_EVIDENCE_BACKED_TIEBREAK",
                })
        rows.append({"work_id": work_id, "image_present": image_present_final, "image": image_final})
    return pd.DataFrame(rows), pd.DataFrame(conflicts, columns=[
        "dataset", "work_id", "field", "value_stage1", "value_stage1_5",
        "selected_canonical_value", "reason", "confidence",
    ])


def build_completion_reconciliation():
    long_df, prof1, prof2 = build_normalized_completed()
    canonical, unresolved, conflicts = reconcile_by_work_id(
        long_df, VALUE_COLS, dataset_label="completed",
        preferred_package="STAGE1_SNAPSHOT", preferred_package_reason=PREFERRED_REASON,
        null_like_values=NULL_LIKE,
    )
    image_df, image_conflicts = _reconcile_image(long_df)
    canonical = canonical.merge(image_df, on="work_id", how="left")
    conflicts = pd.concat([conflicts, image_conflicts], ignore_index=True)
    return long_df, canonical, unresolved, conflicts, prof1, prof2
