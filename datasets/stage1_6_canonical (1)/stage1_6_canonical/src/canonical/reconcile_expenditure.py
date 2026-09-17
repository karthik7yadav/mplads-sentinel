"""
PART 5 - Expenditure event-level reconciliation. CRITICAL: the
expenditure file is many-rows-per-work_id by nature (one row per
payment event). Deduplication happens ONLY at the full event-key level,
never by work_id alone, and never by aggregating away distinct events.

Event key: (work_id, expenditure_date, vendor_name, payment_status,
disbursed_amount). Two raw rows are the SAME event only if every one of
these fields matches exactly.

Classification per row (after grouping by the full event key):
  - exact_duplicate_event: the same event key appears more than once
    (whether within one package or across both) -> collapsed to ONE
    canonical event row; provenance records every contributing raw row.
  - unique event otherwise (kept as its own canonical row).

Separately (does not affect row survival, only a review flag):
  - possible_conflicting_event: two DIFFERENT event keys share the same
    (work_id, expenditure_date, vendor_name) but differ in
    payment_status and/or disbursed_amount. This could be two genuinely
    distinct payments to the same vendor on the same day, or a
    corrected re-record of one payment - the data alone cannot tell
    these apart, so both rows are preserved and flagged for human
    review rather than either being dropped or silently merged.
"""
import pandas as pd

from src.canonical.normalize_expenditure import build_normalized_expenditure

EVENT_KEY = ["work_id", "expenditure_date", "vendor_name", "payment_status", "disbursed_amount"]


def build_expenditure_reconciliation():
    long_df, prof1, prof2 = build_normalized_expenditure()

    unresolved = long_df[long_df["work_id"].isna()].copy()
    unresolved["resolution_status"] = "unresolved_missing_work_id"
    unresolved["unresolved_record_id"] = unresolved["source_record_id"]

    resolved = long_df[long_df["work_id"].notna()].copy()

    # Build a hashable event key (dates -> ISO strings, NaN -> sentinel)
    def _key_tuple(row):
        return (
            row["work_id"],
            row["expenditure_date"].isoformat() if pd.notna(row["expenditure_date"]) else None,
            row["vendor_name"],
            row["payment_status"],
            row["disbursed_amount"] if pd.notna(row["disbursed_amount"]) else None,
        )

    resolved = resolved.copy()
    resolved["_event_key"] = resolved.apply(_key_tuple, axis=1)

    event_rows = []
    reconciliation_report_rows = []
    duplicate_events_removed = 0

    for key, group in resolved.groupby("_event_key", sort=False):
        packages_present = sorted(group["source_package"].unique().tolist())
        n_contributing = len(group)
        is_exact_duplicate = n_contributing > 1
        if is_exact_duplicate:
            duplicate_events_removed += n_contributing - 1

        rep = group.iloc[0]
        event_rows.append({
            "work_id": rep["work_id"],
            "expenditure_date": rep["expenditure_date"],
            "vendor_name": rep["vendor_name"],
            "payment_status": rep["payment_status"],
            "disbursed_amount": rep["disbursed_amount"],
            "state": rep.get("state"),
            "mp_name": rep.get("mp_name"),
            "constituency": rep.get("constituency"),
            "source_stage1": "STAGE1_SNAPSHOT" in packages_present,
            "source_stage1_5": "STAGE1_5_SNAPSHOT" in packages_present,
            "n_contributing_raw_rows": n_contributing,
            "is_exact_duplicate_event": is_exact_duplicate,
            "contributing_source_record_ids": "; ".join(group["source_record_id"].tolist()),
        })

        reconciliation_report_rows.append({
            "work_id": rep["work_id"],
            "expenditure_date": rep["expenditure_date"],
            "vendor_name": rep["vendor_name"],
            "payment_status": rep["payment_status"],
            "disbursed_amount": rep["disbursed_amount"],
            "classification": "exact_duplicate_event" if is_exact_duplicate else "distinct_payment_event",
            "n_contributing_raw_rows": n_contributing,
            "packages_present": "+".join(packages_present),
        })

    events_df = pd.DataFrame(event_rows)
    recon_report_df = pd.DataFrame(reconciliation_report_rows)

    # Secondary check: possible conflicting events sharing
    # (work_id, expenditure_date, vendor_name) but differing status/amount.
    if len(events_df):
        grp_cols = ["work_id", "expenditure_date", "vendor_name"]
        combo_counts = events_df.groupby(grp_cols)[["payment_status", "disbursed_amount"]].transform(
            lambda s: s.astype(str)
        )
        events_df["_combo_key"] = list(zip(
            events_df["work_id"], events_df["expenditure_date"].astype(str), events_df["vendor_name"]
        ))
        distinct_variant_counts = events_df.groupby("_combo_key")[["payment_status", "disbursed_amount"]] \
            .apply(lambda g: g.drop_duplicates().shape[0])
        conflict_keys = set(distinct_variant_counts[distinct_variant_counts > 1].index)
        events_df["flagged_possible_conflicting_event"] = events_df["_combo_key"].isin(conflict_keys)
        events_df = events_df.drop(columns=["_combo_key"])
    else:
        events_df["flagged_possible_conflicting_event"] = pd.Series(dtype=bool)

    n_possible_conflicts = int(events_df["flagged_possible_conflicting_event"].sum()) if len(events_df) else 0

    # Per-work-id summary (excludes rows with unresolved work_id, matching
    # Stage 1's payments.py convention of excluding un-attributable rows
    # from aggregation while never deleting them from the event table).
    if len(events_df):
        grouped = events_df.groupby("work_id")
        summary = grouped.agg(
            total_expenditure=("disbursed_amount", lambda s: s.sum(skipna=True) if s.notna().any() else None),
            payment_event_count=("disbursed_amount", "size"),
            first_expenditure_date=("expenditure_date", "min"),
            latest_expenditure_date=("expenditure_date", "max"),
            unique_vendors=("vendor_name", pd.Series.nunique),
        ).reset_index()
    else:
        summary = pd.DataFrame(columns=[
            "work_id", "total_expenditure", "payment_event_count",
            "first_expenditure_date", "latest_expenditure_date", "unique_vendors",
        ])

    metrics = {
        "raw_rows_stage1": prof1["row_count"],
        "raw_rows_stage1_5": prof2["row_count"],
        "raw_rows_combined": prof1["row_count"] + prof2["row_count"],
        "rows_with_unresolved_work_id": int(len(unresolved)),
        "distinct_event_keys": int(len(events_df)),
        "duplicate_event_rows_removed": int(duplicate_events_removed),
        "possible_conflicting_events_flagged": n_possible_conflicts,
    }

    return {
        "events_df": events_df,
        "summary_df": summary,
        "unresolved_df": unresolved,
        "reconciliation_report_df": recon_report_df,
        "metrics": metrics,
        "prof1": prof1,
        "prof2": prof2,
        "long_df": long_df,
    }
