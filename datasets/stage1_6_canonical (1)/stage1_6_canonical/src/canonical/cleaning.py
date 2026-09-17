"""
Column standardization and text/date/money normalization utilities.
Vendored unchanged from Stage 1 / Stage 1.5 src/cleaning.py (verified
byte-identical between those two packages before being copied here).

Nothing here silently drops rows. Anything that cannot be cleanly parsed
is preserved as NaN/None and flagged downstream, never guessed.
"""
import re
import unicodedata
import pandas as pd
import numpy as np

from src.canonical import config


def _slugify_header(col: str) -> str:
    col = unicodedata.normalize("NFKD", str(col))
    col = col.replace("\ufeff", "")
    col = col.lower()
    col = re.sub(r"[^\w\s]", " ", col)
    col = re.sub(r"\s+", " ", col).strip()
    return col


def standardize_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    mapping_used = {}
    new_cols = []
    for col in df.columns:
        slug = _slugify_header(col)
        slug_clean = re.sub(r"\s*(rs|inr|₹)\s*$", "", slug).strip()
        canonical = config.COLUMN_MAP.get(slug) or config.COLUMN_MAP.get(slug_clean)
        if canonical is None:
            canonical = slug.replace(" ", "_") if slug else col
        mapping_used[col] = canonical
        new_cols.append(canonical)
    out = df.copy()
    out.columns = new_cols
    return out, mapping_used


def clean_whitespace(value):
    if pd.isna(value):
        return None
    s = str(value)
    for ch in config.WHITESPACE_CHARS:
        s = s.replace(ch, " ")
    s = re.sub(r"\s+", " ", s).strip()
    if s == "" or s.upper() in {"NA", "N/A", "NAN", "NONE", "-"}:
        return None
    return s


def clean_text_series(series: pd.Series) -> pd.Series:
    return series.apply(clean_whitespace)


def normalize_mp_name(mp_name):
    """Strip Lok Sabha term suffixes for a matching-friendly auxiliary
    variant. The RAW mp_name (with any suffix) is always preserved
    separately - this is never used to overwrite the raw value, and
    the suffix itself is captured intact by term_analysis.py before
    this stripped version is produced."""
    if pd.isna(mp_name):
        return None
    s = re.sub(r"\(.*?lok\s*sabha.*?\)", "", str(mp_name), flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s if s else None


def parse_date(value):
    if pd.isna(value):
        return pd.NaT
    s = clean_whitespace(value)
    if s is None:
        return pd.NaT
    parsed = pd.to_datetime(s, format="%d-%b-%Y", errors="coerce")
    if pd.isna(parsed):
        parsed = pd.to_datetime(s, dayfirst=True, errors="coerce")
    return parsed


def normalize_date_column(series: pd.Series) -> pd.Series:
    return series.apply(parse_date)


def parse_money(value):
    if pd.isna(value):
        return np.nan
    s = clean_whitespace(value)
    if s is None:
        return np.nan
    for ch in config.MONEY_STRIP_CHARS:
        s = s.replace(ch, "")
    s = s.strip()
    if s == "":
        return np.nan
    try:
        return float(s)
    except ValueError:
        return np.nan


def normalize_money_column(series: pd.Series) -> pd.Series:
    return series.apply(parse_money)
