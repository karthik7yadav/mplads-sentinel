# Canonical Validation — Stage 1.6

1. **Unique Work ID check**: 72,675 unique / 72,675 rows -> PASS
2. **No accidental Work-ID loss**: lost from Stage 1 = 0, lost from Stage 1.5 = 0 -> PASS
3. **Source-to-canonical coverage**: Stage 1 = 100.0%, Stage 1.5 = 100.0%
4/5. **Expenditure duplicate/double-count check**: 55,171 distinct events, 829 duplicate rows removed; raw resolved rows (56,000) == rows accounted for in events (56,000) -> PASS
    - Raw RESOLVED-row disbursed sum: ₹16,883,499,524.56
    - Raw UNRESOLVED-row disbursed sum (grand-total artifact rows, excluded from all aggregation - see below): ₹65,992,184,505.18
    - Canonical event-level disbursed sum: ₹16,840,555,608.56
    - Canonical sum <= raw resolved sum (never inflated): PASS
6. **Date consistency** (completion before recommendation): 0 violations out of 13424 checked
7. **Amount sanity** (negative values): amount_sanity_negative_recommended_amount=0, amount_sanity_negative_sanction_amount=0, amount_sanity_negative_total_expenditure=0, amount_sanity_negative_completion_amount_disbursed=0
8. **Missing Work ID rows**: 759 total — {'recommended': 753, 'sanctioned': 2, 'completed': 2, 'expenditure': 2}
    - **Data-quality finding**: 2 of the expenditure unresolved rows (1 per package, the LAST row of each raw Expenditure CSV) are grand-total/aggregate artifacts with a blank Work ID and a huge lump-sum amount (Stage 1: ~₹38.77 billion; Stage 1.5: ~₹27.22 billion) - not real payment events. They are preserved in `canonical_expenditure_events.csv` (resolution_status=unresolved_missing_work_id) but correctly EXCLUDED from `canonical_expenditure_summary.csv` and from every sum/count above, exactly as Part 5's 'do not invent a Work ID' / 'preserve separately' rule requires.
9. **Completion evidence**: 24,567 canonical works have image_present=True
10. **Recommendation/sanction relationship**: 5,693 sanctioned-without-recommendation-on-file; 942 recommended-without-sanction-on-file
11. **Cross-source conflicts**: 3,510 logged — {'expenditure_event': 3510}
12. **Provenance completeness**: 0 canonical work_ids with zero provenance rows -> PASS

## Parliamentary-term evidence (never inferred without an explicit marker)

{
  "recommendation_term_non_unknown": 4687,
  "sanction_term_non_unknown": 4126,
  "completion_term_non_unknown": 0,
  "cross_term_project_true": 0,
  "cross_term_project_false": 4120,
  "cross_term_project_unknown": 68555
}
