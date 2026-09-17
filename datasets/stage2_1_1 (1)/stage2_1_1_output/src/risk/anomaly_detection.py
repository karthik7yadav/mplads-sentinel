"""
Part 4 -- Statistical Anomaly Detection

This is deliberately GLOBAL (not peer-conditioned -- that's Part 3's job).
It answers a different question than peer benchmarking: "is this value
statistically extreme across the whole canonical dataset, on measures
where a peer-relative comparison isn't the natural lens" (e.g. ratios that
are already scale-free, like expenditure/sanction, so peer conditioning
adds little; and vendor concentration, which is a proportion regardless
of work category).

Methods: percentile thresholds, IQR fencing, robust (MAD-based) z-scores.
No arbitrary absolute-value cutoffs on raw money figures -- see
config.py / peer_benchmark.py for the peer-relative amount checks instead.
"""

import numpy as np
import pandas as pd

import sklearn
from sklearn.ensemble import IsolationForest

from .config import (
    IQR_OUTLIER_MULTIPLIER,
    IQR_EXTREME_MULTIPLIER,
    ROBUST_Z_ANOMALY_THRESHOLD,
    HIGH_PERCENTILE_THRESHOLD,
    EXTREME_PERCENTILE_THRESHOLD,
    ISOLATION_FOREST_PARAMS,
    RANDOM_SEED,
)
from .utils import robust_z_scores, percentile_rank, iqr_bounds, min_max_scale_0_100
from .feature_engineering import FEATURE_AVAILABILITY_BY_MODE

# Scale-free / ratio-like features where a single global distribution is a
# defensible comparison, independent of work category or state.
STATISTICAL_ANOMALY_FEATURES_BY_MODE = {
    "PRE_SANCTION": [],
    "IN_PROGRESS": [
        "expenditure_to_sanction_ratio",
        "expenditure_to_recommended_ratio",
        "vendor_concentration",
        "days_recommendation_to_sanction",
        "unique_vendor_count",
    ],
    "POST_COMPLETION": [
        "expenditure_to_sanction_ratio",
        "expenditure_to_recommended_ratio",
        "completion_to_sanction_ratio",
        "vendor_concentration",
        "days_recommendation_to_sanction",
        "days_sanction_to_completion",
        "unique_vendor_count",
    ],
}
STATISTICAL_ANOMALY_FEATURES = sorted(set(sum(STATISTICAL_ANOMALY_FEATURES_BY_MODE.values(), [])))


def compute_statistical_anomalies(features: pd.DataFrame) -> pd.DataFrame:
    df = features.copy()
    out = pd.DataFrame(index=df.index)

    anomaly_flag_cols = []

    for col in STATISTICAL_ANOMALY_FEATURES:
        if col not in df.columns:
            continue
        v = pd.to_numeric(df[col], errors="coerce")

        rz = robust_z_scores(v)
        out[f"{col}_robust_z"] = rz

        pct = percentile_rank(v)
        out[f"{col}_percentile"] = pct

        lo, hi = iqr_bounds(v, IQR_OUTLIER_MULTIPLIER)
        lo_ext, hi_ext = iqr_bounds(v, IQR_EXTREME_MULTIPLIER)

        is_iqr_outlier = pd.Series(False, index=df.index)
        is_iqr_extreme = pd.Series(False, index=df.index)
        if pd.notna(lo):
            is_iqr_outlier = (v < lo) | (v > hi)
            is_iqr_extreme = (v < lo_ext) | (v > hi_ext)
        is_iqr_outlier = is_iqr_outlier.fillna(False)
        is_iqr_extreme = is_iqr_extreme.fillna(False)

        is_robust_z_anomaly = (rz.abs() >= ROBUST_Z_ANOMALY_THRESHOLD).fillna(False)
        is_high_percentile = (pct >= EXTREME_PERCENTILE_THRESHOLD).fillna(False)

        flag_col = f"{col}_statistical_anomaly"
        out[flag_col] = is_iqr_extreme | is_robust_z_anomaly | is_high_percentile
        anomaly_flag_cols.append(flag_col)

    # Aggregate count + 0-100 score. Score is the fraction of applicable
    # anomaly checks that fired, scaled to 0-100 -- deliberately NOT the
    # same as robust z magnitude, so one wildly extreme ratio does not by
    # itself dominate (severity nuance lives in risk_signals.csv instead).
    if anomaly_flag_cols:
        flags_df = out[anomaly_flag_cols]
        out["statistical_anomaly_flag_count"] = flags_df.sum(axis=1)
    else:
        out["statistical_anomaly_flag_count"] = 0

    # Stage-specific statistical components. Completion-only anomalies must
    # never contribute to IN_PROGRESS risk.
    for mode, cols in STATISTICAL_ANOMALY_FEATURES_BY_MODE.items():
        mode_flags = [f"{c}_statistical_anomaly" for c in cols if f"{c}_statistical_anomaly" in out.columns]
        if mode_flags:
            out[f"statistical_anomaly_component_{mode.lower()}"] = out[mode_flags].sum(axis=1) / len(mode_flags) * 100.0
        else:
            out[f"statistical_anomaly_component_{mode.lower()}"] = 0.0
    out["statistical_anomaly_component_raw"] = out["statistical_anomaly_component_post_completion"]
    return out


# ===========================================================================
# Part 6 -- Isolation Forest (unsupervised ML anomaly detection)
#
# One model per lifecycle mode, trained ONLY on works that have actually
# reached that stage, using ONLY the features that mode is allowed to see
# (see feature_engineering.FEATURE_AVAILABILITY_BY_MODE). This mirrors the
# same "no future information" rule used everywhere else in the pipeline:
#   - PRE_SANCTION model: trained only on works currently in PRE_SANCTION.
#   - IN_PROGRESS model: trained only on works currently in IN_PROGRESS.
#   - POST_COMPLETION model: trained only on completed works.
# A work that has not yet reached a stage simply has no score for that
# stage (NaN), rather than a fabricated one.
#
# Isolation Forest never sees: final risk score, rule-generated signals,
# or any other stage's future-only fields (enforced by only ever selecting
# columns from FEATURE_AVAILABILITY_BY_MODE[mode]).
# ===========================================================================

ISO_FOREST_TRAIN_FILTER = {
    # Train on the current stage population only. This prevents a later
    # lifecycle outcome (e.g. eventual sanction/completion) from influencing
    # the distribution used to train an earlier-stage model.
    "PRE_SANCTION": lambda df: ~(df["sanction_present"] | df["expenditure_present"] | df["completion_present"]),
    "IN_PROGRESS": lambda df: (df["sanction_present"] | df["expenditure_present"]) & ~df["completion_present"],
    "POST_COMPLETION": lambda df: df["completion_present"],
}


def _prepare_ml_matrix(df: pd.DataFrame, feature_list: list[str]) -> tuple[pd.DataFrame, list[str]]:
    """
    Builds a numeric matrix for the given feature list: booleans -> 0/1,
    numeric columns kept as-is, missing values median-imputed with a
    companion '<col>_was_missing' indicator so imputation is never silent.
    Non-numeric / peer-level-used string columns are dropped automatically
    since they are not in FEATURE_AVAILABILITY_BY_MODE lists.
    """
    cols = [c for c in feature_list if c in df.columns]
    mat = pd.DataFrame(index=df.index)
    used_cols = []
    for c in cols:
        s = df[c]
        if s.dtype == bool:
            mat[c] = s.astype(float)
            used_cols.append(c)
        else:
            s_num = pd.to_numeric(s, errors="coerce")
            missing = s_num.isna()
            if missing.any():
                median = s_num.median()
                median = 0.0 if pd.isna(median) else median
                mat[c] = s_num.fillna(median)
                mat[f"{c}__was_missing"] = missing.astype(float)
                used_cols.extend([c, f"{c}__was_missing"])
            else:
                mat[c] = s_num
                used_cols.append(c)
    return mat, used_cols


def train_isolation_forests(features: pd.DataFrame) -> tuple[dict, dict]:
    """
    Returns (models_dict, metadata_dict). models_dict maps mode ->
    {"model": fitted IsolationForest, "columns": [...]}. metadata_dict maps
    mode -> descriptive metadata for models/model_metadata.json.
    """
    models = {}
    metadata = {}

    for mode, feature_list in FEATURE_AVAILABILITY_BY_MODE.items():
        train_mask = ISO_FOREST_TRAIN_FILTER[mode](features)
        train_df = features.loc[train_mask]

        mat, used_cols = _prepare_ml_matrix(train_df, feature_list)
        # Drop any all-NaN/constant columns that would add no information.
        nunique = mat.nunique(dropna=False)
        keep_cols = [c for c in used_cols if nunique.get(c, 0) > 1]
        mat = mat[keep_cols]

        model = IsolationForest(**ISOLATION_FOREST_PARAMS)
        model.fit(mat.values)

        models[mode] = {"model": model, "columns": keep_cols}
        metadata[mode] = {
            "feature_list": keep_cols,
            "preprocessing": "booleans -> 0/1; numeric NaN -> median-imputed with a companion "
                              "'<col>__was_missing' indicator column; no scaling required for IsolationForest.",
            "random_seed": RANDOM_SEED,
            "contamination": ISOLATION_FOREST_PARAMS["contamination"],
            "n_estimators": ISOLATION_FOREST_PARAMS["n_estimators"],
            "training_row_count": int(len(mat)),
            "excluded_rows": int(len(features) - len(mat)),
            "excluded_rows_reason": f"works that have not yet reached the {mode} stage",
            "sklearn_version": sklearn.__version__,
        }

    return models, metadata


def score_isolation_forests(features: pd.DataFrame, models: dict) -> pd.DataFrame:
    """
    Scores every applicable work under each mode's model. A work only
    receives a score for modes it has actually reached (see
    ISO_FOREST_TRAIN_FILTER) -- everyone else gets NaN for that column,
    never a fabricated score.
    """
    out = pd.DataFrame(index=features.index)

    for mode, bundle in models.items():
        model = bundle["model"]
        cols = bundle["columns"]
        score_col = f"ml_anomaly_raw_{mode.lower()}"
        out[score_col] = np.nan

        apply_mask = ISO_FOREST_TRAIN_FILTER[mode](features)
        apply_df = features.loc[apply_mask]
        mat, _ = _prepare_ml_matrix(apply_df, [c for c in cols if not c.endswith("__was_missing")])
        # Rebuild exactly the training column set (in case some optional
        # __was_missing columns weren't present at scoring time).
        mat = mat.reindex(columns=cols, fill_value=0.0)

        # sklearn convention: decision_function is HIGH for normal points,
        # LOW/negative for anomalies. We flip sign so higher = more anomalous.
        raw_anomaly = -model.decision_function(mat.values)
        out.loc[apply_mask, score_col] = raw_anomaly

    # Scale each mode's raw anomaly score to 0-100 independently (they are
    # not comparable across modes, since each model sees different features
    # and a different population).
    for mode in models:
        raw_col = f"ml_anomaly_raw_{mode.lower()}"
        scaled_col = f"ml_anomaly_component_{mode.lower()}"
        out[scaled_col] = min_max_scale_0_100(out[raw_col])

    return out
