"""
Loads the canonical Stage 1.6 files. This module does NOT reconcile,
re-derive Work IDs, or rebuild anything -- it only reads the authoritative
canonical CSVs as-is.
"""

import pandas as pd

from . import config


def load_work_master() -> pd.DataFrame:
    df = pd.read_csv(config.CANONICAL_FILES["work_master"], low_memory=False)
    assert df["work_id"].is_unique, "canonical_work_master.csv has duplicate Work IDs"
    assert len(df) == config.EXPECTED_CANONICAL_WORK_ID_COUNT, (
        f"Expected {config.EXPECTED_CANONICAL_WORK_ID_COUNT} canonical Work IDs, found {len(df)}"
    )
    return df


def load_expenditure_events() -> pd.DataFrame:
    df = pd.read_csv(config.CANONICAL_FILES["expenditure_events"], low_memory=False)
    return df


def load_expenditure_summary() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["expenditure_summary"], low_memory=False)


def load_provenance() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["provenance"], low_memory=False)


def load_recommended() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["recommended"], low_memory=False)


def load_sanctioned() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["sanctioned"], low_memory=False)


def load_completed() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["completed"], low_memory=False)


def load_allocation() -> pd.DataFrame:
    return pd.read_csv(config.CANONICAL_FILES["allocation"], low_memory=False)
