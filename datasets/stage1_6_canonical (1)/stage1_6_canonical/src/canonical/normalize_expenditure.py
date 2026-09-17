"""
PART 2 - Normalize the Expenditure (payment-event) file from both
packages. This file is EVENT-LEVEL: multiple rows per work_id are
expected and meaningful. This module does not deduplicate or aggregate
anything - it only cleans/types each row and preserves it. Deduplication
of exact-duplicate events across the two packages is PART 5
(reconcile_expenditure.py).
"""
import pandas as pd

from src.canonical.loader import load_both_packages
from src.canonical.work_id import add_work_id_columns
from src.canonical.cleaning import clean_text_series, normalize_mp_name, normalize_date_column, normalize_money_column
from src.canonical.term_analysis import add_term_columns

TEXT_COLS = ["state", "constituency", "mp_name", "ida", "vendor_name", "payment_status"]


def _normalize_one(df: pd.DataFrame) -> pd.DataFrame:
    out = add_work_id_columns(df, source_col="work_raw", prefer_explicit_col="work_id_explicit")
    for c in TEXT_COLS:
        if c in out.columns:
            out[c] = clean_text_series(out[c])
    out["mp_name_normalized"] = out["mp_name"].apply(normalize_mp_name) if "mp_name" in out.columns else None
    if "expenditure_date" in out.columns:
        out["expenditure_date"] = normalize_date_column(out["expenditure_date"])
    if "disbursed_amount" in out.columns:
        out["disbursed_amount"] = normalize_money_column(out["disbursed_amount"])
    out = add_term_columns(out, mp_name_col="mp_name", prefix="expenditure")
    return out


def build_normalized_expenditure() -> tuple[pd.DataFrame, dict, dict]:
    df1, df2, prof1, prof2 = load_both_packages("expenditure")
    n1 = _normalize_one(df1)
    n2 = _normalize_one(df2)
    combined = pd.concat([n1, n2], ignore_index=True, sort=False)

    keep = [
        "work_id", "work_raw", "work_id_unresolved_reason",
        "state", "ida", "mp_name", "mp_name_normalized", "constituency",
        "expenditure_date", "vendor_name", "payment_status", "disbursed_amount",
        "expenditure_term", "expenditure_term_confidence", "expenditure_term_evidence",
        "source_package", "source_file", "source_row_number", "source_record_id",
    ]
    combined = combined[[c for c in keep if c in combined.columns]]
    return combined, prof1, prof2
