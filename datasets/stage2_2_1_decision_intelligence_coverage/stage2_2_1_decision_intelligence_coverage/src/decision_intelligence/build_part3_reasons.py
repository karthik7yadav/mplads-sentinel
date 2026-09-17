
# ===========================================================================
# PEER COMPARISON TEXT BUILDER
# ===========================================================================

def peer_comparison(row, prefix):
    """
    Returns a dict of peer-context fields for one peer-benchmarked metric
    prefix (one of the 7 in PEER_METRIC_VALUE_COL), or None if no valid
    (>= PEER_MIN_GROUP_SIZE) peer group exists for this row/metric.
    """
    value_col = PEER_METRIC_VALUE_COL[prefix]
    kind = PEER_METRIC_KIND[prefix]
    value = row.get(value_col, np.nan)
    size = row.get(f'{prefix}_peer_group_size', np.nan)
    median = row.get(f'{prefix}_peer_median', np.nan)
    mean = row.get(f'{prefix}_peer_mean', np.nan)
    level = row.get(f'{prefix}_peer_level_used', np.nan)
    pct = row.get(f'{prefix}_percentile_in_peer_group', np.nan)
    dev = row.get(f'{prefix}_deviation_from_peer_median', np.nan)
    z = row.get(f'{prefix}_robust_z_in_peer_group', np.nan)

    if is_na(size) or is_na(median) or is_na(value):
        return None

    level_label = PEER_LEVEL_LABEL.get(level, str(level))
    val_s = fmt_by_kind(value, kind)
    med_s = fmt_by_kind(median, kind)
    mean_s = fmt_by_kind(mean, kind) if not is_na(mean) else "not available"

    text = f"This work: {val_s}. Comparable works ({level_label}, n={int(size)}): median {med_s}"
    if not is_na(mean):
        text += f", mean {mean_s}"
    text += "."

    if not is_na(dev):
        if kind == "ratio_pct":
            diff_pp = (value - median) * 100.0
            direction = "above" if diff_pp >= 0 else "below"
            text += f" That is {abs(diff_pp):.1f} percentage points {direction} the peer median"
        elif median != 0:
            multiplier = value / median
            direction = "above" if value >= median else "below"
            text += f" That is about {multiplier:.1f}\u00d7 the peer median ({direction} it)"
        else:
            direction = "above" if value > 0 else "the same as"
            text += f" The peer median is zero, so this work's value is {direction} the peer median"
        if not is_na(pct):
            text += f", at the {pct * 100:.1f}th percentile among comparable works."
        else:
            text += "."
    elif not is_na(pct):
        text += f" This work is at the {pct * 100:.1f}th percentile among comparable works."

    return {
        "peer_metric_name": PEER_METRIC_LABEL[prefix],
        "peer_level": level,
        "peer_level_label": level_label,
        "peer_group_size": int(size),
        "peer_median": median,
        "peer_mean": mean if not is_na(mean) else np.nan,
        "peer_percentile": pct,
        "peer_deviation": dev,
        "peer_robust_z": z,
        "peer_comparison_text": text,
    }


def direction_word(z_or_dev):
    if is_na(z_or_dev):
        return "different from"
    return "higher than" if z_or_dev > 0 else ("lower than" if z_or_dev < 0 else "in line with")


# ===========================================================================
# DRIVING-METRIC SELECTION FOR NON-RULE COMPONENT-DOMINANT CASES
# ===========================================================================

def find_driving_peer_metric(row, stage):
    """Replicates risk_scoring._peer_anomaly_component's per-metric scoring
    to find which peer metric is driving the peer_anomaly_component for
    this row/stage, for use when peer comparison is the primary driver but
    RULE-014 itself did not fire (below the RULE-014 z-threshold)."""
    metrics = PEER_METRICS_BY_STAGE.get(stage, [])
    best_prefix, best_score = None, -1.0
    for m in metrics:
        pct_col = f'{m}_percentile_in_peer_group'
        z_col = f'{m}_robust_z_in_peer_group'
        pct = row.get(pct_col, np.nan)
        z = row.get(z_col, np.nan)
        score = np.nan
        if not is_na(pct):
            score = max(0.0, (pct - 0.5) / 0.5 * 100.0)
        if not is_na(z):
            z_score = min(100.0, abs(z) / 5.0 * 100.0)
            score = z_score if is_na(score) else max(score, z_score)
        if not is_na(score) and score > best_score:
            best_score, best_prefix = score, m
    return best_prefix


def find_driving_stat_metric(row, stage):
    """Finds which STATISTICAL_ANOMALY_FEATURES_BY_MODE column is actually
    flagged (the '<col>_statistical_anomaly' boolean) for this row/stage,
    breaking ties by robust-z magnitude then percentile extremity -- this
    correctly surfaces IQR-extreme / high-percentile-only flags that a
    pure robust-z argmax would miss."""
    cols = STATISTICAL_ANOMALY_FEATURES_BY_MODE.get(stage, [])
    candidates = []
    for c in cols:
        flag_col = f'{c}_statistical_anomaly'
        if row.get(flag_col, False) is True or row.get(flag_col, False) == True:  # noqa: E712
            z = row.get(f'{c}_robust_z', np.nan)
            pct = row.get(f'{c}_percentile', np.nan)
            z_mag = abs(z) if not is_na(z) else 0.0
            pct_mag = abs(pct - 0.5) if not is_na(pct) else 0.0
            candidates.append((z_mag, pct_mag, c))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][2]


# ===========================================================================
# EXACT REPLICATION of rules.py's RULE-014 / RULE-015 "driving column"
# idxmax logic (first-occurrence-wins on ties, NaN treated as -1), so that
# when a rule signal IS the primary reason, we report the same driving
# metric the rule engine itself used -- not a re-derived approximation.
# ===========================================================================

RULE014_CANDIDATE_COLS = [
    "recommended_amount_robust_z_in_peer_group", "sanction_amount_robust_z_in_peer_group",
    "expenditure_robust_z_in_peer_group", "payment_event_robust_z_in_peer_group",
    "rec_sanction_duration_robust_z_in_peer_group", "exp_sanction_ratio_robust_z_in_peer_group",
    "duration_robust_z_in_peer_group",
]

RULE015_CANDIDATE_COLS_BY_MODE = {
    "IN_PROGRESS": [
        "expenditure_to_sanction_ratio_robust_z", "expenditure_to_recommended_ratio_robust_z",
        "vendor_concentration_robust_z", "days_recommendation_to_sanction_robust_z",
        "unique_vendor_count_robust_z",
    ],
    "POST_COMPLETION": [
        "expenditure_to_sanction_ratio_robust_z", "expenditure_to_recommended_ratio_robust_z",
        "completion_to_sanction_ratio_robust_z", "vendor_concentration_robust_z",
        "days_recommendation_to_sanction_robust_z", "days_sanction_to_completion_robust_z",
        "unique_vendor_count_robust_z",
    ],
}


def _idxmax_abs_first_wins(row, cols):
    best_col, best_abs = None, -1.0
    for c in cols:
        v = row.get(c, np.nan)
        absval = abs(v) if not is_na(v) else -1.0
        if absval > best_abs:
            best_abs, best_col = absval, c
    return best_col


def _rule014_driving_prefix(row, stage):
    best_col = _idxmax_abs_first_wins(row, RULE014_CANDIDATE_COLS)
    if best_col is None:
        return None
    return best_col.replace("_robust_z_in_peer_group", "")


def _rule015_driving_col(row, stage):
    cols = RULE015_CANDIDATE_COLS_BY_MODE.get(stage, [])
    best_col = _idxmax_abs_first_wins(row, cols)
    if best_col is None:
        return None
    return best_col.replace("_robust_z", "")
