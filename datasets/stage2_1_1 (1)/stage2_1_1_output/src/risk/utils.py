"""
Small shared utilities: safe division, safe date-diff, robust stats.
No silent error-swallowing — every "unsafe" operation returns NaN plus
lets the caller track it via a companion indicator column.
"""

import numpy as np
import pandas as pd

from .config import MAD_CONSISTENCY_CONSTANT


def safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    """
    Element-wise division that never raises and never divides by zero.
    Returns NaN wherever the denominator is NaN, zero, or the numerator
    is NaN. Never returns +/-inf.
    """
    num = pd.to_numeric(numerator, errors="coerce")
    den = pd.to_numeric(denominator, errors="coerce")
    with np.errstate(divide="ignore", invalid="ignore"):
        result = num / den
    result = result.where((den != 0) & den.notna() & num.notna())
    result = result.replace([np.inf, -np.inf], np.nan)
    return result


def safe_days_between(later: pd.Series, earlier: pd.Series) -> tuple[pd.Series, pd.Series]:
    """
    Compute (later - earlier) in days as a float Series, plus a boolean
    Series flagging negative durations (which are preserved as NaN in the
    duration column itself, per the "do not create negative durations
    silently" instruction -- the flag makes the anomaly visible instead of
    hiding it as an ordinary missing value).
    Returns (days, negative_duration_flag).
    """
    later_dt = pd.to_datetime(later, errors="coerce")
    earlier_dt = pd.to_datetime(earlier, errors="coerce")
    delta_days = (later_dt - earlier_dt).dt.days.astype("float64")
    negative_flag = delta_days < 0
    days = delta_days.where(~negative_flag)
    return days, negative_flag.fillna(False)


def robust_z_scores(values: pd.Series) -> pd.Series:
    """
    Median/MAD-based robust z-score. Returns NaN for groups where MAD is 0
    (i.e. no spread to compare against) rather than dividing by zero.

    Clipped to +/-50: several MPLADS ratio features (e.g.
    expenditure_to_sanction_ratio) are heavily spike-shaped -- most works
    sit at or near exactly 1.0 -- which makes the MAD extremely small and
    can otherwise produce cosmetically absurd z-scores (in the hundreds)
    for any work off that spike. The clip keeps ranking/severity behavior
    intact (a clipped value still reads as "extreme") without reporting a
    misleadingly precise-looking number. This is documented as a known
    limitation in the feature dictionary / README.
    """
    v = pd.to_numeric(values, errors="coerce")
    median = v.median()
    mad = (v - median).abs().median()
    if pd.isna(mad) or mad == 0:
        return pd.Series(np.nan, index=values.index)
    scaled_mad = mad * MAD_CONSISTENCY_CONSTANT
    z = (v - median) / scaled_mad
    return z.clip(lower=-50, upper=50)


def percentile_rank(values: pd.Series) -> pd.Series:
    """
    Percentile rank in [0, 1] within the given Series, NaN-safe
    (NaNs stay NaN, do not contribute to other rows' ranks).
    """
    v = pd.to_numeric(values, errors="coerce")
    return v.rank(pct=True, na_option="keep")


def iqr_bounds(values: pd.Series, multiplier: float) -> tuple[float, float]:
    v = pd.to_numeric(values, errors="coerce").dropna()
    if len(v) < 4:
        return (np.nan, np.nan)
    q1, q3 = v.quantile(0.25), v.quantile(0.75)
    iqr = q3 - q1
    return (q1 - multiplier * iqr, q3 + multiplier * iqr)


def min_max_scale_0_100(values: pd.Series) -> pd.Series:
    """
    Scale a numeric series to 0-100 using robust percentile clipping
    (1st/99th percentile) so a handful of extreme values don't compress
    everything else to near zero. NaNs are preserved as NaN.
    """
    v = pd.to_numeric(values, errors="coerce")
    lo = v.quantile(0.01)
    hi = v.quantile(0.99)
    if pd.isna(lo) or pd.isna(hi) or hi <= lo:
        # No usable spread -- everything maps to 0 rather than raising.
        return pd.Series(0.0, index=values.index).where(v.notna())
    clipped = v.clip(lower=lo, upper=hi)
    scaled = (clipped - lo) / (hi - lo) * 100.0
    return scaled
