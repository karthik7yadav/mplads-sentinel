"""
Part 3 -- Peer Benchmarking

Answers: "Is this work unusual compared with similar MPLADS works?"

Peer hierarchy (most specific first), falling back whenever a group is
smaller than PEER_MIN_GROUP_SIZE:

    LEVEL 2: work_category + state + constituency
    LEVEL 1: work_category + state
    LEVEL 0: work_category
    GLOBAL:  all works

Works with no work_category/state at all (no recommended/sanctioned/
completed record on file -- see canonical_work_master limitations) fall
straight to the GLOBAL peer group; this is recorded in peer_level_used so
the fallback is never silent.
"""

import numpy as np
import pandas as pd

from .config import PEER_HIERARCHY, PEER_MIN_GROUP_SIZE
from .utils import robust_z_scores, percentile_rank


def _assign_peer_group(df: pd.DataFrame, group_cols: tuple) -> pd.Series:
    if not group_cols:
        return pd.Series("GLOBAL", index=df.index)
    cols = [df[c].fillna("__MISSING__").astype(str) for c in group_cols]
    key = cols[0]
    for c in cols[1:]:
        key = key + "||" + c
    return key


def _peer_assignment_for_metric(df: pd.DataFrame, value_col: str) -> pd.Series:
    """
    For each row, pick the most specific peer-group level with at least
    PEER_MIN_GROUP_SIZE rows that have a *non-null* value_col, falling
    back toward GLOBAL otherwise. Returns a Series of peer-group keys
    (level-prefixed, so two different levels never collide), aligned to
    df.index.
    """
    has_value = df[value_col].notna()
    peer_key = pd.Series(index=df.index, dtype=object)
    peer_level = pd.Series(index=df.index, dtype=object)
    remaining = pd.Series(True, index=df.index)

    for level_idx, group_cols in enumerate(PEER_HIERARCHY):
        if not remaining.any():
            break
        level_name = f"L{len(group_cols)}_{'_'.join(group_cols) if group_cols else 'GLOBAL'}"
        raw_key = _assign_peer_group(df, group_cols)

        # IMPORTANT: eligibility is evaluated on the rows that are still
        # unassigned at this hierarchy level, not on the full population.
        # Otherwise rows assigned at a more-specific level are counted when
        # deciding whether a broader group is large enough, but are then
        # excluded from the actual benchmark group. That produced peer groups
        # smaller than PEER_MIN_GROUP_SIZE while claiming a trusted fallback.
        comparison_mask = remaining & has_value
        sizes = raw_key[comparison_mask].value_counts()

        if group_cols:
            eligible_groups = set(sizes[sizes >= PEER_MIN_GROUP_SIZE].index)
        else:
            # GLOBAL is still subject to the same minimum-size requirement.
            # If fewer than PEER_MIN_GROUP_SIZE rows remain unassigned with
            # a value, there is no statistically trusted peer group left; the
            # metric remains unbenchmarked rather than comparing against a
            # tiny residual group.
            eligible_groups = set(sizes[sizes >= PEER_MIN_GROUP_SIZE].index)

        newly_assigned = remaining & has_value & raw_key.isin(eligible_groups)
        peer_key.loc[newly_assigned] = level_name + "::" + raw_key.loc[newly_assigned]
        peer_level.loc[newly_assigned] = level_name
        remaining &= ~newly_assigned

    return peer_key, peer_level


def compute_peer_benchmark(df: pd.DataFrame, value_col: str, prefix: str) -> pd.DataFrame:
    """
    Computes, for one numeric column, peer-relative percentile, robust
    z-score, deviation-from-peer-median, peer group size, and peer level
    used -- all using the fallback hierarchy above.
    """
    out = pd.DataFrame(index=df.index)
    peer_key, peer_level = _peer_assignment_for_metric(df, value_col)

    percentile = pd.Series(np.nan, index=df.index)
    robust_z = pd.Series(np.nan, index=df.index)
    deviation = pd.Series(np.nan, index=df.index)
    group_size = pd.Series(np.nan, index=df.index)
    group_median = pd.Series(np.nan, index=df.index)

    for key, idx in df.groupby(peer_key).groups.items():
        sub = df.loc[idx, value_col]
        n_with_value = sub.notna().sum()
        percentile.loc[idx] = percentile_rank(sub)
        robust_z.loc[idx] = robust_z_scores(sub)
        med = sub.median()
        group_median.loc[idx] = med
        if pd.notna(med) and med != 0:
            deviation.loc[idx] = (sub - med) / abs(med)
        group_size.loc[idx] = n_with_value

    out[f"{prefix}_percentile_in_peer_group"] = percentile
    out[f"{prefix}_robust_z_in_peer_group"] = robust_z
    out[f"{prefix}_deviation_from_peer_median"] = deviation
    out[f"{prefix}_peer_group_size"] = group_size
    out[f"{prefix}_peer_level_used"] = peer_level

    return out


def add_peer_benchmarks(features: pd.DataFrame) -> pd.DataFrame:
    """
    Adds peer benchmark columns for: recommended_amount, sanction_amount,
    total_expenditure, payment_event_count, and lifecycle durations
    (sanction-to-completion). Each metric is benchmarked only against
    peers who also have a non-null value for that metric, so partial data
    never distorts another work's percentile.
    """
    df = features.copy()

    metrics = [
        ("recommended_amount", "recommended_amount"),
        ("sanction_amount", "sanction_amount"),
        ("total_expenditure", "expenditure"),
        ("payment_event_count", "payment_event"),
        ("days_sanction_to_completion", "duration"),
        ("days_recommendation_to_sanction", "rec_sanction_duration"),
        ("expenditure_to_sanction_ratio", "exp_sanction_ratio"),
    ]

    pieces = [df]
    for col, prefix in metrics:
        pieces.append(compute_peer_benchmark(df, col, prefix))

    result = pd.concat(pieces, axis=1)
    return result
