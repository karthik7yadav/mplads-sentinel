"""
Part 13 -- Validation

Runs the checklist specified in the Stage 2 spec and writes
reports/risk_engine_validation.md. Returns a dict of check -> (passed, detail)
so build_risk_engine.py can decide whether Stage 2 passes overall.
"""

import numpy as np
import pandas as pd

from .config import EXPECTED_CANONICAL_WORK_ID_COUNT


def run_validation(features, scores, explanations, signals, models, meta, canonical_conflicts_path):
    checks = {}

    # 1. risk_features has exactly one row per canonical Work ID.
    checks["1_risk_features_one_row_per_work_id"] = (
        len(features) == EXPECTED_CANONICAL_WORK_ID_COUNT and features["work_id"].is_unique,
        f"{len(features)} rows, unique work_id={features['work_id'].is_unique}",
    )

    # 2. risk_scores has exactly one row per canonical Work ID.
    checks["2_risk_scores_one_row_per_work_id"] = (
        len(scores) == EXPECTED_CANONICAL_WORK_ID_COUNT and scores["work_id"].is_unique,
        f"{len(scores)} rows, unique work_id={scores['work_id'].is_unique}",
    )

    # 3. No duplicate Work IDs (across features, scores, explanations).
    dup_free = features["work_id"].is_unique and scores["work_id"].is_unique and explanations["work_id"].is_unique
    checks["3_no_duplicate_work_ids"] = (dup_free, f"features/scores/explanations all unique: {dup_free}")

    # 4. Risk scores are between 0 and 100.
    risk_cols = ["pre_sanction_risk", "in_progress_risk", "post_completion_risk", "overall_risk"]
    in_range = True
    detail_parts = []
    for c in risk_cols:
        vals = scores[c].dropna()
        ok = ((vals >= 0) & (vals <= 100)).all() if len(vals) else True
        in_range &= ok
        detail_parts.append(f"{c}: min={vals.min() if len(vals) else 'n/a'}, max={vals.max() if len(vals) else 'n/a'}")
    checks["4_risk_scores_in_0_100"] = (in_range, "; ".join(detail_parts))

    # 5. No division-by-zero errors -> no +/-inf anywhere in numeric feature columns.
    numeric_feats = features.select_dtypes(include=[np.number])
    has_inf = np.isinf(numeric_feats.to_numpy()).any()
    checks["5_no_division_by_zero_inf_values"] = (not has_inf, f"any +/-inf in risk_features numeric columns: {has_inf}")

    # 6. No negative artificial financial values (recommended/sanction/expenditure/completion amounts >= 0).
    money_cols = ["recommended_amount", "sanction_amount", "total_expenditure", "completion_amount_disbursed"]
    neg_found = {}
    for c in money_cols:
        neg_found[c] = int((features[c].dropna() < 0).sum())
    checks["6_no_negative_financial_values"] = (
        sum(neg_found.values()) == 0, f"negative-value counts: {neg_found}"
    )

    # 7. Missing data handled explicitly (every *_missing / *_present pair present and boolean).
    presence_cols = ["recommendation_present", "sanction_present", "expenditure_present", "completion_present"]
    missing_cols = ["recommendation_missing", "sanction_missing", "expenditure_missing", "completion_missing"]
    consistent = all((features[p] == ~features[m]).all() for p, m in zip(presence_cols, missing_cols))
    checks["7_missing_data_handled_explicitly"] = (
        consistent, "every *_present / *_missing pair is a perfect logical complement"
    )

    # 8. Isolation Forest is reproducible (fixed random_state recorded in metadata for every mode).
    seeds_fixed = all(meta[m]["random_seed"] is not None for m in meta)
    checks["8_isolation_forest_reproducible"] = (
        seeds_fixed, f"random_state recorded for modes: {list(meta.keys())}"
    )

    # 9. No target leakage: Isolation Forest never fed the final/rule-generated risk score.
    leak_terms = ["overall_risk", "risk_band", "rule_risk_component", "risk_score"]
    leaked = []
    for mode, m in meta.items():
        for f in m["feature_list"]:
            if any(term in f for term in leak_terms):
                leaked.append((mode, f))
    checks["9_no_target_leakage"] = (len(leaked) == 0, f"leaked columns found: {leaked}")

    # 10. No temporal leakage: verify both feature-name whitelists and the
    # semantic stage-specific risk components/rules.
    from .feature_engineering import FEATURE_AVAILABILITY_BY_MODE
    temporal_ok = True
    temporal_detail = []
    for mode, m in meta.items():
        allowed = set(FEATURE_AVAILABILITY_BY_MODE[mode])
        used_base = {f.replace("__was_missing", "") for f in m["feature_list"]}
        not_allowed = used_base - allowed
        if not_allowed:
            temporal_ok = False
        temporal_detail.append(f"{mode}: {len(not_allowed)} disallowed model columns ({sorted(not_allowed)[:5]})")
    # Pre-sanction model must train only on current pre-sanction works; in-progress
    # only on current in-progress works. This is a semantic guard against training
    # distribution contamination by later lifecycle outcomes.
    expected_train = {
        "PRE_SANCTION": int((~(features["sanction_present"] | features["expenditure_present"] | features["completion_present"])).sum()),
        "IN_PROGRESS": int(((features["sanction_present"] | features["expenditure_present"]) & ~features["completion_present"]).sum()),
        "POST_COMPLETION": int(features["completion_present"].sum()),
    }
    for mode, n_expected in expected_train.items():
        n_actual = int(meta[mode]["training_row_count"])
        if n_actual != n_expected:
            temporal_ok = False
        temporal_detail.append(f"{mode}: training rows {n_actual}/{n_expected} current-stage rows")
    required_stat_cols = [
        "statistical_anomaly_component_pre_sanction",
        "statistical_anomaly_component_in_progress",
        "statistical_anomaly_component_post_completion",
    ]
    missing_stat = [c for c in required_stat_cols if c not in features.columns]
    if missing_stat:
        temporal_ok = False
    checks["10_no_temporal_leakage"] = (temporal_ok, "; ".join(temporal_detail) + f"; missing stage-stat columns={missing_stat}")

    # 11. Every rule signal is traceable to source fields (non-null source_fields).
    if signals.empty:
        checks["11_rule_signals_traceable"] = (True, "no signals generated")
    else:
        traceable = signals["source_fields"].notna().all() and (signals["source_fields"].astype(str).str.len() > 0).all()
        checks["11_rule_signals_traceable"] = (bool(traceable), f"{signals['source_fields'].isna().sum()} signals missing source_fields")

    # 12. Every risk explanation is traceable to actual signals (evidence_fields non-empty
    #     whenever a top_reason is present).
    has_reason = explanations["top_reason_1"] != ""
    has_evidence = explanations["evidence_fields"] != ""
    mismatch = int((has_reason & ~has_evidence).sum())
    checks["12_risk_explanations_traceable"] = (
        mismatch == 0, f"{mismatch} explanations have a top_reason but no evidence_fields"
    )

    # 13. Stage 1.6 expenditure conflicts remain preserved (conflict count in risk_features
    #     matches canonical_conflicts.csv's expenditure_event conflict count).
    try:
        conflicts = pd.read_csv(canonical_conflicts_path)
        canonical_conflict_work_ids = set(conflicts.loc[conflicts["dataset"] == "expenditure_event", "work_id"])
        risk_conflict_work_ids = set(features.loc[features["expenditure_conflict_indicator"], "work_id"])
        preserved = canonical_conflict_work_ids.issubset(risk_conflict_work_ids)
        checks["13_expenditure_conflicts_preserved"] = (
            preserved,
            f"canonical conflict work_ids: {len(canonical_conflict_work_ids)}, "
            f"all present in risk_features conflict flag: {preserved}",
        )
    except Exception as e:
        checks["13_expenditure_conflicts_preserved"] = (False, f"could not verify: {e}")

    # 14. Allocation is never treated as work-level budget (no risk_features column
    #     derives a per-work amount from canonical_allocation.csv; only the boolean
    #     allocation_available flag is used).
    allocation_derived_amount_cols = [c for c in features.columns if "allocation" in c.lower() and c != "allocation_available"]
    checks["14_allocation_not_work_level_budget"] = (
        len(allocation_derived_amount_cols) == 0,
        f"allocation-derived columns beyond allocation_available: {allocation_derived_amount_cols}",
    )

    # 15. Parliamentary terms are never inferred (term_unknown_indicator only reads
    #     existing canonical term fields; risk_features adds no new term column).
    allowed_term_cols = {
        "term_unknown_indicator", "pre_term_unknown_indicator",
        "in_progress_term_unknown_indicator", "post_term_unknown_indicator",
    }
    new_term_cols = [c for c in features.columns if "term" in c.lower() and c not in allowed_term_cols]
    checks["15_parliamentary_terms_not_inferred"] = (
        len(new_term_cols) == 0, f"term-related columns beyond term_unknown_indicator: {new_term_cols}"
    )

    # 16. Risk scores are not described as fraud probabilities (textual check on
    #     explanation strings for banned terms).
    banned_terms = ["fraud probability", "probability of fraud", "fraud score", "fraud likelihood"]
    text_blob = " ".join(explanations["explanation"].astype(str).str.lower().tolist())
    found_banned = [t for t in banned_terms if t in text_blob]
    checks["16_scores_not_labeled_fraud_probability"] = (
        len(found_banned) == 0, f"banned fraud-probability phrasing found: {found_banned}"
    )

    # 17. Data-quality issues do not automatically imply wrongdoing (data_quality_component
    #     weight is capped and never the sole/majority driver -- spot-check: works whose
    #     ONLY component > 0 is data_quality never reach HIGH/CRITICAL from that alone,
    #     enforced structurally by DATA_QUALITY_COMPONENT_CAP; verified here by confirming
    #     the cap was actually applied wherever data-quality weight*component would exceed it).
    from .config import DATA_QUALITY_COMPONENT_CAP, RISK_COMPONENT_WEIGHTS
    cap_violations = 0
    for stage in ["pre_sanction", "in_progress", "post_completion"]:
        comp_col = f"data_quality_component_{stage}"
        if comp_col not in scores.columns:
            continue
        weight = RISK_COMPONENT_WEIGHTS[stage.upper()]["data_quality_component"]
        contribution = (scores[comp_col].dropna() * weight)
        cap_violations += int((contribution > DATA_QUALITY_COMPONENT_CAP + 1e-6).sum())
    checks["17_data_quality_never_dominates"] = (
        cap_violations == 0, f"data-quality contribution exceeding cap in {cap_violations} rows (should be 0, capped by construction)"
    )

    # 18. Stage-safe rule signals: 014/015 must not use completion-only metrics
    # in IN_PROGRESS, and no rule eligible for PRE_SANCTION may reference a
    # later-stage field in its declared source_fields.
    stage_rule_ok = True
    bad_rule_details = []
    for _, row in signals.iterrows():
        mode = row["risk_mode"]
        sid = row["signal_id"]
        fields = set(str(row["source_fields"]).split(","))
        if mode == "PRE_SANCTION" and any(f in fields for f in ["sanction_date", "sanction_amount", "total_expenditure", "expenditure_present", "completion_date", "completion_present"]):
            stage_rule_ok = False; bad_rule_details.append((sid, mode, row["source_fields"]))
        if mode == "IN_PROGRESS" and any(f in fields for f in ["completion_date", "completion_present"]):
            stage_rule_ok = False; bad_rule_details.append((sid, mode, row["source_fields"]))
    checks["18_rule_signals_temporally_safe"] = (stage_rule_ok, f"bad stage-rule signals: {len(bad_rule_details)}")

    # 19. Peer benchmark integrity: every non-null metric that receives a
    #     peer assignment must be benchmarked against the actual comparison
    #     group used for that row, and that group must meet the configured
    #     minimum. Missing metric values must not receive a peer assignment.
    from .config import PEER_MIN_GROUP_SIZE
    peer_size_cols = [
        c for c in features.columns if c.endswith("_peer_group_size")
    ]
    peer_level_cols = [
        c for c in features.columns if c.endswith("_peer_level_used")
    ]
    peer_bad = []
    peer_missing_assigned = []
    for size_col in peer_size_cols:
        base = size_col[: -len("_peer_group_size")]
        value_col = base
        level_col = f"{base}_peer_level_used"
        if value_col not in features.columns or level_col not in features.columns:
            continue
        has_value = features[value_col].notna()
        assigned = features[level_col].notna() & (features[level_col].astype(str).str.len() > 0)
        bad_size = assigned & has_value & (features[size_col].fillna(0) < PEER_MIN_GROUP_SIZE)
        bad_missing = assigned & ~has_value
        peer_bad.append(int(bad_size.sum()))
        peer_missing_assigned.append(int(bad_missing.sum()))
    total_bad_size = sum(peer_bad)
    total_bad_missing = sum(peer_missing_assigned)
    checks["19_peer_group_minimum_integrity"] = (
        total_bad_size == 0 and total_bad_missing == 0,
        f"assigned non-null peer groups below {PEER_MIN_GROUP_SIZE}: {total_bad_size}; "
        f"assigned rows with missing metric values: {total_bad_missing}",
    )

    # 20. Explanation completeness: every positive current-stage score
    #     component must be represented in component_ids, and every listed
    #     component must have a positive weighted contribution. This prevents
    #     peer/ML/statistical drivers from changing the score without being
    #     visible in the explanation. Data-quality reasons are explicitly
    #     framed as uncertainty, not wrongdoing, by explainability.py.
    component_cols = [
        "rule_risk_component", "statistical_anomaly_component",
        "ml_anomaly_component", "peer_anomaly_component",
        "data_quality_component",
    ]
    explanation_component_ok = True
    missing_component_details = []
    extra_component_details = []
    explanation_by_work = explanations.set_index("work_id")
    from .config import RISK_COMPONENT_WEIGHTS
    for _, row in scores.iterrows():
        ids = {x for x in str(explanation_by_work.at[row["work_id"], "component_ids"]).split(",") if x}
        weights = RISK_COMPONENT_WEIGHTS[row["risk_mode"]]
        expected = {
            c for c in component_cols
            if pd.notna(row[c]) and float(row[c]) * float(weights[c]) > 1e-9
        }
        if expected != ids:
            explanation_component_ok = False
            if expected - ids:
                missing_component_details.append((row["work_id"], sorted(expected - ids)))
            if ids - expected:
                extra_component_details.append((row["work_id"], sorted(ids - expected)))
    checks["20_explanations_cover_positive_score_components"] = (
        explanation_component_ok,
        f"missing component reasons: {len(missing_component_details)}; "
        f"unexpected component reasons: {len(extra_component_details)}",
    )

    return checks


def write_validation_report(checks: dict, path):
    lines = ["# Stage 2 Risk Engine -- Validation Report", ""]
    all_passed = True
    for i, (key, (passed, detail)) in enumerate(sorted(checks.items(), key=lambda x: int(x[0].split("_")[0])), start=1):
        status = "PASS" if passed else "FAIL"
        all_passed &= passed
        title = key.split("_", 1)[1].replace("_", " ")
        lines.append(f"{i}. **{title}**: {status} -- {detail}")
    lines.append("")
    lines.append(f"## Overall: {'STAGE 2 PASSES' if all_passed else 'STAGE 2 HAS FAILING CHECKS'}")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return all_passed
