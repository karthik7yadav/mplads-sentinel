"""
Work ID extraction. Vendored unchanged from Stage 1 / Stage 1.5
src/work_id.py (byte-identical between those two packages).

Work IDs are NEVER invented. Unresolvable values become work_id=None
and are preserved (never dropped) with a reason code.
"""
import re
import pandas as pd

from src.canonical import config
from src.canonical.cleaning import clean_whitespace

_ID_RE = re.compile(config.WORK_ID_REGEX)
_ID_DESC_RE = re.compile(config.WORK_ID_WITH_DESC_REGEX)


def _collapse_internal_whitespace(s: str) -> str:
    return re.sub(r"\s+", "", s)


def extract_work_id_from_work_string(work_value):
    if pd.isna(work_value):
        return None, None, "missing_work_field"
    raw = str(work_value)
    collapsed = _collapse_internal_whitespace(raw)
    if any(collapsed.startswith(p) for p in config.UNRESOLVABLE_PREFIXES):
        return None, None, "recorded_as_NA_in_source"
    m = _ID_DESC_RE.match(collapsed)
    if m:
        return m.group(1), m.group(2), None
    m2 = _ID_RE.match(collapsed)
    if m2:
        return m2.group(1), None, None
    cleaned = clean_whitespace(raw)
    if cleaned is None:
        return None, None, "blank_work_field"
    return None, None, "pattern_not_recognized"


def extract_work_id_explicit(value):
    if pd.isna(value):
        return None, "missing_work_id_column"
    collapsed = _collapse_internal_whitespace(str(value))
    m = _ID_RE.match(collapsed)
    if m:
        return m.group(1), None
    cleaned = clean_whitespace(value)
    if cleaned is None:
        return None, "blank_work_id_column"
    return None, "pattern_not_recognized"


def add_work_id_columns(df: pd.DataFrame, source_col: str, prefer_explicit_col: str | None = None) -> pd.DataFrame:
    out = df.copy()
    out["work_raw"] = out[source_col]
    if prefer_explicit_col and prefer_explicit_col in out.columns:
        results = out[prefer_explicit_col].apply(extract_work_id_explicit)
        out["work_id"] = results.apply(lambda r: r[0])
        out["work_id_unresolved_reason"] = results.apply(lambda r: r[1])
        out["work_desc_from_work_field"] = None
    else:
        results = out[source_col].apply(extract_work_id_from_work_string)
        out["work_id"] = results.apply(lambda r: r[0])
        out["work_desc_from_work_field"] = results.apply(lambda r: r[1])
        out["work_id_unresolved_reason"] = results.apply(lambda r: r[2])
    return out
