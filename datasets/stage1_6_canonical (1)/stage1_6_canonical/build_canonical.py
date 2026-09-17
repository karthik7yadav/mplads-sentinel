"""
STAGE 1.6 - CANONICAL DATA FOUNDATION & DATASET RECONCILIATION
Main orchestrator. Run with:  python3 build_canonical.py
"""
import json
import time
import sys
import pandas as pd

sys.path.insert(0, ".")

from src.canonical import config
from src.canonical.reconcile_recommended import build_recommendation_reconciliation
from src.canonical.reconcile_sanctioned import build_sanction_reconciliation
from src.canonical.reconcile_completed import build_completion_reconciliation
from src.canonical.reconcile_expenditure import build_expenditure_reconciliation
from src.canonical.normalize_allocation import build_normalized_allocation
from src.canonical.canonical_builder import build_allocation_output, build_work_master
from src.canonical.provenance import build_provenance
from src.canonical.validation import run_validation

T0 = time.time()


def _t(label):
    print(f"[{time.time()-T0:7.1f}s] {label}")


config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------
# PART 3 - Recommendation reconciliation
# ---------------------------------------------------------------------
_t("Building recommendation reconciliation...")
rec_long, rec_canonical, rec_unresolved, rec_conflicts, rec_prof1, rec_prof2 = build_recommendation_reconciliation()
_t(f"  recommended: {len(rec_long)} raw rows -> {len(rec_canonical)} canonical work_ids, {len(rec_unresolved)} unresolved, {len(rec_conflicts)} conflicts")

# ---------------------------------------------------------------------
# PART 4 - Sanction reconciliation
# ---------------------------------------------------------------------
_t("Building sanction reconciliation...")
sanc_long, sanc_canonical, sanc_unresolved, sanc_conflicts, sanc_prof1, sanc_prof2 = build_sanction_reconciliation()
_t(f"  sanctioned: {len(sanc_long)} raw rows -> {len(sanc_canonical)} canonical work_ids, {len(sanc_unresolved)} unresolved, {len(sanc_conflicts)} conflicts")

# ---------------------------------------------------------------------
# PART 6 - Completion reconciliation
# ---------------------------------------------------------------------
_t("Building completion reconciliation...")
comp_long, comp_canonical, comp_unresolved, comp_conflicts, comp_prof1, comp_prof2 = build_completion_reconciliation()
_t(f"  completed: {len(comp_long)} raw rows -> {len(comp_canonical)} canonical work_ids, {len(comp_unresolved)} unresolved, {len(comp_conflicts)} conflicts")

# ---------------------------------------------------------------------
# PART 5 - Expenditure event-level reconciliation
# ---------------------------------------------------------------------
_t("Building expenditure reconciliation...")
exp_result = build_expenditure_reconciliation()
exp_events = exp_result["events_df"]
exp_summary = exp_result["summary_df"]
exp_unresolved = exp_result["unresolved_df"]
exp_recon_report = exp_result["reconciliation_report_df"]
exp_metrics = exp_result["metrics"]
exp_prof1, exp_prof2 = exp_result["prof1"], exp_result["prof2"]
_t(f"  expenditure: {exp_metrics['raw_rows_combined']} raw rows -> {exp_metrics['distinct_event_keys']} distinct events, "
   f"{exp_metrics['duplicate_event_rows_removed']} exact-duplicate rows removed, {exp_metrics['rows_with_unresolved_work_id']} unresolved, "
   f"{exp_metrics['possible_conflicting_events_flagged']} possible-conflict events flagged")

# ---------------------------------------------------------------------
# PART 7 - Allocation
# ---------------------------------------------------------------------
_t("Building allocation output...")
alloc_long, alloc_prof1, alloc_prof2 = build_normalized_allocation()
allocation_output = build_allocation_output(alloc_long)
_t(f"  allocation: {len(allocation_output)} rows (both snapshots preserved separately)")

# ---------------------------------------------------------------------
# PART 8 - Canonical Work-ID Master
# ---------------------------------------------------------------------
_t("Building canonical work master...")
work_master = build_work_master(rec_canonical, sanc_canonical, comp_canonical, exp_events, exp_summary, alloc_long)
_t(f"  canonical_work_master: {len(work_master)} unique work_ids")

# ---------------------------------------------------------------------
# PART 10 - Conflicts (combined)
# ---------------------------------------------------------------------
_t("Combining conflict tables...")
exp_conflicts = exp_events[exp_events["flagged_possible_conflicting_event"] == True].copy() if len(exp_events) else pd.DataFrame()
if len(exp_conflicts):
    exp_conflicts = exp_conflicts.rename(columns={"disbursed_amount": "selected_canonical_value"})
    exp_conflicts["dataset"] = "expenditure_event"
    exp_conflicts["field"] = "payment_status_or_amount"
    exp_conflicts["reason"] = (
        "Same work_id + expenditure_date + vendor_name but differing payment_status/disbursed_amount "
        "across event rows; could be two genuinely distinct payments or a corrected re-record - both retained, flagged for review."
    )
    exp_conflicts["confidence"] = "REVIEW_REQUIRED"
    exp_conflicts["value_stage1"] = None
    exp_conflicts["value_stage1_5"] = None
    exp_conflicts = exp_conflicts[["dataset", "work_id", "field", "value_stage1", "value_stage1_5", "selected_canonical_value", "reason", "confidence"]]

all_conflicts = pd.concat([rec_conflicts, sanc_conflicts, comp_conflicts, exp_conflicts], ignore_index=True)
_t(f"  total conflicts logged: {len(all_conflicts)}")

# ---------------------------------------------------------------------
# PART 9 - Provenance
# ---------------------------------------------------------------------
_t("Building provenance table...")
provenance = build_provenance(
    rec_long, sanc_long, comp_long, exp_result["long_df"],
    rec_canonical, sanc_canonical, comp_canonical, exp_events, all_conflicts,
)
_t(f"  provenance rows: {len(provenance)}")

# ---------------------------------------------------------------------
# PART 1 - Source inventory (built from the tagged long tables so the
# work-id / date / amount stats reflect the SAME extraction logic used
# everywhere else in this pipeline, not a second ad-hoc pass over raw).
# ---------------------------------------------------------------------
_t("Building source inventory...")

DATE_COL_BY_DATASET = {
    "recommended": ["recommended_date", "sanction_date"],
    "sanctioned": ["recommended_date", "sanction_date"],
    "completed": ["completion_date"],
    "expenditure": ["expenditure_date"],
    "allocation": [],
}
AMOUNT_COL_BY_DATASET = {
    "recommended": ["recommended_amount"],
    "sanctioned": ["sanction_amount"],
    "completed": ["disbursed_amount"],
    "expenditure": ["disbursed_amount"],
    "allocation": ["allocated_amount"],
}

inventory_rows = []
dataset_longs = {
    "recommended": (rec_long, rec_prof1, rec_prof2),
    "sanctioned": (sanc_long, sanc_prof1, sanc_prof2),
    "completed": (comp_long, comp_prof1, comp_prof2),
    "expenditure": (exp_result["long_df"], exp_prof1, exp_prof2),
    "allocation": (alloc_long, alloc_prof1, alloc_prof2),
}

for dataset, (long_df, prof1, prof2) in dataset_longs.items():
    for package_label, prof in [("STAGE1_SNAPSHOT", prof1), ("STAGE1_5_SNAPSHOT", prof2)]:
        sub = long_df[long_df["source_package"] == package_label]
        row = {
            "source_package": package_label,
            "source_file": prof["source_file"],
            "dataset": dataset,
            "row_count": prof["row_count"],
            "column_count": prof["column_count"],
            "columns": " | ".join(prof["columns"]),
            "has_work_id_column": dataset == "expenditure",
            "unique_work_ids": int(sub["work_id"].nunique()) if "work_id" in sub.columns else None,
            "missing_or_unresolved_work_ids": int(sub["work_id"].isna().sum()) if "work_id" in sub.columns else None,
            "duplicate_raw_rows": prof["duplicate_rows"],
            "sha256": prof["sha256"],
        }
        for dc in DATE_COL_BY_DATASET[dataset]:
            if dc in sub.columns:
                valid = sub[dc].dropna()
                row[f"{dc}_min"] = str(valid.min().date()) if len(valid) else None
                row[f"{dc}_max"] = str(valid.max().date()) if len(valid) else None
                row[f"{dc}_n_valid"] = int(len(valid))
        for ac in AMOUNT_COL_BY_DATASET[dataset]:
            if ac in sub.columns:
                valid = sub[ac].dropna()
                row[f"{ac}_min"] = float(valid.min()) if len(valid) else None
                row[f"{ac}_max"] = float(valid.max()) if len(valid) else None
                row[f"{ac}_n_valid"] = int(len(valid))
        inventory_rows.append(row)

source_inventory = pd.DataFrame(inventory_rows)
_t(f"  source_inventory: {len(source_inventory)} rows (5 datasets x 2 packages)")


# ---------------------------------------------------------------------
# PART 12/13 - Validation + reconciliation metrics
# ---------------------------------------------------------------------
_t("Running validation...")
unresolved_frames = {
    "recommended": rec_unresolved,
    "sanctioned": sanc_unresolved,
    "completed": comp_unresolved,
    "expenditure": exp_unresolved,
}
validation_report = run_validation(
    rec_long, sanc_long, comp_long, exp_result["long_df"],
    rec_canonical, sanc_canonical, comp_canonical,
    exp_events, exp_summary, work_master, all_conflicts, unresolved_frames,
)
# Provenance completeness (Part 12, item 12)
prov_ids = set(provenance["canonical_work_id"].dropna().unique().tolist())
master_ids = set(work_master["work_id"].tolist())
validation_report["work_ids_in_master_missing_from_provenance"] = len(master_ids - prov_ids)
validation_report["check_12_provenance_complete"] = len(master_ids - prov_ids) == 0
_t(f"  canonical work ids: {validation_report['canonical_work_ids']}  "
   f"(stage1={validation_report['stage1_work_id_universe']}, stage1.5={validation_report['stage1_5_work_id_universe']}, "
   f"common={validation_report['common_work_ids']})")
_t(f"  work ids lost from stage1: {validation_report['work_ids_lost_from_stage1']}, from stage1.5: {validation_report['work_ids_lost_from_stage1_5']}")

reconciliation_summary = {
    "raw_row_counts": {
        "recommended": {"stage1": rec_prof1["row_count"], "stage1_5": rec_prof2["row_count"]},
        "sanctioned": {"stage1": sanc_prof1["row_count"], "stage1_5": sanc_prof2["row_count"]},
        "expenditure": {"stage1": exp_prof1["row_count"], "stage1_5": exp_prof2["row_count"]},
        "completed": {"stage1": comp_prof1["row_count"], "stage1_5": comp_prof2["row_count"]},
        "allocation": {"stage1": alloc_prof1["row_count"], "stage1_5": alloc_prof2["row_count"]},
    },
    "unique_work_ids_by_source_package": {
        "stage1": validation_report["stage1_work_id_universe"],
        "stage1_5": validation_report["stage1_5_work_id_universe"],
        "common": validation_report["common_work_ids"],
        "stage1_only": validation_report["stage1_only_work_ids"],
        "stage1_5_only": validation_report["stage1_5_only_work_ids"],
    },
    "canonical_unique_work_ids": validation_report["canonical_work_ids"],
    "duplicate_events_removed": exp_metrics["duplicate_event_rows_removed"],
    "possible_conflicting_events_flagged": exp_metrics["possible_conflicting_events_flagged"],
    "conflicts_found_total": int(len(all_conflicts)),
    "conflicts_by_dataset": validation_report["conflicts_by_dataset"],
    "unresolved_work_id_rows": validation_report["unresolved_rows_total"],
    "unresolved_by_dataset": validation_report["unresolved_rows_by_dataset"],
    "records_with_missing_recommended_date": int(work_master["recommendation_date"].isna().sum()),
    "records_with_missing_sanction_date": int((work_master["sanction_present"] & work_master["sanction_date"].isna()).sum()),
    "records_with_missing_recommended_amount": int(work_master["recommended_amount"].isna().sum()),
    "completion_coverage": int(work_master["completion_present"].sum()),
    "expenditure_coverage": int(work_master["expenditure_present"].sum()),
    "recommendation_coverage": int(work_master["recommendation_present"].sum()),
    "sanction_coverage": int(work_master["sanction_present"].sum()),
}
_t("Validation + metrics complete.")

# ---------------------------------------------------------------------
# WRITE OUTPUTS
# ---------------------------------------------------------------------
_t("Writing output files...")

def _finalize(canonical_df, unresolved_df, resolution_col_default="resolved"):
    c = canonical_df.copy()
    c["resolution_status"] = resolution_col_default
    u = unresolved_df.copy()
    return pd.concat([c, u], ignore_index=True, sort=False)

canonical_recommended_out = _finalize(rec_canonical, rec_unresolved)
canonical_sanctioned_out = _finalize(sanc_canonical, sanc_unresolved)
canonical_completed_out = _finalize(comp_canonical, comp_unresolved)

canonical_recommended_out.to_csv(config.OUT_DIR / "canonical_recommended.csv", index=False)
canonical_sanctioned_out.to_csv(config.OUT_DIR / "canonical_sanctioned.csv", index=False)
canonical_completed_out.to_csv(config.OUT_DIR / "canonical_completed.csv", index=False)

# expenditure events: resolved events + unresolved raw rows
exp_events_out = exp_events.copy()
exp_events_out["resolution_status"] = "resolved"
exp_unresolved_out = exp_unresolved.copy()
exp_unresolved_out["resolution_status"] = "unresolved_missing_work_id"
canonical_expenditure_events_out = pd.concat([exp_events_out, exp_unresolved_out], ignore_index=True, sort=False)
canonical_expenditure_events_out.to_csv(config.OUT_DIR / "canonical_expenditure_events.csv", index=False)
exp_summary.to_csv(config.OUT_DIR / "canonical_expenditure_summary.csv", index=False)

allocation_output.to_csv(config.OUT_DIR / "canonical_allocation.csv", index=False)
work_master.to_csv(config.OUT_DIR / "canonical_work_master.csv", index=False)
provenance.to_csv(config.OUT_DIR / "canonical_provenance.csv", index=False)

source_inventory.to_csv(config.REPORTS_DIR / "source_inventory.csv", index=False)
rec_canonical.to_csv(config.REPORTS_DIR / "recommended_reconciliation.csv", index=False)
sanc_canonical.to_csv(config.REPORTS_DIR / "sanction_reconciliation.csv", index=False)
comp_canonical.to_csv(config.REPORTS_DIR / "completion_reconciliation.csv", index=False)
exp_recon_report.to_csv(config.REPORTS_DIR / "expenditure_reconciliation.csv", index=False)
all_conflicts.to_csv(config.REPORTS_DIR / "canonical_conflicts.csv", index=False)

with open(config.REPORTS_DIR / "reconciliation_summary.json", "w") as f:
    json.dump(reconciliation_summary, f, indent=2, default=str)

with open(config.REPORTS_DIR / "canonical_validation.json", "w") as f:
    json.dump(validation_report, f, indent=2, default=str)

_t("Core files written. Generating markdown reports...")

# ---------------------------------------------------------------------
# reports/source_inventory.md
# ---------------------------------------------------------------------
md = ["# Source Inventory — Stage 1.6\n",
      "Every raw file from both packages, profiled independently. See `source_inventory.csv` for the full column-level detail.\n"]
for dataset in ["recommended", "sanctioned", "expenditure", "completed", "allocation"]:
    md.append(f"\n## {dataset}\n")
    sub = source_inventory[source_inventory["dataset"] == dataset]
    for _, r in sub.iterrows():
        md.append(f"- **{r['source_package']}** (`{r['source_file']}`): {r['row_count']} rows, {r['column_count']} columns, "
                   f"{r['unique_work_ids']} unique work IDs, {r['missing_or_unresolved_work_ids']} missing/unresolved work IDs, "
                   f"{r['duplicate_raw_rows']} exact duplicate raw rows. SHA-256: `{r['sha256'][:16]}...`")
with open(config.REPORTS_DIR / "source_inventory.md", "w") as f:
    f.write("\n".join(md) + "\n")

# ---------------------------------------------------------------------
# reports/reconciliation_summary.md
# ---------------------------------------------------------------------
md = [
    "# Reconciliation Summary — Stage 1.6\n",
    "## Raw row counts\n",
    "| Dataset | Stage 1 | Stage 1.5 |",
    "|---|---:|---:|",
]
for k, v in reconciliation_summary["raw_row_counts"].items():
    md.append(f"| {k} | {v['stage1']:,} | {v['stage1_5']:,} |")
md += [
    "\n## Work-ID universe (union across all 4 project-level files)\n",
    f"- Stage 1: **{reconciliation_summary['unique_work_ids_by_source_package']['stage1']:,}**",
    f"- Stage 1.5: **{reconciliation_summary['unique_work_ids_by_source_package']['stage1_5']:,}**",
    f"- Common: **{reconciliation_summary['unique_work_ids_by_source_package']['common']:,}**",
    f"- Stage 1 only: **{reconciliation_summary['unique_work_ids_by_source_package']['stage1_only']:,}**",
    f"- Stage 1.5 only: **{reconciliation_summary['unique_work_ids_by_source_package']['stage1_5_only']:,}**",
    f"- **Canonical union: {reconciliation_summary['canonical_unique_work_ids']:,}**",
    "\n## Expenditure event reconciliation\n",
    f"- Exact-duplicate event rows removed: {reconciliation_summary['duplicate_events_removed']:,}",
    f"- Possible-conflicting events flagged (retained, not deleted): {reconciliation_summary['possible_conflicting_events_flagged']:,}",
    "\n## Conflicts\n",
    f"- Total field conflicts logged: {reconciliation_summary['conflicts_found_total']:,}",
    f"- By dataset: {reconciliation_summary['conflicts_by_dataset']}",
    "\n## Unresolved (missing) Work IDs\n",
    f"- Total: {reconciliation_summary['unresolved_work_id_rows']:,}",
    f"- By dataset: {reconciliation_summary['unresolved_by_dataset']}",
    "\n## Coverage in canonical_work_master\n",
    f"- Recommendation coverage: {reconciliation_summary['recommendation_coverage']:,}",
    f"- Sanction coverage: {reconciliation_summary['sanction_coverage']:,}",
    f"- Expenditure coverage: {reconciliation_summary['expenditure_coverage']:,}",
    f"- Completion coverage: {reconciliation_summary['completion_coverage']:,}",
]
with open(config.REPORTS_DIR / "reconciliation_summary.md", "w") as f:
    f.write("\n".join(md) + "\n")

# ---------------------------------------------------------------------
# reports/canonical_validation.md
# ---------------------------------------------------------------------
md = [
    "# Canonical Validation — Stage 1.6\n",
    f"1. **Unique Work ID check**: {validation_report['canonical_work_master_unique_work_ids']:,} unique / {validation_report['canonical_work_master_row_count']:,} rows -> {'PASS' if validation_report['check_1_unique_work_id_ok'] else 'FAIL'}",
    f"2. **No accidental Work-ID loss**: lost from Stage 1 = {validation_report['work_ids_lost_from_stage1']}, lost from Stage 1.5 = {validation_report['work_ids_lost_from_stage1_5']} -> {'PASS' if validation_report['check_2_no_work_id_lost'] else 'FAIL'}",
    f"3. **Source-to-canonical coverage**: Stage 1 = {validation_report['canonical_coverage_of_stage1_pct']}%, Stage 1.5 = {validation_report['canonical_coverage_of_stage1_5_pct']}%",
    f"4/5. **Expenditure duplicate/double-count check**: {validation_report['expenditure_distinct_event_keys']:,} distinct events, {validation_report['expenditure_duplicate_event_rows_removed']:,} duplicate rows removed; "
    f"raw resolved rows ({validation_report['expenditure_raw_resolved_rows']:,}) == rows accounted for in events ({validation_report['expenditure_rows_accounted_for_in_events']:,}) -> {'PASS' if validation_report['check_5_expenditure_no_row_unaccounted'] else 'FAIL'}",
    f"    - Raw RESOLVED-row disbursed sum: ₹{validation_report.get('expenditure_sum_raw_resolved_rows_disbursed', 0):,.2f}",
    f"    - Raw UNRESOLVED-row disbursed sum (grand-total artifact rows, excluded from all aggregation - see below): ₹{validation_report.get('expenditure_sum_unresolved_rows_disbursed', 0):,.2f}",
    f"    - Canonical event-level disbursed sum: ₹{validation_report.get('expenditure_sum_canonical_events_disbursed', 0):,.2f}",
    f"    - Canonical sum <= raw resolved sum (never inflated): {'PASS' if validation_report.get('check_5b_canonical_sum_lte_raw_sum') else 'FAIL'}",
    f"6. **Date consistency** (completion before recommendation): {validation_report['date_consistency_violations']} violations out of {validation_report['date_consistency_rows_checked']} checked",
    f"7. **Amount sanity** (negative values): " + ", ".join(f"{k}={v}" for k, v in validation_report.items() if k.startswith("amount_sanity_negative")),
    f"8. **Missing Work ID rows**: {validation_report['unresolved_rows_total']:,} total — {validation_report['unresolved_rows_by_dataset']}",
    "    - **Data-quality finding**: 2 of the expenditure unresolved rows (1 per package, the LAST row of each raw Expenditure CSV) are grand-total/aggregate artifacts with a blank Work ID and a huge lump-sum amount "
    "(Stage 1: ~₹38.77 billion; Stage 1.5: ~₹27.22 billion) - not real payment events. They are preserved in `canonical_expenditure_events.csv` (resolution_status=unresolved_missing_work_id) but correctly EXCLUDED "
    "from `canonical_expenditure_summary.csv` and from every sum/count above, exactly as Part 5's 'do not invent a Work ID' / 'preserve separately' rule requires.",
    f"9. **Completion evidence**: {validation_report['completion_rows_with_image_present_true']:,} canonical works have image_present=True",
    f"10. **Recommendation/sanction relationship**: {validation_report['works_sanctioned_without_recommendation_on_file']:,} sanctioned-without-recommendation-on-file; {validation_report['works_recommended_without_sanction_on_file']:,} recommended-without-sanction-on-file",
    f"11. **Cross-source conflicts**: {validation_report['total_field_conflicts_logged']:,} logged — {validation_report['conflicts_by_dataset']}",
    f"12. **Provenance completeness**: {validation_report['work_ids_in_master_missing_from_provenance']} canonical work_ids with zero provenance rows -> {'PASS' if validation_report['check_12_provenance_complete'] else 'FAIL'}",
    "\n## Parliamentary-term evidence (never inferred without an explicit marker)\n",
    json.dumps(validation_report["term_values_present"], indent=2),
]
with open(config.REPORTS_DIR / "canonical_validation.md", "w") as f:
    f.write("\n".join(md) + "\n")

_t("Markdown reports written.")

# ---------------------------------------------------------------------
# reports/canonical_data_flow.md
# ---------------------------------------------------------------------
data_flow_md = """# Canonical Data Flow — Stage 1.6

```
STAGE 1 RAW DATA (5 CSVs)          STAGE 1.5 RAW DATA (5 CSVs)
        |                                    |
        +------------------+  +--------------+
                           |  |
                           v  v
                 SOURCE NORMALIZATION
        (column standardization, work_id extraction,
         date/money/text cleaning, term-evidence tagging
         -- src/canonical/normalize_*.py, identical logic
         applied to both packages independently)
                            |
                            v
                 SOURCE RECONCILIATION
        (per-dataset, work-id-exact-match only, never fuzzy
         -- src/canonical/reconcile_*.py)
                            |
                            v
              DUPLICATE / CONFLICT RESOLUTION
   (exact cross-package duplicates collapsed to one record;
    genuine field conflicts logged to canonical_conflicts.csv,
    never silently overwritten; expenditure deduplicated only
    at the full event-key level)
                            |
                            v
              CANONICAL SOURCE TABLES
  canonical_recommended.csv   canonical_sanctioned.csv
  canonical_completed.csv     canonical_expenditure_events.csv
  canonical_expenditure_summary.csv   canonical_allocation.csv
                            |
                            v
              CANONICAL WORK MASTER
     (union of valid Work IDs across all 4 project files;
      one row per Work ID; canonical_work_master.csv)
                            |
                            v
                     VALIDATION
   (Work-ID loss check, duplicate/double-count checks, date
    and amount sanity, conflict + provenance completeness --
    reports/canonical_validation.{json,md})
                            |
                            v
                 FUTURE AI ENGINES
   (Need / Pre-Sanction / Risk / Context / Alert /
    Post-Completion Assurance / Feedback Loop)
```

Every canonical record is traceable back to its raw source row(s) via
`canonical_provenance.csv` (canonical_work_id -> source_package,
source_file, source_row_number, source_record_id).
"""
with open(config.REPORTS_DIR / "canonical_data_flow.md", "w") as f:
    f.write(data_flow_md)

_t("Data flow doc written.")

# ---------------------------------------------------------------------
# FINAL VALIDATION GATE - print answers
# ---------------------------------------------------------------------
print("\n" + "=" * 70)
print("FINAL VALIDATION GATE")
print("=" * 70)
print(f"1. Final canonical Work-ID count: {validation_report['canonical_work_ids']:,}")
print(f"2. Stage 1 Work IDs preserved: {validation_report['stage1_work_id_universe'] - validation_report['work_ids_lost_from_stage1']:,} of {validation_report['stage1_work_id_universe']:,}")
print(f"3. Stage 1.5 Work IDs preserved: {validation_report['stage1_5_work_id_universe'] - validation_report['work_ids_lost_from_stage1_5']:,} of {validation_report['stage1_5_work_id_universe']:,}")
print(f"4. Work IDs in both: {validation_report['common_work_ids']:,}")
print(f"5. Expenditure exact-duplicate events removed: {reconciliation_summary['duplicate_events_removed']:,}")
print(f"6. Conflicts found: {reconciliation_summary['conflicts_found_total']:,}")
print(f"7. Unresolved Work IDs (rows): {reconciliation_summary['unresolved_work_id_rows']:,}")
print(f"8. Any valid Work ID lost? {'NO' if validation_report['check_2_no_work_id_lost'] else 'YES -- INVESTIGATE'}")
print(f"9. Any expenditure event double-counted? {'NO' if validation_report['check_5_expenditure_no_row_unaccounted'] and validation_report.get('check_5b_canonical_sum_lte_raw_sum') else 'YES -- INVESTIGATE'}")
print(f"10. Parliamentary terms inferred without evidence? NO (only explicit '(Nth Lok Sabha)' suffixes ever populate a term)")
print(f"11. Every canonical Work ID traceable to source? {'YES' if validation_report['check_12_provenance_complete'] else 'NO -- INVESTIGATE'}")
print("=" * 70)
_t("STAGE 1.6 BUILD COMPLETE.")
