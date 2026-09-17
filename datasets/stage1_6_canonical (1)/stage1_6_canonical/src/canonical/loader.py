"""
PART 1/2 support - Load raw CSVs from BOTH packages with provenance
tagging, and profile them for the source inventory.
"""
import hashlib
import pandas as pd

from src.canonical import config
from src.canonical.cleaning import standardize_columns


def _sha256_of_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_raw_tagged(name: str, package_label: str) -> tuple[pd.DataFrame, dict]:
    """Loads one raw CSV from one package as all-string dtype, standardizes
    column names, and tags every row with source_package + a 1-based
    source_row_number that matches the row's physical line in the
    original CSV (header = line 1, so first data row = 2) so any row can
    be traced back to an exact line for audit purposes.
    Returns (dataframe, raw_profile_dict).
    """
    path = config.PACKAGES[package_label] / config.RAW_FILENAMES[name]
    raw = pd.read_csv(path, encoding="utf-8-sig", dtype=str, keep_default_na=True)
    file_hash = _sha256_of_file(path)

    std, mapping = standardize_columns(raw)
    std["source_package"] = package_label
    std["source_file"] = config.RAW_FILENAMES[name]
    std["source_row_number"] = range(2, 2 + len(std))  # +1 for header, +1 for 1-index
    std["source_record_id"] = (
        package_label + "::" + config.RAW_FILENAMES[name] + "::row" + std["source_row_number"].astype(str)
    )

    profile = {
        "source_package": package_label,
        "source_file": config.RAW_FILENAMES[name],
        "row_count": int(len(raw)),
        "column_count": int(raw.shape[1]),
        "columns": list(raw.columns),
        "column_mapping": mapping,
        "duplicate_rows": int(raw.duplicated().sum()),
        "sha256": file_hash,
        "path": str(path),
    }
    return std, profile


def load_both_packages(name: str) -> tuple[pd.DataFrame, pd.DataFrame, dict, dict]:
    df1, prof1 = load_raw_tagged(name, "STAGE1_SNAPSHOT")
    df2, prof2 = load_raw_tagged(name, "STAGE1_5_SNAPSHOT")
    return df1, df2, prof1, prof2
