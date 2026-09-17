"""
Stage 2.2 -- MPLADS Sentinel: Decision Intelligence / Human-Readable
Explanation Layer.

Builds decision_intelligence.csv (one row per canonical Work ID, 72,675
rows) on top of the frozen, verified Stage 2.1.1 risk engine outputs.
Does NOT retrain, re-weight, or otherwise change anything the risk engine
computed -- overall_risk, risk_band, lifecycle_mode, component scores, and
component contributions are carried through unchanged. This script only
translates those already-computed signals into human-readable, evidence-
traceable explanations, using the actual Stage 2.1.1 peer-benchmarking
methodology (imported directly from its source, not reinvented).
"""

import sys
import json
import numpy as np
import pandas as pd

BASE = '/home/claude/work'
CANON = f'{BASE}/stage1_6/stage1_6_canonical'
STAGE2 = f'{BASE}/stage2_1_1/stage2_1_1_output'
OUT = f'{BASE}/output'

sys.path.insert(0, STAGE2)
from src.risk.rules import RULE_MODE_ELIGIBILITY, RULE_DEFINITIONS, SEVERITY_WEIGHT
from src.risk.risk_scoring import PEER_METRICS_BY_STAGE, DQ_SIGNALS_BY_STAGE
from src.risk.config import RISK_COMPONENT_WEIGHTS, DATA_QUALITY_COMPONENT_CAP, PEER_MIN_GROUP_SIZE
from src.risk.anomaly_detection import STATISTICAL_ANOMALY_FEATURES_BY_MODE

EXPECTED_WORK_ID_COUNT = 72675

# ---------------------------------------------------------------------------
# LOAD
# ---------------------------------------------------------------------------
print("Loading source data...")
wm = pd.read_csv(f'{CANON}/canonical_work_master.csv')
rf = pd.read_csv(f'{STAGE2}/risk_features.csv')
rs = pd.read_csv(f'{STAGE2}/risk_scores.csv')
rex = pd.read_csv(f'{STAGE2}/risk_explanations.csv')
sig = pd.read_csv(f'{STAGE2}/risk_signals.csv')
peer_extra = pd.read_csv(f'{BASE}/peer_extra.csv')

for name, df in [('work_master', wm), ('risk_features', rf), ('risk_scores', rs), ('risk_explanations', rex)]:
    assert len(df) == EXPECTED_WORK_ID_COUNT, f"{name} has {len(df)} rows, expected {EXPECTED_WORK_ID_COUNT}"
    assert df['work_id'].is_unique, f"{name} has duplicate work_id"

assert set(wm.work_id) == set(rf.work_id) == set(rs.work_id) == set(rex.work_id) == set(peer_extra.work_id), \
    "Work ID sets differ across source files"
print("Row-count / uniqueness / Work-ID-set checks: PASS")

# ---------------------------------------------------------------------------
# INDEX EVERYTHING BY work_id FOR SAFE ALIGNMENT
# ---------------------------------------------------------------------------
wm_i = wm.set_index('work_id', drop=False)
rf_i = rf.set_index('work_id', drop=False)
rs_i = rs.set_index('work_id', drop=False)
rex_i = rex.set_index('work_id', drop=False)
peer_i = peer_extra.set_index('work_id', drop=False)

work_ids = wm_i.index

# risk_mode must agree between risk_features and risk_scores
mode_mismatch = (rf_i.loc[work_ids, 'risk_mode'] != rs_i.loc[work_ids, 'risk_mode']).sum()
assert mode_mismatch == 0, f"{mode_mismatch} works have mismatched risk_mode between risk_features and risk_scores"
print("risk_mode agreement between risk_features and risk_scores: PASS")

# ---------------------------------------------------------------------------
# TOP ELIGIBLE SIGNAL PER WORK (mirrors explainability.py's own sort, so we
# can recover signal_id / signal_type / signal_value / threshold for the
# work's #1 reason -- risk_explanations.csv only stores the rendered text).
# ---------------------------------------------------------------------------
print("Rebuilding top-signal-per-work index (mirrors explainability.py sort order)...")
current_mode = rs_i[['work_id', 'risk_mode']].reset_index(drop=True).rename(columns={'risk_mode': 'current_risk_mode'})
sig2 = sig.merge(current_mode, on='work_id', how='left')
# sig2's own 'risk_mode' column (from risk_signals.csv) records the mode the
# signal was generated under; cross-check it always agrees with the work's
# current mode (it always should -- signals are generated at current state).
mode_disagree = (sig2['risk_mode'] != sig2['current_risk_mode']).sum()
assert mode_disagree == 0, f"{mode_disagree} signal rows disagree with the work's current risk_mode"
sig2['mode_eligible'] = [
    rid in RULE_MODE_ELIGIBILITY and mode in RULE_MODE_ELIGIBILITY[rid]
    for rid, mode in zip(sig2['signal_id'], sig2['current_risk_mode'])
]
sig2 = sig2[sig2['mode_eligible']].copy()
SEVERITY_RANK = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
sig2['_rank'] = sig2['severity'].map(SEVERITY_RANK).fillna(0)
sig2 = sig2.sort_values(['work_id', '_rank', 'signal_id'], ascending=[True, False, True], kind='mergesort')
sig2['_pos'] = sig2.groupby('work_id').cumcount()
top_signal = sig2[sig2['_pos'] == 0].set_index('work_id')

# Cross-check: our recomputed top signal's explanation text must match
# risk_explanations.csv's top_reason_1 for every work that has one.
joined_check = rex_i[['top_reason_1']].join(top_signal[['explanation']], how='left', rsuffix='_ours')
has_reason = joined_check['top_reason_1'].fillna('') != ''
has_ours = joined_check['explanation'].fillna('') != ''
assert (has_reason == has_ours).all(), "Presence of top_reason_1 vs. recomputed top signal disagrees for some works"
text_mismatch = (joined_check.loc[has_reason, 'top_reason_1'] != joined_check.loc[has_reason, 'explanation']).sum()
print(f"Top-signal recomputation cross-check vs. risk_explanations.top_reason_1: "
      f"{text_mismatch} mismatches out of {has_reason.sum()} works with a rule signal")
assert text_mismatch == 0, "Recomputed top signal text does not match risk_explanations.csv"
print("Top-signal recomputation: PASS (exact match)")

print("Setup complete.")
print(json.dumps({
    "work_ids": int(len(work_ids)),
    "works_with_eligible_signal": int(len(top_signal)),
    "risk_mode_counts": rf_i['risk_mode'].value_counts().to_dict(),
}, indent=2, default=str))
