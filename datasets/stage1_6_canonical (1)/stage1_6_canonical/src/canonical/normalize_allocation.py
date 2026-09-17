"""
PART 2 / PART 7 - Normalize the Allocation file from both packages.

IMPORTANT FINDING (documented in reports/source_inventory.md and the
README): the two packages' allocation files have the SAME row count
(544) but are NOT the same data. Comparing them shows:
  - 540 of 544 constituencies (by name) are common to both files.
  - The MP names attached to those constituencies are almost entirely
    DIFFERENT between the two files.
  - Stage 1's allocation file has 351 rows with an explicit
    "(17th Lok Sabha)" suffix on mp_name; Stage 1.5's allocation file
    has ZERO such suffixes on any row.
  - The allocated-amount figures use different, non-overlapping value
    sets (Stage 1 mostly ~9.8-14.2 crore band with paise-precision
    figures; Stage 1.5 mostly round-number figures like 147000000).

This is consistent with the two allocation extracts representing two
different MP cohorts/terms for largely the same constituencies (i.e.
an election occurred between the two extraction points) - but per
Part 11's rules, we do NOT assert "Stage 1.5 = 18th Lok Sabha" since
no row in Stage 1.5's allocation file carries an explicit term marker.
We only assert what the explicit Stage 1 suffixes support, and leave
everything else Unknown. Both allocation snapshots are therefore kept
as separate, fully-tagged rows - never unioned or averaged into one
per-MP figure - and allocation is never attached to individual works
as if it were a work-level budget.
"""
import pandas as pd

from src.canonical.loader import load_both_packages
from src.canonical.cleaning import clean_text_series, normalize_mp_name, normalize_money_column
from src.canonical.term_analysis import add_term_columns


def _normalize_one(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for c in ["state", "mp_name", "constituency"]:
        if c in out.columns:
            out[c] = clean_text_series(out[c])
    out["mp_name_normalized"] = out["mp_name"].apply(normalize_mp_name) if "mp_name" in out.columns else None
    if "allocated_amount" in out.columns:
        out["allocated_amount"] = normalize_money_column(out["allocated_amount"])
    out = add_term_columns(out, mp_name_col="mp_name", prefix="allocation")
    out["allocation_level"] = "MP_CONSTITUENCY"
    return out


def build_normalized_allocation() -> tuple[pd.DataFrame, dict, dict]:
    df1, df2, prof1, prof2 = load_both_packages("allocation")
    n1 = _normalize_one(df1)
    n2 = _normalize_one(df2)
    combined = pd.concat([n1, n2], ignore_index=True, sort=False)

    keep = [
        "state", "mp_name", "mp_name_normalized", "constituency",
        "allocated_amount", "allocation_level",
        "allocation_term", "allocation_term_confidence", "allocation_term_evidence",
        "source_package", "source_file", "source_row_number", "source_record_id",
    ]
    combined = combined[[c for c in keep if c in combined.columns]]
    return combined, prof1, prof2
