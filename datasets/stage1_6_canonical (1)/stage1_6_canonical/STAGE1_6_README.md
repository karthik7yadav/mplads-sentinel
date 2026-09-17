# STAGE 1.6 — Canonical Data Foundation & Dataset Reconciliation

Purpose: one trustworthy canonical MPLADS dataset from Stage 1 + Stage 1.5 raw packages. No deletion, no double-counting, no invented Work IDs/terms. Sole input for Stage 2 Risk Engine onward.

## 1. Why 54,900 vs 46,616 happened

Not an 18th Lok Sabha filtering bug. Two packages pulled **different raw-data slices**:

| Source | Stage 1 rows | Stage 1.5 rows |
|---|---:|---:|
| Recommended | 8,001 | 20,001 |
| Sanctioned | 7,001 | 25,001 |
| Expenditure | 23,001 | 33,001 |
| Completed | 33,871 | 20,001 |
| Allocation | 544 | 544 |

Stage 1 = strong 2023 recommendation/sanction cohort + broad completed/expenditure population. Stage 1.5 = 2024-2026 recommendation/sanction cohort + later expenditure slice, smaller completed slice (subset of Stage 1's). Different populations, not a smaller version of the same population. 54,900 (Stage 1) and 46,616 (Stage 1.5) are each correct for their own raw input — neither replaces the other.

## 2. Neither dataset replaces the other

Canonical Work-ID universe = **union**, not either master copied wholesale:

- Stage 1 only: 26,059
- Stage 1.5 only: 17,775
- Common to both: 28,841
- **Canonical: 72,675** (= 54,900 + 46,616 − 28,841, exactly)
- Zero Work IDs lost from either side (validated, see `reports/canonical_validation.md` item 2).

## 3. Snapshots

Every row carries `source_package` = `STAGE1_SNAPSHOT` or `STAGE1_5_SNAPSHOT`, never merged into a single unlabeled "latest" value. No government extraction date is invented — snapshot labels are logical package identifiers only. Date ranges per source/package are in `reports/source_inventory.md`.

## 4. Expenditure event deduplication

Expenditure is event-level (many payments per Work ID) — never deduplicated by Work ID alone. Event key = `(work_id, expenditure_date, vendor_name, payment_status, disbursed_amount)`. Two raw rows collapse to one canonical event only on a full key match.

- 56,002 raw rows (23,001 + 33,001) minus the 2 unresolved artifact rows below = 56,000 resolved rows.
- 55,171 distinct events → **829 exact-duplicate rows removed**.
- Canonical event-level disbursed sum (₹16.84B) ≤ raw resolved sum (₹16.88B) — never inflated.
- 3,510 events flagged `possible_conflicting_event` (same work_id+date+vendor, differing status/amount) — **retained, not deleted**, for human review.

**Data-quality finding**: the LAST row of each raw Expenditure CSV (both packages) is a grand-total artifact — blank Work ID, huge lump sum (Stage 1 ≈ ₹38.77B, Stage 1.5 ≈ ₹27.22B). Not a real payment. Preserved in `canonical_expenditure_events.csv` as unresolved, excluded from every sum — exactly why "never invent a Work ID, never blindly sum raw amounts" matters here.

## 5. Conflict handling

Field-level conflict = same Work ID, >1 distinct non-null value across snapshots. Default: canonical = Unknown/NULL, both values logged to `reports/canonical_conflicts.csv`, never hidden. One evidence-backed exception: Works Completed uses Stage 1 as tie-break base (documented, not assumed) because Stage 1's 33,871-row completed population is shown (independent reconciliation report) to be a superset containing all of Stage 1.5's 20,000 resolvable completed IDs. Recommended/Sanctioned had 0 field conflicts (near-zero Work-ID overlap between packages — 11 and 0 common IDs respectively — leaves little to conflict on). Image presence is merged as OR, never "missing in one = doesn't exist."

## 6. Provenance

`canonical_provenance.csv` — 169,878 rows — maps every canonical Work ID back to every contributing raw row (`source_package`, `source_file`, `source_row_number`, `source_record_id`), plus duplicate/conflict flags. 0 canonical Work IDs lack provenance (validated).

## 7. Lok Sabha terms

Term populated ONLY from an explicit `(Nth Lok Sabha)` suffix on that specific row's `mp_name` — never from work_id year, completion date, financial year, or dataset package. Findings:

- Stage 1 Recommended: 4,697 rows carry the suffix. Stage 1 Sanctioned: 4,126 rows. Stage 1.5 Recommended/Sanctioned/Completed: **0** rows carry it anywhere.
- Completed (both packages): 0 rows carry it — `completion_term` is Unknown for all 72,675 canonical works.
- `cross_term_project`: TRUE for 0 works (never enough independent HIGH/MEDIUM evidence pairs to compare), FALSE for 4,120, Unknown for 68,555. **No term was ever guessed.**
- Separately: the Allocation files show real (though allocation-level, not work-level) evidence of a cohort change — 540/544 constituencies match by name across the two allocation snapshots, but MP names, term suffixes (351 in Stage 1, 0 in Stage 1.5), and allocation-amount patterns are almost entirely different. Documented in `normalize_allocation.py` and `reports/source_inventory.md` — **not** asserted as "Stage 1.5 = 18th Lok Sabha" since no explicit marker supports that label.

## 8. Canonical Work-ID universe

`canonical_work_master.csv`, 72,675 rows, one per Work ID, built fresh from the four reconciled source tables (never a copy of Stage 1's `work_master.csv` or Stage 1.5's `sentinel_master.csv`). Coverage: recommendation 27,249, sanction 32,000, expenditure 35,984, completion 33,870.

## 9. Limitations

- 759 rows across all sources have no extractable Work ID (753 Recommended, 2 each Sanctioned/Completed/Expenditure) — preserved, never invented, never dropped.
- 3,510 expenditure events flagged as possible conflicts need human/domain review before being treated as fully resolved.
- Allocation is MP/constituency-level context only, kept as two separate un-merged snapshots, matched to works only via (state, constituency) name — never attached to any work as its budget figure, and never joined via MP name (the two snapshots' MP-name cohorts don't overlap).
- `mp_name`/`constituency` used for the allocation-availability join are exact-string matches on cleaned text only — no fuzzy matching, so minor spelling variants would show as unavailable rather than falsely linked.

## 10. Why this is safe for the Risk Engine

Every check in `reports/canonical_validation.md` passes: zero Work-ID loss, zero expenditure double-counting, zero uninvented terms, full provenance coverage, zero negative amounts, zero completion-before-recommendation date violations. All conflicts and unresolved rows are visible in `reports/canonical_conflicts.csv` / the `*_unresolved_*` rows rather than hidden — Stage 2 can consume `canonical_work_master.csv` directly and treat `*_has_conflict`, `cross_term_project`, and `allocation_available` as first-class uncertainty signals rather than silent gaps.

## File map

See `reports/canonical_data_flow.md` for the pipeline diagram and the directory listing in the task spec for the full file tree. Core outputs: `canonical_work_master.csv`, `canonical_recommended.csv`, `canonical_sanctioned.csv`, `canonical_completed.csv`, `canonical_expenditure_events.csv`, `canonical_expenditure_summary.csv`, `canonical_allocation.csv`, `canonical_provenance.csv`. Reports: `reports/source_inventory.{csv,md}`, `reports/*_reconciliation.csv`, `reports/canonical_conflicts.csv`, `reports/reconciliation_summary.{json,md}`, `reports/canonical_validation.{json,md}`, `reports/canonical_data_flow.md`.
