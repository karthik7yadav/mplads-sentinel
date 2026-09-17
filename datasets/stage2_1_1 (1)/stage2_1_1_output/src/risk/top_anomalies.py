"""
Part 10 -- Top Anomalies

Produces top_anomalies.csv: the highest review-priority works, ranked
by overall_risk, with the state/constituency/category context and major
signals needed for a human reviewer to triage quickly.
"""

import pandas as pd

from .config import TOP_ANOMALIES_N


def build_top_anomalies(features: pd.DataFrame, scores: pd.DataFrame, explanations: pd.DataFrame,
                         signals: pd.DataFrame, n: int = TOP_ANOMALIES_N) -> pd.DataFrame:
    base = scores.merge(
        features[["work_id", "state", "constituency", "work_category"]], on="work_id", how="left"
    )
    base = base.merge(
        explanations[["work_id", "explanation", "recommended_action"]], on="work_id", how="left"
    )

    if not signals.empty:
        major_signals = (
            signals.groupby("work_id")["signal_id"]
            .apply(lambda s: ",".join(sorted(set(s))))
            .rename("major_signals")
        )
        base = base.merge(major_signals, on="work_id", how="left")
    else:
        base["major_signals"] = ""
    base["major_signals"] = base["major_signals"].fillna("")

    ranked = base.sort_values("overall_risk", ascending=False, na_position="last").head(n)

    return ranked[[
        "work_id", "state", "constituency", "work_category", "risk_band", "overall_risk",
        "major_signals", "explanation", "recommended_action",
    ]].reset_index(drop=True)
