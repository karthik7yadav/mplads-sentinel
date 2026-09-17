# Reconciliation Summary — Stage 1.6

## Raw row counts

| Dataset | Stage 1 | Stage 1.5 |
|---|---:|---:|
| recommended | 8,001 | 20,001 |
| sanctioned | 7,001 | 25,001 |
| expenditure | 23,001 | 33,001 |
| completed | 33,871 | 20,001 |
| allocation | 544 | 544 |

## Work-ID universe (union across all 4 project-level files)

- Stage 1: **54,900**
- Stage 1.5: **46,616**
- Common: **28,841**
- Stage 1 only: **26,059**
- Stage 1.5 only: **17,775**
- **Canonical union: 72,675**

## Expenditure event reconciliation

- Exact-duplicate event rows removed: 829
- Possible-conflicting events flagged (retained, not deleted): 3,510

## Conflicts

- Total field conflicts logged: 3,510
- By dataset: {'expenditure_event': 3510}

## Unresolved (missing) Work IDs

- Total: 759
- By dataset: {'recommended': 753, 'sanctioned': 2, 'completed': 2, 'expenditure': 2}

## Coverage in canonical_work_master

- Recommendation coverage: 27,249
- Sanction coverage: 32,000
- Expenditure coverage: 35,984
- Completion coverage: 33,870
