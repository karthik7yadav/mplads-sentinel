# Stage 2 Risk Engine -- Validation Report

1. **risk features one row per work id**: PASS -- 72675 rows, unique work_id=True
2. **risk scores one row per work id**: PASS -- 72675 rows, unique work_id=True
3. **no duplicate work ids**: PASS -- features/scores/explanations all unique: True
4. **risk scores in 0 100**: PASS -- pre_sanction_risk: min=0.0, max=61.642857142857146; in_progress_risk: min=2.5, max=96.25; post_completion_risk: min=4.214285714285714, max=95.0; overall_risk: min=4.214285714285714, max=96.25
5. **no division by zero inf values**: PASS -- any +/-inf in risk_features numeric columns: False
6. **no negative financial values**: PASS -- negative-value counts: {'recommended_amount': 0, 'sanction_amount': 0, 'total_expenditure': 0, 'completion_amount_disbursed': 0}
7. **missing data handled explicitly**: PASS -- every *_present / *_missing pair is a perfect logical complement
8. **isolation forest reproducible**: PASS -- random_state recorded for modes: ['PRE_SANCTION', 'IN_PROGRESS', 'POST_COMPLETION']
9. **no target leakage**: PASS -- leaked columns found: []
10. **no temporal leakage**: PASS -- PRE_SANCTION: 0 disallowed model columns ([]); IN_PROGRESS: 0 disallowed model columns ([]); POST_COMPLETION: 0 disallowed model columns ([]); PRE_SANCTION: training rows 913/913 current-stage rows; IN_PROGRESS: training rows 37892/37892 current-stage rows; POST_COMPLETION: training rows 33870/33870 current-stage rows; missing stage-stat columns=[]
11. **rule signals traceable**: PASS -- 0 signals missing source_fields
12. **risk explanations traceable**: PASS -- 0 explanations have a top_reason but no evidence_fields
13. **expenditure conflicts preserved**: PASS -- canonical conflict work_ids: 978, all present in risk_features conflict flag: True
14. **allocation not work level budget**: PASS -- allocation-derived columns beyond allocation_available: []
15. **parliamentary terms not inferred**: PASS -- term-related columns beyond term_unknown_indicator: []
16. **scores not labeled fraud probability**: PASS -- banned fraud-probability phrasing found: []
17. **data quality never dominates**: PASS -- data-quality contribution exceeding cap in 0 rows (should be 0, capped by construction)
18. **rule signals temporally safe**: PASS -- bad stage-rule signals: 0
19. **peer group minimum integrity**: PASS -- assigned non-null peer groups below 20: 0; assigned rows with missing metric values: 0
20. **explanations cover positive score components**: PASS -- missing component reasons: 0; unexpected component reasons: 0

## Overall: STAGE 2 PASSES