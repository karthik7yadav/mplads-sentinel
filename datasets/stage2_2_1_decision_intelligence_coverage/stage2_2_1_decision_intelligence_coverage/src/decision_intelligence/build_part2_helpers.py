
# ===========================================================================
# LABEL / MAPPING TABLES
# All wording below is generic template text keyed off column names that
# already exist in the Stage 2.1.1 outputs -- no fabricated categories.
# ===========================================================================

PEER_METRIC_VALUE_COL = {
    "recommended_amount": "recommended_amount",
    "sanction_amount": "sanction_amount",
    "expenditure": "total_expenditure",
    "payment_event": "payment_event_count",
    "duration": "days_sanction_to_completion",
    "rec_sanction_duration": "days_recommendation_to_sanction",
    "exp_sanction_ratio": "expenditure_to_sanction_ratio",
}
PEER_METRIC_LABEL = {
    "recommended_amount": "recommended amount",
    "sanction_amount": "sanctioned amount",
    "expenditure": "total expenditure",
    "payment_event": "number of payment events",
    "duration": "implementation duration (sanction to completion)",
    "rec_sanction_duration": "time from recommendation to sanction",
    "exp_sanction_ratio": "expenditure as a share of the sanctioned amount",
}
PEER_METRIC_KIND = {
    # kind controls formatting: money, ratio_pct, days, count
    "recommended_amount": "money",
    "sanction_amount": "money",
    "expenditure": "money",
    "payment_event": "count",
    "duration": "days",
    "rec_sanction_duration": "days",
    "exp_sanction_ratio": "ratio_pct",
}

PEER_LEVEL_LABEL = {
    "L3_work_category_state_constituency": "same work category, state, and constituency",
    "L2_work_category_state": "same work category and state",
    "L1_work_category": "same work category (nationwide)",
    "L0_GLOBAL": "all MPLADS works in the dataset (no narrower reliable peer group)",
}

# RULE-014's driving column (a peer robust-z column) directly strips to one
# of the PEER_METRIC_VALUE_COL prefixes above.
def peer_prefix_from_rule014_col(col):
    return col.replace("_robust_z_in_peer_group", "")

# RULE-015 / statistical-component driving columns (global, non-peer). Not
# every one of these has a corresponding peer-benchmarked metric.
STAT_METRIC_VALUE_COL = {
    "expenditure_to_sanction_ratio": "expenditure_to_sanction_ratio",
    "expenditure_to_recommended_ratio": "expenditure_to_recommended_ratio",
    "completion_to_sanction_ratio": "completion_to_sanction_ratio",
    "vendor_concentration": "vendor_concentration",
    "days_recommendation_to_sanction": "days_recommendation_to_sanction",
    "days_sanction_to_completion": "days_sanction_to_completion",
    "unique_vendor_count": "unique_vendor_count",
}
STAT_METRIC_LABEL = {
    "expenditure_to_sanction_ratio": "expenditure as a share of the sanctioned amount",
    "expenditure_to_recommended_ratio": "expenditure as a share of the recommended amount",
    "completion_to_sanction_ratio": "amount disbursed at completion as a share of the sanctioned amount",
    "vendor_concentration": "share of expenditure paid to the single largest vendor",
    "days_recommendation_to_sanction": "time from recommendation to sanction",
    "days_sanction_to_completion": "implementation duration (sanction to completion)",
    "unique_vendor_count": "number of distinct vendors paid",
}
STAT_METRIC_KIND = {
    "expenditure_to_sanction_ratio": "ratio_pct",
    "expenditure_to_recommended_ratio": "ratio_pct",
    "completion_to_sanction_ratio": "ratio_pct",
    "vendor_concentration": "ratio_pct",
    "days_recommendation_to_sanction": "days",
    "days_sanction_to_completion": "days",
    "unique_vendor_count": "count",
}
# Maps a STAT driving column to the equivalent peer-benchmarked prefix,
# where one exists, so we can offer the (sometimes contradictory, always
# informative) peer-relative picture alongside the global one.
STAT_TO_PEER_PREFIX = {
    "expenditure_to_sanction_ratio": "exp_sanction_ratio",
    "days_recommendation_to_sanction": "rec_sanction_duration",
    "days_sanction_to_completion": "duration",
}

COMPONENT_LABEL = {
    "rule_risk_component": "Deterministic compliance rule",
    "statistical_anomaly_component": "Statistical anomaly (overall dataset)",
    "ml_anomaly_component": "ML anomaly model (atypical combination of characteristics)",
    "peer_anomaly_component": "Peer comparison",
    "data_quality_component": "Data quality / coverage uncertainty",
}

RULE_TITLE = {
    "RULE-001": "Recommendation pending sanction for an extended period",
    "RULE-002": "Sanctioned with no recorded expenditure for an extended period",
    "RULE-003": "Expenditure recorded without a matching sanction on file",
    "RULE-004": "Completed with no recorded expenditure",
    "RULE-005": "Completion date recorded before the sanction date",
    "RULE-006": "Completion date recorded before the recommendation date",
    "RULE-007": "Expenditure exceeds the sanctioned amount",
    "RULE-008": "Expenditure-to-sanction ratio unusually high compared with similar works",
    "RULE-009": "Recommendation-to-sanction time unusually long compared with similar works",
    "RULE-010": "Implementation duration unusually long compared with similar works",
    "RULE-011": "Number of payment events unusually high compared with similar works",
    "RULE-012": "A single vendor accounts for most of this work's expenditure",
    "RULE-013": "Conflicting expenditure records on file",
    "RULE-014": "Unusual value compared with similar works",
    "RULE-015": "Unusual value compared with the overall portfolio",
}

RULE_ACTION_TITLE = {
    "RULE-001": "Confirm sanctioning status",
    "RULE-002": "Confirm implementation status",
    "RULE-003": "Verify sanction record",
    "RULE-004": "Verify expenditure record",
    "RULE-005": "Correct date records",
    "RULE-006": "Correct date records",
    "RULE-007": "Reconcile expenditure against sanction",
    "RULE-008": "Compare with peer works",
    "RULE-009": "Compare with peer works",
    "RULE-010": "Verify implementation progress",
    "RULE-011": "Verify payment records",
    "RULE-012": "Verify vendor / procurement records",
    "RULE-013": "Reconcile conflicting records",
    "RULE-014": "Compare with peer works",
    "RULE-015": "Verify flagged figures",
}

DQ_FLAG_LABEL = {
    "recommendation_missing": "No recommendation record on file",
    "sanction_missing": "No sanction record on file",
    "expenditure_missing": "No expenditure record on file",
    "completion_missing": "No completion record on file",
    "pre_unresolved_source_indicator": "Some contributing source records for this work could not be fully resolved",
    "in_progress_unresolved_source_indicator": "Some contributing source records for this work could not be fully resolved",
    "post_unresolved_source_indicator": "Some contributing source records for this work could not be fully resolved",
    "pre_conflict_indicator": "Conflicting values exist across source records for this work",
    "in_progress_conflict_indicator": "Conflicting values exist across source records for this work",
    "conflict_indicator": "Conflicting values exist across source records for this work",
    "pre_term_unknown_indicator": "The parliamentary term for this work's record could not be determined",
    "in_progress_term_unknown_indicator": "The parliamentary term for this work's record could not be determined",
    "post_term_unknown_indicator": "The parliamentary term for this work's record could not be determined",
}

LIFECYCLE_CONTEXT = {
    "PRE_SANCTION": "This work has not yet been sanctioned.",
    "IN_PROGRESS": "This work is currently in progress (sanctioned, but not yet marked completed).",
    "POST_COMPLETION": "This work has been recorded as completed.",
}

# ===========================================================================
# FORMATTING HELPERS
# ===========================================================================

def is_na(x):
    try:
        return x is None or (isinstance(x, float) and pd.isna(x)) or pd.isna(x)
    except (TypeError, ValueError):
        return False

def fmt_money(x):
    if is_na(x):
        return "not available"
    return f"\u20b9{x:,.0f}"

def fmt_days(x):
    if is_na(x):
        return "not available"
    return f"{x:,.0f} days"

def fmt_count(x):
    if is_na(x):
        return "not available"
    return f"{x:,.0f}"

def fmt_pct(x, decimals=1):
    if is_na(x):
        return "not available"
    return f"{x * 100:.{decimals}f}%"

def fmt_by_kind(x, kind):
    return {"money": fmt_money, "days": fmt_days, "count": fmt_count, "ratio_pct": fmt_pct}[kind](x)

def fmt_date(x):
    if is_na(x) or x == '' or str(x).lower() == 'nan':
        return "not on file"
    return str(x)
