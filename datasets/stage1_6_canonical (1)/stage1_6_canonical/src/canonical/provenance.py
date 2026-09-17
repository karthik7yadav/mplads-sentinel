"""
PART 9 - Provenance. Every canonical record must be traceable back to
its source. This module does not invent anything: it just re-projects
the source_package/source_file/source_row_number/source_record_id
columns that every normalize_*.py module already attaches to every row,
plus duplicate/conflict flags computed from the reconciliation outputs.
"""
import pandas as pd


def _base_provenance(long_df: pd.DataFrame, dataset_label: str, conflicted_work_ids: set) -> pd.DataFrame:
    out = long_df[["work_id", "source_package", "source_file", "source_row_number", "source_record_id"]].copy()
    out["dataset"] = dataset_label
    out["snapshot_label"] = out["source_package"]
    out["match_method"] = out["work_id"].apply(lambda w: "exact_work_id" if pd.notna(w) else "unresolved_no_match")
    out["is_conflict"] = out["work_id"].isin(conflicted_work_ids)
    out = out.rename(columns={"work_id": "canonical_work_id"})
    return out


def build_provenance(
    rec_long, sanc_long, comp_long, exp_long,
    rec_canonical, sanc_canonical, comp_canonical,
    exp_events, conflicts_df,
) -> pd.DataFrame:
    def conflicted_ids(dataset_label):
        sub = conflicts_df[conflicts_df["dataset"] == dataset_label]
        return set(sub["work_id"].dropna().unique().tolist())

    rec_prov = _base_provenance(rec_long, "recommended", conflicted_ids("recommended"))
    sanc_prov = _base_provenance(sanc_long, "sanctioned", conflicted_ids("sanctioned"))
    comp_prov = _base_provenance(comp_long, "completed", conflicted_ids("completed") | conflicted_ids("completed_image" if "completed_image" in conflicts_df["dataset"].unique() else "completed"))
    exp_prov = _base_provenance(exp_long, "expenditure", set())

    # duplicate flags: recommended/sanctioned/completed via cross-package dup on work_id
    for prov, canon in [(rec_prov, rec_canonical), (sanc_prov, sanc_canonical), (comp_prov, comp_canonical)]:
        dup_ids = set(canon[canon["is_cross_package_duplicate"] == True]["work_id"].tolist()) if len(canon) else set()
        prov["is_duplicate"] = prov["canonical_work_id"].isin(dup_ids)

    # expenditure: duplicate + conflict determined per exact raw row via the event table
    if len(exp_events):
        dup_record_ids = set()
        conflict_record_ids = set()
        for _, ev in exp_events.iterrows():
            ids = [i for i in ev["contributing_source_record_ids"].split("; ") if i]
            if ev["is_exact_duplicate_event"]:
                dup_record_ids.update(ids)
            if ev.get("flagged_possible_conflicting_event"):
                conflict_record_ids.update(ids)
        exp_prov["is_duplicate"] = exp_prov["source_record_id"].isin(dup_record_ids)
        exp_prov["is_conflict"] = exp_prov["source_record_id"].isin(conflict_record_ids)
    else:
        exp_prov["is_duplicate"] = False

    all_prov = pd.concat([rec_prov, sanc_prov, comp_prov, exp_prov], ignore_index=True)
    all_prov["notes"] = ""
    all_prov.loc[all_prov["match_method"] == "unresolved_no_match", "notes"] = "work_id could not be extracted from this source row; preserved as unresolved, excluded from canonical Work-ID universe"
    all_prov.loc[all_prov["is_duplicate"] == True, "notes"] = all_prov.loc[all_prov["is_duplicate"] == True, "notes"] + "; exact/cross-package duplicate collapsed into one canonical record"
    all_prov.loc[all_prov["is_conflict"] == True, "notes"] = all_prov.loc[all_prov["is_conflict"] == True, "notes"] + "; contributing row involved in a logged field conflict, see canonical_conflicts.csv"

    cols = [
        "canonical_work_id", "source_package", "source_file", "source_row_number", "source_record_id",
        "snapshot_label", "match_method", "is_duplicate", "is_conflict", "dataset", "notes",
    ]
    return all_prov[cols]
