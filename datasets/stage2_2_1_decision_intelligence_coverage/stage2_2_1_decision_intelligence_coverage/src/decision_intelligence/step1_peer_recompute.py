import sys, os
import numpy as np
import pandas as pd

BASE = '/home/claude/work'
CANON = f'{BASE}/stage1_6/stage1_6_canonical'
STAGE2 = f'{BASE}/stage2_1_1/stage2_1_1_output'

sys.path.insert(0, STAGE2)
from src.risk.peer_benchmark import _peer_assignment_for_metric
from src.risk.config import PEER_HIERARCHY, PEER_MIN_GROUP_SIZE
from src.risk.utils import robust_z_scores, percentile_rank

print("Imports OK. PEER_HIERARCHY:", PEER_HIERARCHY, "MIN_GROUP_SIZE:", PEER_MIN_GROUP_SIZE)

rf = pd.read_csv(f'{STAGE2}/risk_features.csv')
print("risk_features rows:", len(rf), "unique work_id:", rf.work_id.is_unique)

METRICS = [
    ("recommended_amount", "recommended_amount"),
    ("sanction_amount", "sanction_amount"),
    ("total_expenditure", "expenditure"),
    ("payment_event_count", "payment_event"),
    ("days_sanction_to_completion", "duration"),
    ("days_recommendation_to_sanction", "rec_sanction_duration"),
    ("expenditure_to_sanction_ratio", "exp_sanction_ratio"),
]

peer_extra = pd.DataFrame(index=rf.index)

for col, prefix in METRICS:
    peer_key, peer_level = _peer_assignment_for_metric(rf, col)
    med = pd.Series(np.nan, index=rf.index)
    mean = pd.Series(np.nan, index=rf.index)
    pct_check = pd.Series(np.nan, index=rf.index)
    z_check = pd.Series(np.nan, index=rf.index)
    for key, idx in rf.groupby(peer_key).groups.items():
        sub = rf.loc[idx, col]
        med.loc[idx] = sub.median()
        mean.loc[idx] = sub.mean()
        pct_check.loc[idx] = percentile_rank(sub)
        z_check.loc[idx] = robust_z_scores(sub)

    stored_level = rf[f'{prefix}_peer_level_used']
    level_mismatch = (peer_level.fillna('NA').astype(str) != stored_level.fillna('NA').astype(str)).sum()

    stored_pct = rf[f'{prefix}_percentile_in_peer_group']
    pct_diff = (pct_check - stored_pct).abs()
    pct_mismatch = (pct_diff > 1e-9).sum()

    stored_z = rf[f'{prefix}_robust_z_in_peer_group']
    z_diff = (z_check - stored_z).abs()
    z_mismatch = ((z_diff > 1e-9) & z_check.notna() & stored_z.notna()).sum()

    # cross-check median via the deviation formula on rows where deviation is present and median>0
    stored_dev = rf[f'{prefix}_deviation_from_peer_median']
    valid = stored_dev.notna() & (med > 0)
    implied_val_check = (rf.loc[valid, col] - med.loc[valid]) / med.loc[valid]
    dev_diff = (implied_val_check - stored_dev.loc[valid]).abs()
    dev_mismatch = (dev_diff > 1e-6).sum()

    print(f"{prefix}: level_mismatch={level_mismatch}, pct_mismatch={pct_mismatch}, "
          f"z_mismatch={z_mismatch}, dev_formula_mismatch={dev_mismatch}/{valid.sum()}, "
          f"n_with_median={med.notna().sum()}")

    peer_extra[f'{prefix}_peer_median'] = med
    peer_extra[f'{prefix}_peer_mean'] = mean

peer_extra.insert(0, 'work_id', rf['work_id'])
peer_extra.to_csv(f'{BASE}/peer_extra.csv', index=False)
print("Saved peer_extra.csv", peer_extra.shape)
