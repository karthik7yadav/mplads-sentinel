"""
PART 2 - Normalize "Works Sanctioned" from both packages. Long table,
one row per raw source row, no cross-package reconciliation here.
"""
import pandas as pd

from src.canonical.loader import load_both_packages
from src.canonical.work_id import add_work_id_columns
from src.canonical.cleaning import clean_text_series, normalize_mp_name, normalize_date_column, normalize_money_column
from src.canonical.term_analysis import add_term_columns

TEXT_COLS = ["state", "constituency", "mp_name", "ida", "work_category", "work_description", "work_status"]


def _normalize_one(df: pd.DataFrame) -> pd.DataFrame:
    out = add_work_id_columns(df, source_col="work_raw")
    for c in TEXT_COLS:
        if c in out.columns:
            out[c] = clean_text_series(out[c])
    out["mp_name_normalized"] = out["mp_name"].apply(normalize_mp_name) if "mp_name" in out.columns else None
    for c in ["recommended_date", "sanction_date"]:
        if c in out.columns:
            out[c] = normalize_date_column(out[c])
    if "sanction_amount" in out.columns:
        out["sanction_amount"] = normalize_money_column(out["sanction_amount"])
    out = add_term_columns(out, mp_name_col="mp_name", prefix="sanction")
    return out


def build_normalized_sanctioned() -> tuple[pd.DataFrame, dict, dict]:
    df1, df2, prof1, prof2 = load_both_packages("sanctioned")
    n1 = _normalize_one(df1)
    n2 = _normalize_one(df2)
    combined = pd.concat([n1, n2], ignore_index=True, sort=False)

    keep = [
        "work_id", "work_raw", "work_desc_from_work_field", "work_id_unresolved_reason",
        "state", "ida", "mp_name", "mp_name_normalized", "constituency",
        "work_category", "work_description",
        "recommended_date", "sanction_date", "sanction_amount", "work_status",
        "sanction_term", "sanction_term_confidence", "sanction_term_evidence",
        "source_package", "source_file", "source_row_number", "source_record_id",
    ]
    combined = combined[[c for c in keep if c in combined.columns]]
    return combined, prof1, prof2
