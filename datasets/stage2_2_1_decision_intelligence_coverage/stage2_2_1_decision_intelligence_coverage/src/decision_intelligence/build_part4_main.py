
# ===========================================================================
# MERGE ALL SOURCES INTO ONE WORKING FRAME (aligned on work_id)
# ===========================================================================
print("Merging source frames...")

wm_cols = [
    'work_id', 'state', 'constituency', 'work_category', 'work_description', 'work_status',
    'recommendation_date', 'sanction_date', 'completion_date',
    'recommendation_present', 'sanction_present', 'expenditure_present', 'completion_present',
    'recommended_amount', 'sanction_amount', 'total_expenditure', 'expenditure_event_count',
    'completion_amount_disbursed', 'allocation_available',
]

rf_cols = ['work_id', 'risk_mode',
           'expenditure_to_sanction_ratio', 'expenditure_to_recommended_ratio', 'completion_to_sanction_ratio',
           'vendor_concentration', 'unique_vendor_count', 'payment_event_count',
           'days_since_recommendation', 'days_since_sanction',
           'days_recommendation_to_sanction', 'days_sanction_to_completion',
           'recommendation_missing', 'sanction_missing', 'expenditure_missing', 'completion_missing',
           'recommended_not_sanctioned', 'sanctioned_not_expenditure', 'completed_without_expenditure_evidence',
           'expenditure_conflict_indicator',
           'negative_duration_recommendation_to_sanction', 'negative_duration_sanction_to_completion',
           'negative_duration_recommendation_to_completion',
           'pre_unresolved_source_indicator', 'in_progress_unresolved_source_indicator', 'post_unresolved_source_indicator',
           'pre_conflict_indicator', 'in_progress_conflict_indicator', 'conflict_indicator',
           'pre_term_unknown_indicator', 'in_progress_term_unknown_indicator', 'post_term_unknown_indicator',
           'statistical_anomaly_flag_count']

for prefix in PEER_METRIC_VALUE_COL:
    for suf in ['_percentile_in_peer_group', '_robust_z_in_peer_group', '_deviation_from_peer_median',
                '_peer_group_size', '_peer_level_used']:
        rf_cols.append(prefix + suf)

for c in STAT_METRIC_VALUE_COL:
    rf_cols += [f'{c}_robust_z', f'{c}_percentile', f'{c}_statistical_anomaly']
rf_cols = list(dict.fromkeys(rf_cols))  # dedupe, keep order

rs_cols = ['work_id', 'overall_risk', 'risk_band', 'rule_risk_component', 'statistical_anomaly_component',
           'ml_anomaly_component', 'peer_anomaly_component', 'data_quality_component']

rex_cols = ['work_id', 'component_ids', 'component_contributions', 'evidence_fields']

peer_extra_cols = ['work_id'] + [c for c in peer_extra.columns if c != 'work_id']

top_signal_cols = top_signal.reset_index()[
    ['work_id', 'signal_id', 'signal_type', 'severity', 'signal_value', 'threshold', 'explanation', 'source_fields']
].rename(columns={
    'signal_id': 'top_signal_id', 'signal_type': 'top_signal_type', 'severity': 'top_signal_severity',
    'signal_value': 'top_signal_value', 'threshold': 'top_signal_threshold',
    'explanation': 'top_signal_explanation', 'source_fields': 'top_signal_source_fields',
})

big = wm[wm_cols].merge(rf[rf_cols], on='work_id', how='left') \
                  .merge(rs[rs_cols], on='work_id', how='left') \
                  .merge(rex[rex_cols], on='work_id', how='left') \
                  .merge(peer_extra_cols and peer_extra[peer_extra_cols], on='work_id', how='left') \
                  .merge(top_signal_cols, on='work_id', how='left')

assert len(big) == EXPECTED_WORK_ID_COUNT
assert big['work_id'].is_unique
print("Merged frame shape:", big.shape)

# Sanity: rf's payment_event_count should equal wm's expenditure_event_count
mismatch_count = (big['payment_event_count'].fillna(-1) != big['expenditure_event_count'].fillna(-1)).sum()
print(f"payment_event_count vs expenditure_event_count mismatch rows: {mismatch_count} / {len(big)}")

DQ_STAGE_COLS = {
    'PRE_SANCTION': [c for c, w in DQ_SIGNALS_BY_STAGE['PRE_SANCTION']],
    'IN_PROGRESS': [c for c, w in DQ_SIGNALS_BY_STAGE['IN_PROGRESS']],
    'POST_COMPLETION': [c for c, w in DQ_SIGNALS_BY_STAGE['POST_COMPLETION']],
}


# ===========================================================================
# MAIN PER-ROW BUILDER
# ===========================================================================

def build_row(row):
    stage = row['risk_mode']
    wid = row['work_id']

    comp_ids_raw = row.get('component_ids', '') or ''
    comp_contrib_raw = row.get('component_contributions', '') or ''
    comp_ids = comp_ids_raw.split(',') if comp_ids_raw else []
    comp_contribs = [float(x) for x in comp_contrib_raw.split(',')] if comp_contrib_raw else []

    primary_component = comp_ids[0] if len(comp_ids) > 0 else None
    secondary_component = comp_ids[1] if len(comp_ids) > 1 else None
    primary_contribution = comp_contribs[0] if len(comp_contribs) > 0 else np.nan
    secondary_contribution = comp_contribs[1] if len(comp_contribs) > 1 else np.nan

    top_signal_id = row.get('top_signal_id')
    has_rule_signal = isinstance(top_signal_id, str) and top_signal_id != ''

    # -----------------------------------------------------------------
    # Dispatch: build (title, summary, why, verify_steps, action_title,
    # technical_metric, technical_value, technical_threshold, peer_prefix,
    # timeline_flag) depending on what actually drives the score.
    # -----------------------------------------------------------------
    title = summary = why = None
    verify_steps = []
    action_title = None
    technical_metric = technical_value = technical_threshold = None
    peer_prefix_for_context = None  # which of the 7 peer metrics to surface in PEER CONTEXT
    stat_driving_col = None

    category = "none"

    if primary_component == "rule_risk_component" and has_rule_signal:
        category = f"rule:{top_signal_id}"
        rid = top_signal_id
        title = RULE_TITLE.get(rid, RULE_DEFINITIONS.get(rid, rid))
        action_title = RULE_ACTION_TITLE.get(rid, "Review flagged condition")
        technical_metric = row.get('top_signal_type')
        technical_value = row.get('top_signal_value')
        technical_threshold = row.get('top_signal_threshold')

        if rid == "RULE-001":
            summary = (f"This work was recommended on {fmt_date(row['recommendation_date'])} "
                       f"\u2014 approximately {fmt_days(row['days_since_recommendation'])} ago \u2014 "
                       f"but has no sanction on file.")
            why = ("Extended pre-sanction delays can reflect administrative backlog, funding "
                   "constraints, or a work that has stalled before ever being formally sanctioned.")
            verify_steps = ["Confirm the current administrative/sanctioning status with the implementing agency.",
                             "If the work is still active, request an updated timeline for sanction."]
        elif rid == "RULE-002":
            summary = (f"This work was sanctioned on {fmt_date(row['sanction_date'])} "
                       f"\u2014 approximately {fmt_days(row['days_since_sanction'])} ago \u2014 "
                       f"but no expenditure has been recorded against it.")
            why = ("A sanctioned work with no expenditure activity for an extended period may indicate the "
                   "work has not started, is stalled, or expenditure records have not been updated.")
            verify_steps = ["Verify the current physical/implementation status with the implementing agency.",
                             "Confirm whether expenditure records are complete and up to date."]
        elif rid == "RULE-003":
            summary = ("Expenditure records exist for this work, but no sanction record is present in the "
                       "canonical dataset.")
            why = ("This most commonly reflects a known structural gap between the two source data extracts "
                   "used to build this dataset (affecting roughly 30% of works generally), not necessarily an "
                   "irregularity specific to this work \u2014 but it should still be confirmed.")
            verify_steps = ["Confirm that a valid sanction was issued for this work and obtain the sanction record."]
        elif rid == "RULE-004":
            summary = ("This work is marked completed, but no expenditure records are present in the "
                       "canonical dataset.")
            why = ("This is a common data-availability gap in the source records rather than inherent evidence "
                   "of an issue, but a completed work should normally have a matching expenditure trail.")
            verify_steps = ["Obtain or verify the expenditure records supporting this work's completion."]
        elif rid == "RULE-005":
            summary = (f"The recorded completion date ({fmt_date(row['completion_date'])}) is earlier than the "
                       f"recorded sanction date ({fmt_date(row['sanction_date'])}).")
            why = ("This sequence is not physically possible and indicates a data-entry or record-keeping error "
                   "that should be corrected before this work's timeline is relied upon.")
            verify_steps = ["Verify both the sanction and completion dates against source records and correct as needed."]
        elif rid == "RULE-006":
            summary = (f"The recorded completion date ({fmt_date(row['completion_date'])}) is earlier than the "
                       f"recorded recommendation date ({fmt_date(row['recommendation_date'])}).")
            why = ("This sequence is not physically possible and indicates a data-entry or record-keeping error "
                   "that should be corrected before this work's timeline is relied upon.")
            verify_steps = ["Verify both the recommendation and completion dates against source records and correct as needed."]
        elif rid == "RULE-007":
            ratio = row.get('expenditure_to_sanction_ratio', np.nan)
            summary = (f"Total recorded expenditure ({fmt_money(row['total_expenditure'])}) exceeds the "
                       f"sanctioned amount ({fmt_money(row['sanction_amount'])}) \u2014 "
                       f"{fmt_pct(ratio)} of the sanction.")
            why = ("Expenditure beyond the sanctioned amount should have documented approval (e.g. a revised "
                   "or enhanced sanction); absent that, it warrants review.")
            verify_steps = ["Reconcile total expenditure against the sanction record and confirm whether a revised sanction exists.",
                             "Review payment vouchers supporting the expenditure beyond the sanctioned amount."]
            peer_prefix_for_context = "exp_sanction_ratio"
        elif rid == "RULE-008":
            peer_prefix_for_context = "exp_sanction_ratio"
            _pc = peer_comparison(row, peer_prefix_for_context)
            summary = (f"This work's expenditure-to-sanction ratio stands out from comparable works. {_pc['peer_comparison_text']}"
                       if _pc else row.get('top_signal_explanation', ''))
            why = ("A far higher share of the sanctioned amount spent than comparable works can reflect either "
                   "accelerated legitimate progress or expenditure that has outpaced approved scope \u2014 either "
                   "way it merits a closer look.")
            verify_steps = ["Compare this work's expenditure milestones against comparable works.",
                             "Verify the supporting expenditure/payment documentation."]
        elif rid == "RULE-009":
            peer_prefix_for_context = "rec_sanction_duration"
            _pc = peer_comparison(row, peer_prefix_for_context)
            summary = (f"This work's recommendation-to-sanction time stands out from comparable works. {_pc['peer_comparison_text']}"
                       if _pc else row.get('top_signal_explanation', ''))
            why = ("A much longer wait between recommendation and sanction than comparable works can reflect "
                   "administrative or funding delay specific to this work; it is worth understanding why.")
            verify_steps = ["Confirm the reason for the extended recommendation-to-sanction interval with the implementing agency."]
        elif rid == "RULE-010":
            peer_prefix_for_context = "duration"
            _pc = peer_comparison(row, peer_prefix_for_context)
            summary = (f"This work's implementation duration stands out from comparable works. {_pc['peer_comparison_text']}"
                       if _pc else row.get('top_signal_explanation', ''))
            why = ("This does not necessarily mean the work is officially delayed \u2014 no planned/expected "
                   "completion date is available in the source data \u2014 but the elapsed implementation "
                   "duration is longer than typical for comparable works, and is worth a status check.")
            verify_steps = ["Verify current physical progress and obtain an updated implementation status.",
                             "Confirm whether the extended duration reflects genuine complexity or a stalled work."]
        elif rid == "RULE-011":
            peer_prefix_for_context = "payment_event"
            _pc = peer_comparison(row, peer_prefix_for_context)
            summary = (f"This work's number of payment events stands out from comparable works. {_pc['peer_comparison_text']}"
                       if _pc else row.get('top_signal_explanation', ''))
            why = ("A higher-than-typical number of separate payments can reflect legitimate phased execution, "
                   "but can also warrant a check for payment splitting or duplicate entries.")
            verify_steps = ["Review the individual payment/voucher records for this work.",
                             "Confirm the payment structure is consistent with the scope and value of the work."]
        elif rid == "RULE-012":
            conc = row.get('vendor_concentration', np.nan)
            pec = row.get('payment_event_count', np.nan)
            summary = (f"A single vendor accounts for {fmt_pct(conc)} of total disbursed expenditure across "
                       f"{fmt_count(pec)} payment events.")
            why = ("High concentration in a single vendor is not inherently problematic, but is worth confirming "
                   "against the work's scope and standard procurement practice.")
            verify_steps = ["Verify vendor selection and procurement records.",
                             "Confirm the concentration is consistent with the nature and scope of the work."]
        elif rid == "RULE-013":
            summary = ("One or more expenditure events recorded for this work have conflicting status or amount "
                       "across the underlying source records (same work, date, and vendor).")
            why = ("Conflicting records mean the expenditure figures used in this dataset may be uncertain until "
                   "reconciled; this is a data-quality flag, not evidence of an irregularity.")
            verify_steps = ["Reconcile the conflicting expenditure entries against the underlying payment/voucher records."]
        elif rid == "RULE-014":
            # RULE-014's own signal_value/threshold record the abs(z) magnitude, not the raw
            # column name, so the driving metric is recovered by exactly replicating the same
            # idxmax logic rules.py itself used to build the signal.
            peer_prefix_for_context = _rule014_driving_prefix(row, stage)
            label = PEER_METRIC_LABEL.get(peer_prefix_for_context, "financial value")
            title = f"Unusual {label} compared with similar works"
            _pc = peer_comparison(row, peer_prefix_for_context) if peer_prefix_for_context else None
            if _pc:
                summary = f"This work's {label} stands out from comparable works. {_pc['peer_comparison_text']}"
            else:
                summary = row.get('top_signal_explanation', '')
            why = ("Financial or count anomalies relative to comparable works can have a legitimate explanation "
                   "(e.g. phased projects, larger scope) but should be confirmed against documentation.")
            verify_steps = ["Compare this work with peer works of the same category/state/constituency.",
                             "Verify the underlying financial/payment documentation."]
        elif rid == "RULE-015":
            stat_driving_col = _rule015_driving_col(row, stage)
            label = STAT_METRIC_LABEL.get(stat_driving_col, "flagged value")
            title = f"Unusual {label} compared with the overall portfolio"
            value_col = STAT_METRIC_VALUE_COL.get(stat_driving_col)
            kind = STAT_METRIC_KIND.get(stat_driving_col, "count")
            val = row.get(value_col, np.nan) if value_col else np.nan
            z = row.get(f'{stat_driving_col}_robust_z', np.nan) if stat_driving_col else np.nan
            pctl = row.get(f'{stat_driving_col}_percentile', np.nan) if stat_driving_col else np.nan
            summary = (f"This work's {label} is {fmt_by_kind(val, kind)}. Across the overall portfolio of "
                       f"comparable-stage works, this is {direction_word(z)} typical")
            if not is_na(pctl):
                summary += f" (around the {pctl * 100:.1f}th percentile)."
            else:
                summary += "."
            why = ("Extreme values relative to the overall dataset warrant a look, though several MPLADS ratios "
                   "cluster tightly around typical values \u2014 which can make even modest real-world "
                   "differences appear statistically extreme.")
            verify_steps = ["Review the flagged figure against supporting documentation.",
                             "Compare against comparable works before concluding the value is unusual."]
            if stat_driving_col in STAT_TO_PEER_PREFIX:
                peer_prefix_for_context = STAT_TO_PEER_PREFIX[stat_driving_col]
        else:
            summary = row.get('top_signal_explanation', '')
            why = "This condition was flagged by a deterministic compliance rule and warrants verification."
            verify_steps = ["Review available documentation related to this flagged condition."]

    elif primary_component == "peer_anomaly_component":
        category = "peer"
        driving_prefix = find_driving_peer_metric(row, stage)
        peer_prefix_for_context = driving_prefix
        label = PEER_METRIC_LABEL.get(driving_prefix, "a financial or timeline value") if driving_prefix else "a financial or timeline value"
        title = f"Notable difference from peer works on {label}"
        _pc = peer_comparison(row, driving_prefix) if driving_prefix else None
        if _pc:
            summary = f"Compared with peer works, this work's {label} stands out. {_pc['peer_comparison_text']}"
        else:
            summary = f"This work differs from comparable works on {label}; the detailed peer figures could not be reconstructed from available data."
        why = ("Although not extreme enough to trigger an automatic compliance rule, this work differs from "
               "comparable works on this measure, which contributed to its review priority.")
        verify_steps = ["Compare this work with peer works of the same category/state/constituency.",
                         "Confirm the underlying figures against documentation."]
        action_title = "Compare with peer works"

    elif primary_component == "ml_anomaly_component":
        category = "ml"
        title = "Atypical overall combination of recorded characteristics"
        stage_label = {"PRE_SANCTION": "pre-sanction", "IN_PROGRESS": "in-progress", "POST_COMPLETION": "completed"}[stage]
        summary = (f"Considered together \u2014 financial amounts, durations, payment patterns, and data "
                   f"completeness \u2014 this work's overall profile is unusual relative to other {stage_label} "
                   f"works. This is a holistic pattern signal from an unsupervised anomaly model: it does not "
                   f"point to one specific field, and 'unusual' does not mean 'improper'.")
        why = ("The model ranks this work as atypical relative to others at the same lifecycle stage; it is a "
               "starting point for review, not a finding.")
        verify_steps = ["Review this work's full record against similar works at the same lifecycle stage.",
                         "Inspect the underlying financial, payment, and lifecycle records."]
        action_title = "Review holistically against similar works"

    elif primary_component == "statistical_anomaly_component":
        category = "statistical"
        stat_driving_col = find_driving_stat_metric(row, stage)
        if stat_driving_col:
            label = STAT_METRIC_LABEL.get(stat_driving_col, "a flagged value")
            value_col = STAT_METRIC_VALUE_COL.get(stat_driving_col)
            kind = STAT_METRIC_KIND.get(stat_driving_col, "count")
            val = row.get(value_col, np.nan) if value_col else np.nan
            z = row.get(f'{stat_driving_col}_robust_z', np.nan)
            pctl = row.get(f'{stat_driving_col}_percentile', np.nan)
            title = f"Notable statistical difference on {label}"
            summary = (f"This work's {label} is {fmt_by_kind(val, kind)}, which is {direction_word(z)} typical "
                       f"across the overall portfolio")
            if not is_na(pctl):
                summary += f" (around the {pctl * 100:.1f}th percentile)."
            else:
                summary += "."
            if stat_driving_col in STAT_TO_PEER_PREFIX:
                peer_prefix_for_context = STAT_TO_PEER_PREFIX[stat_driving_col]
        else:
            title = "Notable statistical difference in financial or lifecycle figures"
            summary = "Statistical checks against the overall portfolio flagged this work, though no single dominant figure could be isolated."
        why = ("Statistical checks compare this work against the overall dataset (not just close peers); some "
               "MPLADS ratios cluster tightly, which can make modest differences read as statistically unusual.")
        verify_steps = ["Review the flagged figures against supporting documentation.",
                         "Compare against comparable works before concluding the value is unusual."]
        action_title = "Verify flagged figures"

    elif primary_component == "data_quality_component":
        category = "data_quality"
        flags = DQ_STAGE_COLS.get(stage, [])
        true_flags = [f for f in flags if row.get(f) is True or row.get(f) == True]  # noqa: E712
        labels = sorted(set(DQ_FLAG_LABEL.get(f, f) for f in true_flags))
        title = "Information gaps affecting this work's record"
        summary = ("; ".join(labels) + ".") if labels else "Some data-quality/coverage uncertainty affects this work's record."
        why = ("Missing or unresolved source information limits how completely this work's record can be "
               "verified from the available data alone; it is not, by itself, evidence of any issue.")
        verify_steps = ["Obtain the missing or unresolved source records referenced above.",
                         "Confirm the work's current status directly with the implementing agency where records are incomplete."]
        action_title = "Obtain missing records"

    else:
        category = "none"
        title = "No significant anomalies detected"
        summary = ("No compliance-rule, statistical, peer-relative, or model-anomaly signal materially "
                   "contributed to this work's review priority based on the available data.")
        why = "This work's data does not show a pattern that stands out from comparable works."
        verify_steps = ["No specific verification is indicated beyond standard review procedures."]
        action_title = "No action indicated"

    # technical_signal/value/threshold should describe the PRIMARY driver.
    # A rule signal may exist and be reported as the top eligible signal
    # (has_rule_signal) without being the primary *component* -- in that
    # case the technical fields must point at the component that actually
    # is primary, not at an unrelated lower-priority rule.
    is_rule_primary = has_rule_signal and primary_component == "rule_risk_component"

    if title is None:
        title = RULE_TITLE.get(top_signal_id, "Flagged for review") if has_rule_signal else "Flagged for review"
    if summary is None:
        summary = row.get('top_signal_explanation') or "See technical details."
    if action_title is None:
        action_title = RULE_ACTION_TITLE.get(top_signal_id, "Review flagged condition") if has_rule_signal else "Review flagged condition"

    why_it_matters = f"{LIFECYCLE_CONTEXT.get(stage, '')} {why}".strip()

    # -----------------------------------------------------------------
    # PEER CONTEXT
    # -----------------------------------------------------------------
    peer_ctx = peer_comparison(row, peer_prefix_for_context) if peer_prefix_for_context else None

    # -----------------------------------------------------------------
    # TIMELINE CONTEXT
    # -----------------------------------------------------------------
    implementation_duration = np.nan
    timeline_comparison_text = ""
    peer_duration_median = np.nan
    duration_deviation = np.nan
    if stage == "POST_COMPLETION" and not is_na(row.get('days_sanction_to_completion')):
        implementation_duration = row.get('days_sanction_to_completion')
        dur_ctx = peer_comparison(row, "duration")
        if dur_ctx:
            peer_duration_median = dur_ctx["peer_median"]
            duration_deviation = dur_ctx["peer_deviation"]
            timeline_comparison_text = dur_ctx["peer_comparison_text"]
        else:
            timeline_comparison_text = (f"This work took {fmt_days(implementation_duration)} from sanction to "
                                         f"completion; no reliable peer benchmark is available for this duration.")
    elif stage == "IN_PROGRESS" and not is_na(row.get('days_since_sanction')):
        implementation_duration = row.get('days_since_sanction')
        timeline_comparison_text = (f"This work has been in sanctioned/in-progress status for approximately "
                                     f"{fmt_days(implementation_duration)} so far. No official planned/expected "
                                     f"completion date is available in the source data, so this is elapsed time, "
                                     f"not a delay determination.")
    elif stage == "PRE_SANCTION" and not is_na(row.get('days_since_recommendation')):
        implementation_duration = row.get('days_since_recommendation')
        timeline_comparison_text = (f"This work has been awaiting sanction for approximately "
                                     f"{fmt_days(implementation_duration)} since it was recommended.")

    # -----------------------------------------------------------------
    # EVIDENCE / AVAILABILITY
    # -----------------------------------------------------------------
    fin_bits = []
    fin_bits.append("recommended amount" if not is_na(row.get('recommended_amount')) else None)
    fin_bits.append("sanctioned amount" if not is_na(row.get('sanction_amount')) else None)
    fin_bits.append("total expenditure" if not is_na(row.get('total_expenditure')) else None)
    fin_bits = [b for b in fin_bits if b]
    available_financial_information = (", ".join(fin_bits).capitalize() + " on file.") if fin_bits else "No financial figures on file."

    lc_bits = []
    if row.get('recommendation_present'):
        lc_bits.append(f"recommended on {fmt_date(row.get('recommendation_date'))}")
    if row.get('sanction_present'):
        lc_bits.append(f"sanctioned on {fmt_date(row.get('sanction_date'))}")
    available_lifecycle_information = ("; ".join(lc_bits).capitalize() + f". Work status on file: {row.get('work_status') if not is_na(row.get('work_status')) else 'not recorded'}.") \
        if lc_bits else f"No recommendation/sanction dates on file. Work status on file: {row.get('work_status') if not is_na(row.get('work_status')) else 'not recorded'}."

    if row.get('completion_present'):
        available_completion_information = (f"Completed on {fmt_date(row.get('completion_date'))}, with "
                                             f"{fmt_money(row.get('completion_amount_disbursed'))} disbursed at completion.")
    else:
        available_completion_information = "Not marked completed; no completion record on file."

    all_dq_flags = DQ_STAGE_COLS.get(stage, [])
    true_dq = [DQ_FLAG_LABEL.get(f, f) for f in all_dq_flags if (row.get(f) is True or row.get(f) == True)]  # noqa: E712
    data_quality_note = ("; ".join(sorted(set(true_dq))) + ".") if true_dq else "No data-quality/coverage flags for this work at its current stage."
    if not is_na(peer_ctx and peer_ctx.get("peer_group_size")):
        pass  # peer sample-size context folded into peer_comparison_text already

    # -----------------------------------------------------------------
    # ASSEMBLE OUTPUT ROW
    # -----------------------------------------------------------------
    out = {
        "work_id": wid,
        "state": row.get('state'),
        "constituency": row.get('constituency'),
        "work_category": row.get('work_category'),
        "work_description": row.get('work_description'),
        "lifecycle_mode": stage,

        "overall_risk": row.get('overall_risk'),
        "risk_band": row.get('risk_band'),
        "primary_risk_component": COMPONENT_LABEL.get(primary_component, primary_component or ""),
        "secondary_risk_component": COMPONENT_LABEL.get(secondary_component, secondary_component or ""),

        "primary_reason_title": title,
        "primary_reason_summary": summary,
        "why_it_matters": why_it_matters,
        "recommended_verification": " | ".join(f"{i+1}. {s}" for i, s in enumerate(verify_steps)) if verify_steps else "",
        "confidence_or_data_availability_note": data_quality_note,

        "recommended_amount": row.get('recommended_amount'),
        "sanctioned_amount": row.get('sanction_amount'),
        "total_expenditure": row.get('total_expenditure'),
        "expenditure_to_sanction_ratio": row.get('expenditure_to_sanction_ratio'),
        "expenditure_event_count": row.get('expenditure_event_count'),

        "peer_metric_name": peer_ctx["peer_metric_name"] if peer_ctx else "",
        "peer_level": peer_ctx["peer_level_label"] if peer_ctx else "",
        "peer_group_size": peer_ctx["peer_group_size"] if peer_ctx else np.nan,
        "peer_median": peer_ctx["peer_median"] if peer_ctx else np.nan,
        "peer_mean": peer_ctx["peer_mean"] if peer_ctx else np.nan,
        "peer_percentile": peer_ctx["peer_percentile"] if peer_ctx else np.nan,
        "peer_deviation": peer_ctx["peer_deviation"] if peer_ctx else np.nan,
        "peer_comparison_text": peer_ctx["peer_comparison_text"] if peer_ctx else "",

        "recommendation_date": row.get('recommendation_date'),
        "sanction_date": row.get('sanction_date'),
        "completion_date": row.get('completion_date'),
        "implementation_duration_days": implementation_duration,
        "peer_duration_median": peer_duration_median,
        "duration_deviation": duration_deviation,
        "timeline_comparison_text": timeline_comparison_text,

        "technical_signal": top_signal_id if is_rule_primary else (primary_component or ""),
        "technical_metric": stat_driving_col or peer_prefix_for_context or (row.get('top_signal_type') if is_rule_primary else ""),
        "technical_value": row.get('top_signal_value') if is_rule_primary else primary_contribution,
        "technical_threshold": row.get('top_signal_threshold') if is_rule_primary else np.nan,
        "technical_component": primary_component or "",
        "technical_component_contribution": primary_contribution,

        "available_financial_information": available_financial_information,
        "available_lifecycle_information": available_lifecycle_information,
        "available_completion_information": available_completion_information,
        "data_quality_note": data_quality_note,

        "recommended_action_title": action_title,
        "recommended_action_steps": " | ".join(f"{i+1}. {s}" for i, s in enumerate(verify_steps)) if verify_steps else "Review available documentation and compare with peer works before further action.",
    }
    return out
