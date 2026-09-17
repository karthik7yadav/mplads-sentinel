"""
Part 8 -- Explainability
Part 9 -- Recommended Action

Produces risk_explanations.csv: one row per Work ID, with rule-based
reasons plus component-level reasons when statistical, ML, peer, or
data-quality components materially contribute to the review-priority score.

Every explanation is tied to the work's actual signals and/or its actual
scored components. Model/component reasons never claim fraud; they describe
unusualness or data-quality uncertainty and point the official to a human
verification action.
"""

import numpy as np
import pandas as pd

from .rules import RULE_MODE_ELIGIBILITY

# Maps a rule's signal_type to a suggested human verification action.
# These are SUGGESTIONS for officials, never automatic/punitive
# determinations (Part 9).
ACTION_BY_SIGNAL_TYPE = {
    "lifecycle_delay": "Review administrative status and confirm reason for delay; request updated timeline.",
    "data_consistency": "Verify sanction, expenditure, and completion documentation against physical records.",
    "financial": "Verify expenditure and sanction records; reconcile the reported amounts.",
    "peer_financial": "Compare with peer works of the same category/state; verify sanction and expenditure documentation.",
    "peer_duration": "Review the unusually long implementation period; request status update or site inspection.",
    "peer_payment": "Verify payment records and confirm the number of distinct disbursements against vouchers.",
    "vendor": "Verify vendor and payment details; confirm the concentration of payments is consistent with the scope of work.",
    "statistical": "Review the flagged financial/duration figures against comparable works; request supporting documentation.",
}

COMPONENT_REASON_TEXT = {
    "rule_risk_component": (
        "deterministic compliance checks flagged a review condition"
    ),
    "statistical_anomaly_component": (
        "statistical checks indicate an unusual financial or lifecycle value"
    ),
    "ml_anomaly_component": (
        "the anomaly model ranks the work as unusual relative to works at the same lifecycle stage"
    ),
    "peer_anomaly_component": (
        "peer comparison indicates an unusual value relative to comparable works"
    ),
    "data_quality_component": (
        "data-quality/coverage uncertainty increases the need for verification"
    ),
}

COMPONENT_ACTION = {
    "rule_risk_component": "Review the flagged compliance condition and verify the underlying records.",
    "statistical_anomaly_component": "Review the unusual financial/lifecycle values against supporting records and comparable works.",
    "ml_anomaly_component": "Review the work against similar works at the same lifecycle stage and inspect the underlying records; model unusualness is not a finding of wrongdoing.",
    "peer_anomaly_component": "Compare the work with its assigned peer group and verify the underlying amount, duration, or payment records.",
    "data_quality_component": "Resolve the relevant data-quality or coverage gap before drawing conclusions about the work.",
}

DEFAULT_ACTION = "Review available documentation and compare with peer works before further action."

NO_SIGNAL_EXPLANATION = (
    "No compliance-rule, statistical, peer-relative, or model-anomaly signal materially contributed to this work's review priority; "
    "the score may still reflect lifecycle-specific data-quality/coverage uncertainty."
)

SEVERITY_RANK = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}

# Keep component reasons concise and only report components that actually
# contribute to the current score. The ranking uses weighted contribution to
# the final score, not the raw 0-100 component value.
COMPONENT_WEIGHTED_TOLERANCE = 1e-9


def _component_reasons(scores: pd.DataFrame) -> pd.DataFrame:
    """Build traceable component reasons for each work from its current-stage score."""
    component_cols = [
        "rule_risk_component",
        "statistical_anomaly_component",
        "ml_anomaly_component",
        "peer_anomaly_component",
        "data_quality_component",
    ]
    # Match the exact scoring weights used by risk_scoring.py without
    # duplicating stage-specific numbers in prose logic.
    from .config import RISK_COMPONENT_WEIGHTS

    rows = []
    for work_id, row in scores.iterrows():
        mode = row["risk_mode"]
        weights = RISK_COMPONENT_WEIGHTS[mode]
        candidates = []
        for col in component_cols:
            value = row.get(col, np.nan)
            if pd.isna(value):
                continue
            contribution = float(value) * float(weights[col])
            if contribution <= COMPONENT_WEIGHTED_TOLERANCE:
                continue
            candidates.append((contribution, col, float(value)))
        candidates.sort(key=lambda x: (-x[0], x[1]))
        reason_parts = [COMPONENT_REASON_TEXT[c] for _, c, _ in candidates]
        action_parts = [COMPONENT_ACTION[c] for _, c, _ in candidates]
        component_ids = [c for _, c, _ in candidates]
        contributions = [round(v, 6) for v, _, _ in candidates]
        rows.append({
            "work_id": work_id,
            "component_reason_1": reason_parts[0] if len(reason_parts) > 0 else "",
            "component_reason_2": reason_parts[1] if len(reason_parts) > 1 else "",
            "component_reason_3": reason_parts[2] if len(reason_parts) > 2 else "",
            "component_ids": ",".join(component_ids),
            "component_contributions": ",".join(str(x) for x in contributions),
            "component_action_1": action_parts[0] if len(action_parts) > 0 else "",
        })
    return pd.DataFrame(rows).set_index("work_id")


def build_risk_explanations(scores: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame:
    scores_small = scores[["work_id", "risk_band", "overall_risk", "risk_mode"]].copy()
    comp = _component_reasons(scores.set_index("work_id"))

    if signals.empty:
        top3 = pd.DataFrame(columns=["work_id", "_pos", "explanation", "signal_type", "source_fields"])
    else:
        sig = signals.merge(
            scores_small[["work_id", "risk_mode"]], on="work_id", how="left", suffixes=("", "_current")
        )
        sig["mode_eligible"] = [
            mode in RULE_MODE_ELIGIBILITY.get(rid, set())
            for rid, mode in zip(sig["signal_id"], sig["risk_mode"])
        ]
        sig = sig[sig["mode_eligible"]].copy()
        sig["_rank"] = sig["severity"].map(SEVERITY_RANK).fillna(0)
        sig = sig.sort_values(["work_id", "_rank", "signal_id"], ascending=[True, False, True], kind="mergesort")
        sig["_pos"] = sig.groupby("work_id").cumcount()
        top3 = sig[sig["_pos"] < 3].copy()

    if top3.empty:
        reasons_wide = pd.DataFrame(columns=["top_reason_1", "top_reason_2", "top_reason_3"])
        recommended_action = pd.Series(dtype=object)
        combined_clauses = pd.Series(dtype=object)
        evidence_fields = pd.Series(dtype=object)
    else:
        reasons_wide = top3.pivot(index="work_id", columns="_pos", values="explanation")
        reasons_wide = reasons_wide.reindex(columns=[0, 1, 2])
        reasons_wide.columns = ["top_reason_1", "top_reason_2", "top_reason_3"]
        reasons_wide = reasons_wide.fillna("")

        first_signal_type = top3[top3["_pos"] == 0].set_index("work_id")["signal_type"]
        recommended_action = first_signal_type.map(ACTION_BY_SIGNAL_TYPE).fillna(DEFAULT_ACTION)

        def _join_clauses(group):
            clauses = [str(e).rstrip(".") for e in group["explanation"]]
            return "; ".join(clauses) + "."

        combined_clauses = top3.groupby("work_id", sort=False).apply(_join_clauses, include_groups=False)

        def _union_fields(group):
            fields = set()
            for f in group["source_fields"]:
                fields.update(str(f).split(","))
            return ",".join(sorted(f for f in fields if f and f != "nan"))

        evidence_fields = top3.groupby("work_id", sort=False).apply(_union_fields, include_groups=False)

    out = scores_small[["work_id", "risk_band", "overall_risk"]].set_index("work_id")
    out = out.join(reasons_wide)
    out = out.join(combined_clauses.rename("_clause"))
    out = out.join(evidence_fields.rename("evidence_fields"))
    out = out.join(recommended_action.rename("recommended_action"))
    out = out.join(comp)

    for c in ["top_reason_1", "top_reason_2", "top_reason_3", "evidence_fields",
              "component_reason_1", "component_reason_2", "component_reason_3", "component_ids", "component_contributions",
              "component_action_1"]:
        out[c] = out[c].fillna("")
    out["recommended_action"] = out["recommended_action"].fillna(DEFAULT_ACTION)
    out["_clause"] = out["_clause"].fillna("")

    # The primary explanation combines the highest-severity rule reasons with
    # the highest weighted score-component reasons. This fixes the prior gap
    # where peer/ML/statistical components could move a score or risk band
    # without appearing anywhere in the explanation.
    def _full_explanation(row):
        clauses = []
        if str(row["_clause"]):
            clauses.append(str(row["_clause"]).rstrip("."))
        for c in ["component_reason_1", "component_reason_2", "component_reason_3"]:
            text = row[c]
            if text:
                # Avoid repeating the rule component if the actual rule
                # explanation already states the same driver.
                if c == "component_reason_1" and text == COMPONENT_REASON_TEXT["rule_risk_component"] and row["top_reason_1"]:
                    continue
                clauses.append(text)
        if clauses:
            return "Review priority is " + str(row["risk_band"]) + " because " + "; ".join(clauses) + "."
        return "Review priority is " + str(row["risk_band"]) + ". " + NO_SIGNAL_EXPLANATION

    out["explanation"] = out.apply(_full_explanation, axis=1)

    # If there is no rule signal, use the highest-contributing component to
    # recommend an action. Data quality is deliberately framed as uncertainty,
    # not suspicion.
    mask = out["_clause"].isna() | (out["_clause"] == "")
    out.loc[mask & (out["component_action_1"] != ""), "recommended_action"] = out.loc[
        mask & (out["component_action_1"] != ""), "component_action_1"
    ]

    out = out.reset_index()
    out = out[[
        "work_id", "risk_band", "overall_risk", "top_reason_1", "top_reason_2", "top_reason_3",
        "component_reason_1", "component_reason_2", "component_reason_3", "component_ids", "component_contributions",
        "explanation", "recommended_action", "evidence_fields",
    ]]
    return out
