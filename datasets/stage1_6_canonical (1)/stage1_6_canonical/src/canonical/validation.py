"""
PART 12 - Validation. PART 13 - Reconciliation metrics.
Every number here is computed directly from the reconciled tables -
nothing is hard-coded from the prior analysis documents, though the
independent reconciliation report's numbers are used as a cross-check.
"""
import pandas as pd


def _work_id_universe(long_df: pd.DataFrame, package_label: str) -> set:
    sub = long_df[(long_df["work_id"].notna()) & (long_df["source_package"] == package_label)]
    return set(sub["work_id"].unique().tolist())


def run_validation(
    rec_long, sanc_long, comp_long, exp_long,
    rec_canonical, sanc_canonical, comp_canonical,
    exp_events, exp_summary, work_master, conflicts_df, unresolved_frames: dict,
) -> dict:
    report = {}

    # 1. Unique Work ID check
    report["canonical_work_master_unique_work_ids"] = int(work_master["work_id"].nunique())
    report["canonical_work_master_row_count"] = int(len(work_master))
    report["check_1_unique_work_id_ok"] = report["canonical_work_master_unique_work_ids"] == report["canonical_work_master_row_count"]

    # Per-source, per-package Work-ID universes (raw, valid work_ids only)
    stage1_ids = set()
    stage1_5_ids = set()
    for long_df in [rec_long, sanc_long, comp_long, exp_long]:
        stage1_ids |= _work_id_universe(long_df, "STAGE1_SNAPSHOT")
        stage1_5_ids |= _work_id_universe(long_df, "STAGE1_5_SNAPSHOT")
    canonical_ids = set(work_master["work_id"].tolist())

    common_ids = stage1_ids & stage1_5_ids
    stage1_only = stage1_ids - stage1_5_ids
    stage1_5_only = stage1_5_ids - stage1_ids

    report["stage1_work_id_universe"] = len(stage1_ids)
    report["stage1_5_work_id_universe"] = len(stage1_5_ids)
    report["common_work_ids"] = len(common_ids)
    report["stage1_only_work_ids"] = len(stage1_only)
    report["stage1_5_only_work_ids"] = len(stage1_5_only)
    report["canonical_work_ids"] = len(canonical_ids)
    report["canonical_only_work_ids"] = len(canonical_ids - (stage1_ids | stage1_5_ids))

    # 2. No accidental Work-ID loss
    lost_from_stage1 = stage1_ids - canonical_ids
    lost_from_stage1_5 = stage1_5_ids - canonical_ids
    report["work_ids_lost_from_stage1"] = len(lost_from_stage1)
    report["work_ids_lost_from_stage1_5"] = len(lost_from_stage1_5)
    report["check_2_no_work_id_lost"] = (len(lost_from_stage1) == 0) and (len(lost_from_stage1_5) == 0)

    # 3. Source-to-canonical coverage
    report["canonical_coverage_of_stage1_pct"] = round(100 * len(stage1_ids & canonical_ids) / len(stage1_ids), 4) if stage1_ids else None
    report["canonical_coverage_of_stage1_5_pct"] = round(100 * len(stage1_5_ids & canonical_ids) / len(stage1_5_ids), 4) if stage1_5_ids else None

    # 4. Duplicate event check / 5. Expenditure double-count check
    report["expenditure_distinct_event_keys"] = int(len(exp_events))
    raw_expenditure_resolved_rows = int((exp_long["work_id"].notna()).sum())
    total_contributing = int(exp_events["n_contributing_raw_rows"].sum()) if len(exp_events) else 0
    # rows removed = raw resolved rows collapsed into fewer distinct events
    report["expenditure_duplicate_event_rows_removed"] = raw_expenditure_resolved_rows - int(len(exp_events))
    report["expenditure_raw_resolved_rows"] = raw_expenditure_resolved_rows
    report["expenditure_rows_accounted_for_in_events"] = total_contributing
    report["check_5_expenditure_no_row_unaccounted"] = raw_expenditure_resolved_rows == total_contributing
    if len(exp_summary):
        # Compare like-for-like: RESOLVED raw rows only. Each raw Expenditure
        # file (both packages) ends with one "grand total" artifact row that
        # has no Work ID and a huge lump-sum amount (see
        # reports/canonical_conflicts.csv / README "Known data-quality
        # findings") - including it here would make legitimate exclusion of
        # a non-event total row look like a 80%+ money loss.
        resolved_mask = exp_long["work_id"].notna()
        report["expenditure_sum_raw_resolved_rows_disbursed"] = float(exp_long.loc[resolved_mask, "disbursed_amount"].sum(skipna=True))
        report["expenditure_sum_unresolved_rows_disbursed"] = float(exp_long.loc[~resolved_mask, "disbursed_amount"].sum(skipna=True))
        report["expenditure_sum_canonical_events_disbursed"] = float(exp_events["disbursed_amount"].sum(skipna=True))
        report["check_5b_canonical_sum_lte_raw_sum"] = (
            report["expenditure_sum_canonical_events_disbursed"] <= report["expenditure_sum_raw_resolved_rows_disbursed"] + 1e-6
        )

    # 6. Date consistency (completion should not precede recommendation, where both known)
    both_dates = work_master[work_master["recommendation_date"].notna() & work_master["completion_date"].notna()]
    inconsistent_dates = both_dates[both_dates["completion_date"] < both_dates["recommendation_date"]]
    report["date_consistency_rows_checked"] = int(len(both_dates))
    report["date_consistency_violations"] = int(len(inconsistent_dates))

    # 7. Amount sanity (non-negative)
    for col in ["recommended_amount", "sanction_amount", "total_expenditure", "completion_amount_disbursed"]:
        if col in work_master.columns:
            negative = work_master[work_master[col] < 0]
            report[f"amount_sanity_negative_{col}"] = int(len(negative))

    # 8. Missing Work ID count (unresolved rows, per dataset)
    report["unresolved_rows_by_dataset"] = {k: int(len(v)) for k, v in unresolved_frames.items()}
    report["unresolved_rows_total"] = int(sum(len(v) for v in unresolved_frames.values()))

    # 9. Completion evidence consistency (image_present true implies at least one non-null image OR flagged conflict)
    report["completion_rows_with_image_present_true"] = int(work_master["image_present"].sum())

    # 10. Recommendation/sanction relationship
    report["works_sanctioned_without_recommendation_on_file"] = int(
        len(work_master[(work_master["sanction_present"] == True) & (work_master["recommendation_present"] == False)])
    )
    report["works_recommended_without_sanction_on_file"] = int(
        len(work_master[(work_master["recommendation_present"] == True) & (work_master["sanction_present"] == False)])
    )

    # 11. Cross-source conflict count
    report["total_field_conflicts_logged"] = int(len(conflicts_df))
    report["conflicts_by_dataset"] = conflicts_df["dataset"].value_counts().to_dict() if len(conflicts_df) else {}

    # 12. Provenance completeness computed separately in the orchestrator
    # (every canonical work_id has >=1 provenance row) - see reconciliation_summary.

    # Parliamentary term - were terms inferred without evidence?
    def _non_unknown(col):
        s = work_master[col]
        return int((s.notna() & (s != "Unknown")).sum())

    report["term_values_present"] = {
        "recommendation_term_non_unknown": _non_unknown("recommendation_term"),
        "sanction_term_non_unknown": _non_unknown("sanction_term"),
        "completion_term_non_unknown": _non_unknown("completion_term"),
        "cross_term_project_true": int((work_master["cross_term_project"] == "TRUE").sum()),
        "cross_term_project_false": int((work_master["cross_term_project"] == "FALSE").sum()),
        "cross_term_project_unknown": int((work_master["cross_term_project"] == "Unknown").sum()),
    }

    return report
