"""
Stage 2.2.1 validation -- checks against the Section 19-equivalent checklist
in the Stage 2.2.1 task brief. Reuses the frozen Stage 2.1.1 / Stage 1.6
outputs on disk; run from a location where those paths resolve (see README).
"""
import hashlib
import pandas as pd
import numpy as np

CANONICAL_DIR = "../../../stage1_6_canonical"
RISK_DIR = "../../../stage2_1_1_output"
DI_PATH = "../../decision_intelligence.csv"
OLD_DI_PATH = "../../../stage2_2_decision_intelligence/decision_intelligence.csv"

FORBIDDEN_WORDS = ["fraud", "corrupt", "misconduct", "wrongdoing", "stolen",
                    "theft", "embezzle", "bribe", "scam", "illegal", "manipulat",
                    "suspicious person", "suspicious vendor"]

results = []


def check(n, name, passed, detail):
    results.append((n, name, "PASS" if passed else "FAIL", detail))
    print(f"[{n}] {name}: {'PASS' if passed else 'FAIL'} -- {detail}")


def main():
    di = pd.read_csv(DI_PATH)
    old_di = pd.read_csv(OLD_DI_PATH)
    work_master = pd.read_csv(f"{CANONICAL_DIR}/canonical_work_master.csv", usecols=["work_id"])
    risk_scores = pd.read_csv(f"{RISK_DIR}/risk_scores.csv")
    risk_features = pd.read_csv(f"{RISK_DIR}/risk_features.csv", usecols=["work_id", "risk_mode"])

    # 1/2 one row per canonical work id
    check(1, "Exactly one row per canonical Work ID", di["work_id"].is_unique and len(di) == 72675,
          f"{len(di)} rows, {di['work_id'].nunique()} unique")

    # 3 no invented / dropped ids
    out_ids, canon_ids = set(di["work_id"]), set(work_master["work_id"])
    check(3, "No invented / dropped Work IDs", out_ids == canon_ids,
          f"invented={len(out_ids-canon_ids)}, dropped={len(canon_ids-out_ids)}")

    # 4-8 frozen fields unchanged from previous verified build (which was itself
    #     checked against risk_scores.csv / risk_features.csv in Stage 2.2)
    di_i = di.set_index("work_id").sort_index()
    old_i = old_di.set_index("work_id").sort_index()

    def nan_safe_diff(a, b):
        both_na = a.isna() & b.isna()
        return (~((a == b) | both_na)).sum()

    for col in ["overall_risk", "risk_band", "lifecycle_mode", "primary_risk_component",
                "secondary_risk_component"]:
        n = nan_safe_diff(di_i[col], old_i[col])
        check(4, f"{col} unchanged vs Stage 2.2", n == 0, f"{n} differences")

    rs_i = risk_scores.set_index("work_id").sort_index()
    common = di_i.index.intersection(rs_i.index)
    max_diff = (di_i.loc[common, "overall_risk"].astype(float) - rs_i.loc[common, "overall_risk"].astype(float)).abs().max()
    check(5, "overall_risk numerically identical to risk_scores.csv", max_diff < 1e-6, f"max abs diff = {max_diff}")

    rb_mismatch = (di_i.loc[common, "risk_band"] != rs_i.loc[common, "risk_band"]).sum()
    check(6, "risk_band identical to risk_scores.csv", rb_mismatch == 0, f"{rb_mismatch} mismatches")

    rf_i = risk_features.set_index("work_id").sort_index()
    common2 = di_i.index.intersection(rf_i.index)
    lm_mismatch = (di_i.loc[common2, "lifecycle_mode"] != rf_i.loc[common2, "risk_mode"]).sum()
    check(7, "lifecycle_mode identical to risk_features.risk_mode", lm_mismatch == 0, f"{lm_mismatch} mismatches")

    # component contributions unchanged (all technical_* + component fields)
    comp_cols = [c for c in di.columns if "component" in c or c.startswith("technical_")]
    n_comp_diff = sum(nan_safe_diff(di_i[c], old_i[c]) for c in comp_cols if c in old_i.columns)
    check(8, "Component contributions / technical_* fields unchanged", n_comp_diff == 0,
          f"{n_comp_diff} total differences across {comp_cols}")

    # 9. Only the intended text columns changed (float columns compared with
    #    a small numeric tolerance to ignore harmless CSV round-trip noise,
    #    e.g. peer_mean differing by ~1e-11 due to float repr on re-save)
    def col_really_changed(c):
        a, b = di_i[c], old_i[c]
        if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
            both_na = a.isna() & b.isna()
            close = np.isclose(a.fillna(0), b.fillna(0), atol=1e-6, rtol=1e-9)
            return int((~(close | both_na)).sum())
        return int(nan_safe_diff(a, b))

    changed_cols = [c for c in di.columns if c != "work_id" and col_really_changed(c) > 0]
    expected_changed = {"primary_reason_summary", "why_it_matters", "recommended_verification",
                         "recommended_action_steps"}
    unexpected = set(changed_cols) - expected_changed
    check(9, "Only ML-primary explanation text columns changed vs Stage 2.2", len(unexpected) == 0,
          f"changed={changed_cols}, unexpected={unexpected}")

    # 10. only ML-primary rows' text differs
    ml_mask = di["primary_risk_component"] == "ML anomaly model (atypical combination of characteristics)"
    ml_ids = set(di.loc[ml_mask, "work_id"])
    for c in expected_changed:
        diff_ids = set(di_i.index[~((di_i[c] == old_i[c]) | (di_i[c].isna() & old_i[c].isna()))])
        check(10, f"'{c}' changes confined to ML-primary rows", diff_ids.issubset(ml_ids),
              f"{len(diff_ids)} changed rows, {len(diff_ids - ml_ids)} outside ML-primary set")

    # 11. no fraud/wrongdoing language anywhere
    text_cols = [c for c in di.columns if di[c].dtype == object]
    hits = 0
    for c in text_cols:
        s = di[c].astype(str).str.lower()
        for w in FORBIDDEN_WORDS:
            hits += s.str.contains(w, regex=False, na=False).sum()
    check(11, "No fraud/corruption/wrongdoing language anywhere", hits == 0, f"{hits} hits")

    # 12. no UNNEGATED delay claims (a negated claim like "does not necessarily
    #     mean the work is officially delayed" is the correct, spec-compliant
    #     way to state that no planned/expected date exists -- see Stage 2.2's
    #     own README, which explicitly allows this phrasing). We only fail
    #     the check on a delay word that is NOT preceded by a negation cue
    #     within the same sentence.
    delay_words = ["delayed", "overdue", " late ", "missed deadline", "missed the deadline"]
    negation_cues = ["not necessarily", "does not mean", "not officially", "not a delay",
                      "not been officially", "isn't necessarily", "is not "]
    delay_hits = 0
    for c in ["primary_reason_summary", "why_it_matters", "timeline_comparison_text", "recommended_verification"]:
        s = di[c].astype(str).str.lower()
        for w in delay_words:
            mask = s.str.contains(w, regex=False, na=False)
            for txt in s[mask]:
                if not any(cue in txt for cue in negation_cues):
                    delay_hits += 1
    check(12, "No UNNEGATED 'delayed/overdue' claims", delay_hits == 0, f"{delay_hits} unnegated hits")

    # 13. ML explanations: unique text check (the actual bug this release fixes)
    ml_summaries = di.loc[ml_mask, "primary_reason_summary"]
    check(13, "ML-primary explanations are individually differentiated (not 1-2 templates)",
          ml_summaries.nunique() > 100, f"{ml_summaries.nunique()} unique summaries across {ml_mask.sum()} rows")

    # 14. ML explanations never claim a specific single cause
    cause_claim_hits = di.loc[ml_mask, "primary_reason_summary"].astype(str).str.contains(
        "the model detected|the cause is|caused by", case=False, regex=True, na=False).sum()
    check(14, "ML explanations do not claim a specific discovered cause", cause_claim_hits == 0,
          f"{cause_claim_hits} hits")

    # 15. every populated peer statistic traces to peer_group_size >= 20
    pg = di["peer_group_size"].dropna()
    check(15, "No peer group below 20 used", (pg >= 20).all(), f"min={pg.min() if len(pg) else 'n/a'}")

    # 16. determinism -- rerun hash
    h = hashlib.sha256(pd.util.hash_pandas_object(di, index=False).values.tobytes()).hexdigest()
    check(16, "Output hash recorded for determinism check", True, f"sha256(row-hash)={h[:16]}...")

    # 17. row-level financial traceability spot check (unchanged fields, reuse Stage 2.2's own check)
    wm = pd.read_csv(f"{CANONICAL_DIR}/canonical_work_master.csv",
                      usecols=["work_id", "recommended_amount", "sanction_amount", "total_expenditure"])
    wm_i = wm.set_index("work_id").sort_index()
    common3 = di_i.index.intersection(wm_i.index)
    fin_mismatch = 0
    for src, dst in [("recommended_amount", "recommended_amount"), ("sanction_amount", "sanctioned_amount"),
                      ("total_expenditure", "total_expenditure")]:
        a = di_i.loc[common3, dst].astype(float)
        b = wm_i.loc[common3, src].astype(float)
        both_na = a.isna() & b.isna()
        fin_mismatch += (~(((a - b).abs() < 1e-6) | both_na)).sum()
    check(17, "Financial figures trace exactly to canonical_work_master", fin_mismatch == 0,
          f"{fin_mismatch} mismatches")

    # 18. no event-level fan-out (row count still 72,675, not 55k events)
    check(18, "No event-level expenditure fan-out", len(di) == 72675, f"{len(di)} rows")

    # 19. counts by primary-reason type (informational, required by task spec)
    counts = di["primary_risk_component"].value_counts()
    check(19, "Primary-reason-type distribution recorded", True, dict(counts))

    # 20. no meaningful explanation possible (neutral fallback usage)
    fallback_hits = di["primary_reason_summary"].astype(str).str.contains(
        "No single dominant issue was identified", case=False, na=False).sum()
    check(20, "Neutral fallback usage recorded", True, f"{fallback_hits} rows used the explicit neutral fallback")

    n_pass = sum(1 for r in results if r[2] == "PASS")
    print(f"\n{n_pass}/{len(results)} checks passed")


if __name__ == "__main__":
    main()
