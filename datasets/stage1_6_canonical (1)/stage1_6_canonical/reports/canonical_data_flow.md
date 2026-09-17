# Canonical Data Flow — Stage 1.6

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
