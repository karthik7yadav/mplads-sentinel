"""
Part 11 -- Risk Distribution Report
Part 12 -- Feature Dictionary

Both are descriptive reports generated directly from the computed
risk_features / risk_scores / risk_signals tables -- no new inference.
"""

import pandas as pd


def write_risk_distribution_report(features: pd.DataFrame, scores: pd.DataFrame, signals: pd.DataFrame, path):
    lines = ["# Stage 2 Risk Engine -- Risk Distribution Report", ""]
    lines.append(
        "All figures below are REVIEW-PRIORITY distributions, not fraud-rate estimates. "
        "A HIGH or CRITICAL band means a work deserves human attention sooner, not that "
        "wrongdoing has been confirmed.\n"
    )

    total = len(scores)
    band_counts = scores["risk_band"].value_counts()
    lines.append("## Overall risk-band distribution\n")
    lines.append("| Band | Count | % of works |")
    lines.append("|---|---|---|")
    for band in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        c = int(band_counts.get(band, 0))
        lines.append(f"| {band} | {c} | {c / total * 100:.2f}% |")
    lines.append("")

    lines.append("## Distribution by lifecycle mode\n")
    mode_band = scores.groupby("risk_mode")["risk_band"].value_counts().unstack(fill_value=0)
    mode_band = mode_band.reindex(columns=["LOW", "MEDIUM", "HIGH", "CRITICAL"], fill_value=0)
    lines.append("| Lifecycle mode | LOW | MEDIUM | HIGH | CRITICAL | Total |")
    lines.append("|---|---|---|---|---|---|")
    for mode, row in mode_band.iterrows():
        lines.append(f"| {mode} | {row['LOW']} | {row['MEDIUM']} | {row['HIGH']} | {row['CRITICAL']} | {row.sum()} |")
    lines.append("")

    merged = scores.merge(features[["work_id", "state", "work_category"]], on="work_id", how="left")

    lines.append("## Distribution by state (top 15 by CRITICAL+HIGH count)\n")
    state_band = merged.groupby("state")["risk_band"].value_counts().unstack(fill_value=0)
    state_band = state_band.reindex(columns=["LOW", "MEDIUM", "HIGH", "CRITICAL"], fill_value=0)
    state_band["HIGH+CRITICAL"] = state_band["HIGH"] + state_band["CRITICAL"]
    state_band = state_band.sort_values("HIGH+CRITICAL", ascending=False).head(15)
    lines.append("| State | LOW | MEDIUM | HIGH | CRITICAL |")
    lines.append("|---|---|---|---|---|")
    for state, row in state_band.iterrows():
        state_label = state if pd.notna(state) else "(no state on file)"
        lines.append(f"| {state_label} | {row['LOW']} | {row['MEDIUM']} | {row['HIGH']} | {row['CRITICAL']} |")
    lines.append("")

    lines.append("## Distribution by work category (top 15 by CRITICAL+HIGH count)\n")
    cat_band = merged.groupby("work_category")["risk_band"].value_counts().unstack(fill_value=0)
    cat_band = cat_band.reindex(columns=["LOW", "MEDIUM", "HIGH", "CRITICAL"], fill_value=0)
    cat_band["HIGH+CRITICAL"] = cat_band["HIGH"] + cat_band["CRITICAL"]
    cat_band = cat_band.sort_values("HIGH+CRITICAL", ascending=False).head(15)
    lines.append("| Work category | LOW | MEDIUM | HIGH | CRITICAL |")
    lines.append("|---|---|---|---|---|")
    for cat, row in cat_band.iterrows():
        cat_label = cat if pd.notna(cat) else "(no category on file)"
        lines.append(f"| {cat_label} | {row['LOW']} | {row['MEDIUM']} | {row['HIGH']} | {row['CRITICAL']} |")
    lines.append("")

    lines.append("## Most common risk signals\n")
    if not signals.empty:
        sig_counts = signals["signal_id"].value_counts()
        lines.append("| Signal | Count | Description |")
        lines.append("|---|---|---|")
        from .rules import RULE_DEFINITIONS
        for sig_id, count in sig_counts.items():
            lines.append(f"| {sig_id} | {count} | {RULE_DEFINITIONS.get(sig_id, '')} |")
    else:
        lines.append("No signals were generated.")
    lines.append("")

    lines.append("## Top anomaly categories (signal_type breakdown)\n")
    if not signals.empty:
        type_counts = signals["signal_type"].value_counts()
        lines.append("| Signal type | Count |")
        lines.append("|---|---|")
        for t, c in type_counts.items():
            lines.append(f"| {t} | {c} |")
    lines.append("")

    lines.append("## Missing-data impact\n")
    for col, label in [
        ("recommendation_missing", "No recommendation record on file"),
        ("sanction_missing", "No sanction record on file"),
        ("expenditure_missing", "No expenditure evidence on file"),
        ("completion_missing", "No completion record on file"),
        ("unresolved_source_indicator", "Source-level duplicate/conflict flagged in provenance"),
        ("term_unknown_indicator", "Parliamentary term unknown across all lifecycle stages"),
    ]:
        n = int(features[col].sum())
        lines.append(f"- {label}: {n} works ({n / total * 100:.2f}%)")
    lines.append("")
    lines.append(
        "Missing data is treated as uncertainty, not evidence of wrongdoing -- see "
        "STAGE2_RISK_ENGINE_README.md and the data_quality_component cap in risk_scoring.py."
    )

    with open(path, "w") as f:
        f.write("\n".join(lines))


FEATURE_DICTIONARY_ROWS = [
    # (feature, meaning, source, calculation, modes, missing_treatment, used_by_ml, used_by_rules)
    ("work_id", "Canonical Work ID (Stage 1.6 authoritative identifier)", "canonical_work_master.csv", "as-is", "all", "never missing", "no", "no"),
    ("state", "State associated with the work", "canonical_work_master.csv (recommended/sanctioned/completed)", "as-is", "all", "may be null if only expenditure evidence exists", "no (categorical, used only for peer grouping)", "no (used only for peer grouping)"),
    ("constituency", "Parliamentary constituency associated with the work", "canonical_work_master.csv", "as-is", "all", "may be null", "no (used only for peer grouping)", "no (used only for peer grouping)"),
    ("work_category", "MPLADS work category", "canonical_work_master.csv", "as-is", "all", "may be null", "no (used only for peer grouping)", "no (used only for peer grouping)"),
    ("recommendation_present", "Whether an MP recommendation record exists", "canonical_work_master.csv", "as-is", "all", "boolean, never missing", "yes", "yes"),
    ("sanction_present", "Whether a sanction record exists", "canonical_work_master.csv", "as-is", "IN_PROGRESS, POST_COMPLETION", "boolean, never missing", "yes", "yes"),
    ("expenditure_present", "Whether any expenditure event exists", "canonical_work_master.csv", "as-is", "IN_PROGRESS, POST_COMPLETION", "boolean, never missing", "yes", "yes"),
    ("completion_present", "Whether a completion record exists", "canonical_work_master.csv", "as-is", "POST_COMPLETION", "boolean, never missing", "yes", "yes"),
    ("recommendation_date/sanction_date/completion_date", "Lifecycle event dates", "canonical_work_master.csv", "as-is", "as applicable", "NULL if absent", "no (used to derive durations)", "no (used to derive durations)"),
    ("days_recommendation_to_sanction", "Days between recommendation and sanction", "derived", "sanction_date - recommendation_date", "IN_PROGRESS, POST_COMPLETION", "NULL if either date missing or duration would be negative (flagged separately)", "yes", "yes (RULE-009)"),
    ("days_sanction_to_completion", "Days between sanction and completion", "derived", "completion_date - sanction_date", "POST_COMPLETION", "NULL if either date missing or negative", "yes", "yes (RULE-010)"),
    ("days_recommendation_to_completion", "Days between recommendation and completion", "derived", "completion_date - recommendation_date", "POST_COMPLETION", "NULL if either date missing or negative", "yes", "yes (RULE-006 uses the negative-duration flag)"),
    ("negative_duration_*", "Flags a computed duration that would have been negative", "derived", "later_date < earlier_date", "as applicable", "boolean, False when not computable", "no", "yes (RULE-005, RULE-006)"),
    ("days_since_recommendation / days_since_sanction", "Elapsed days from the dataset's own latest observed date", "derived", "reference_date - event_date", "PRE_SANCTION / IN_PROGRESS", "NULL if event date missing", "yes", "yes (RULE-001, RULE-002)"),
    ("recommended_amount / sanction_amount / total_expenditure / completion_amount_disbursed", "Financial amounts at each lifecycle stage", "canonical_work_master.csv", "as-is", "as applicable", "NULL if absent (never imputed as 0)", "yes (log1p + median-imputed with indicator for ML)", "yes"),
    ("log_<amount>", "log1p transform of each amount, for skew", "derived", "log1p(amount)", "as applicable", "NULL where amount is NULL/negative", "yes", "no"),
    ("expenditure_to_sanction_ratio / expenditure_to_recommended_ratio / completion_to_sanction_ratio", "Financial ratios", "derived", "safe division (NULL if denominator missing/zero)", "IN_PROGRESS, POST_COMPLETION", "NULL, never 0 or inf", "yes", "yes (RULE-007, RULE-008)"),
    ("sanction_minus_expenditure", "Unspent sanctioned balance", "derived", "sanction_amount - total_expenditure", "IN_PROGRESS, POST_COMPLETION", "NULL if either side missing", "no", "no"),
    ("payment_event_count", "Number of resolved expenditure events", "canonical_expenditure_events.csv", "count per work_id", "IN_PROGRESS, POST_COMPLETION", "0 when no events (this is a true zero, not missing)", "yes", "yes (RULE-011)"),
    ("unique_vendor_count", "Distinct vendors paid", "canonical_expenditure_events.csv", "nunique(vendor_name) per work_id", "IN_PROGRESS, POST_COMPLETION", "0 when no events", "yes (via statistical anomaly)", "no directly"),
    ("same_day_multi_payment_indicator", "Whether >1 payment event shares a date", "canonical_expenditure_events.csv", "groupby(work_id, date).size() > 1", "IN_PROGRESS, POST_COMPLETION", "False when no events", "no", "no directly (informational)"),
    ("vendor_concentration", "Largest single vendor's share of total disbursed amount", "canonical_expenditure_events.csv", "max vendor total / work total", "IN_PROGRESS, POST_COMPLETION", "NULL when no expenditure", "yes", "yes (RULE-012)"),
    ("expenditure_conflict_indicator", "Any expenditure event flagged as possibly conflicting", "canonical_expenditure_events.csv", "any(flagged_possible_conflicting_event)", "IN_PROGRESS, POST_COMPLETION", "False when no events", "no", "yes (RULE-013)"),
    ("recommendation_missing / sanction_missing / expenditure_missing / completion_missing", "Inverse of *_present", "derived", "NOT *_present", "as applicable", "boolean, never missing", "yes", "yes (data_quality_component)"),
    ("unresolved_source_indicator", "Source-level duplicate or conflict logged in provenance", "canonical_provenance.csv", "any(is_duplicate OR is_conflict) grouped by work_id", "all", "False if no provenance rows found", "yes", "yes (data_quality_component)"),
    ("allocation_available", "Whether MP/constituency-level allocation context exists", "canonical_work_master.csv", "as-is", "all", "boolean", "no", "yes (data_quality_component); NEVER treated as a work-level budget"),
    ("term_unknown_indicator", "No parliamentary term evidence at any lifecycle stage", "canonical_work_master.csv", "all of recommendation/sanction/completion term are null/Unknown", "all", "boolean; never inferred beyond what's on file", "yes", "yes (data_quality_component)"),
    ("conflict_indicator / field_conflict_indicator", "Field-level conflict flagged during Stage 1.6 reconciliation, OR expenditure conflict", "canonical_work_master.csv + derived", "OR of *_has_conflict fields and expenditure_conflict_indicator", "all", "boolean", "yes", "yes (data_quality_component)"),
    ("recommended_not_sanctioned / sanctioned_not_expenditure / expenditure_not_completed / completed_without_expenditure_evidence / sanctioned_without_recommendation_on_file", "Lifecycle-state signals (Part 1.E)", "derived", "boolean combinations of *_present flags", "as applicable", "boolean", "yes", "yes (RULE-001 through RULE-004)"),
    ("<metric>_percentile_in_peer_group", "Percentile rank of a metric within its peer group", "derived (peer_benchmark.py)", "rank(pct=True) within the most specific eligible peer group (min 20 members)", "as applicable", "NULL if the work's own value for that metric is NULL", "no directly (peer_anomaly_component uses it)", "yes (RULE-008/009/010/011)"),
    ("<metric>_robust_z_in_peer_group", "Robust (MAD-based) z-score within peer group", "derived (peer_benchmark.py)", "(value - median) / (1.4826 * MAD), within peer group", "as applicable", "NULL if peer group has zero MAD or work's value is NULL", "no directly (peer_anomaly_component / RULE-014 use it)", "yes (RULE-014)"),
    ("<metric>_peer_level_used", "Which peer-hierarchy level was actually used (fallback record)", "derived (peer_benchmark.py)", "most specific level whose remaining comparison set has >= 20 members with a value; final benchmark size is the actual comparison-set size", "as applicable", "n/a (categorical label)", "no", "no (reporting/explanation only)"),
    ("<ratio/duration>_robust_z / _percentile / _statistical_anomaly", "GLOBAL (non-peer) statistical anomaly flags", "derived (anomaly_detection.py)", "robust z / percentile / IQR fencing across the whole canonical dataset", "IN_PROGRESS, POST_COMPLETION", "NaN/False where underlying value is NULL", "no directly (statistical_anomaly_component uses it)", "yes (RULE-015)"),
    ("ml_anomaly_component_<stage>", "Isolation Forest anomaly score, 0-100, scaled within stage", "derived (anomaly_detection.py, sklearn IsolationForest)", "-decision_function(), then percentile-clipped min-max scaled to 0-100", "matching stage only", "NaN if work has not reached that stage", "n/a (this IS the ML output)", "no"),
    ("rule_risk_component / statistical_anomaly_component / ml_anomaly_component / peer_anomaly_component / data_quality_component", "The five 0-100 sub-scores combined into overall_risk", "derived (risk_scoring.py)", "see STAGE2_RISK_ENGINE_README.md 'Risk Scoring' section", "matching stage", "0 where no signal fired (a real, known state)", "n/a", "n/a"),
    ("pre_sanction_risk / in_progress_risk / post_completion_risk / overall_risk", "Final 0-100 review-priority scores", "derived (risk_scoring.py)", "weighted sum of the five components, data-quality contribution capped", "matching stage; NaN if the work hasn't reached that stage yet", "NaN if not yet reached", "n/a", "n/a"),
    ("risk_band", "LOW / MEDIUM / HIGH / CRITICAL label for overall_risk", "derived (risk_scoring.py)", "0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL", "all", "NaN only if overall_risk is NaN (should not happen for a valid work)", "n/a", "n/a"),
]


def write_feature_dictionary(path):
    lines = ["# Stage 2 Risk Engine -- Feature Dictionary", ""]
    lines.append(
        "| Feature | Meaning | Source | Calculation | Allowed lifecycle modes | Missing-value treatment | Used by ML | Used by rules |"
    )
    lines.append("|---|---|---|---|---|---|---|---|")
    for row in FEATURE_DICTIONARY_ROWS:
        lines.append("| " + " | ".join(str(x) for x in row) + " |")
    with open(path, "w") as f:
        f.write("\n".join(lines))
