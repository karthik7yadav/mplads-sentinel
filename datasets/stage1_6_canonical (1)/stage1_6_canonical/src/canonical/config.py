"""
STAGE 1.6 - Configuration.

Raw-file constants (column map, work-id regex, whitespace/money cleaning
tables) are copied verbatim from Stage 1 / Stage 1.5's src/config.py and
src/cleaning.py, which were byte-identical between the two prior stages
(verified by diff before writing this module). Nothing about the
normalization vocabulary is being changed in Stage 1.6 - only *which raw
files* feed it (both packages instead of one) and *how the two resulting
streams are reconciled*.
"""
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths - THIS repository (stage1_6_canonical) plus the two upstream raw
# packages we are reconciling. Both raw packages are treated as read-only
# inputs; Stage 1.6 never modifies them.
# ---------------------------------------------------------------------------
CANON_ROOT = Path(__file__).resolve().parent.parent.parent
STAGE1_RAW_DIR = Path("/home/claude/work/stage1/mplads_sentinel/data/raw")
STAGE1_5_RAW_DIR = Path("/home/claude/work/stage1_5/mplads_sentinel/data/raw")

REPORTS_DIR = CANON_ROOT / "reports"
OUT_DIR = CANON_ROOT

RAW_FILENAMES = {
    "recommended": "Works_Recommended.csv",
    "sanctioned": "Works_Sanctioned.csv",
    "expenditure": "Expenditure_on_Completed_and_On-going_Works_as_on_Date.csv",
    "completed": "Works_Completed.csv",
    "allocation": "Allocated_Limit_for_Honble_MPs__2_.csv",
}

PACKAGES = {
    "STAGE1_SNAPSHOT": STAGE1_RAW_DIR,
    "STAGE1_5_SNAPSHOT": STAGE1_5_RAW_DIR,
}

# ---------------------------------------------------------------------------
# Work ID pattern - unchanged from Stage 1 / Stage 1.5.
# ---------------------------------------------------------------------------
WORK_ID_REGEX = r"^(WS/[A-Za-z0-9]+/\d{4}-\d{4}/\d+)"
WORK_ID_WITH_DESC_REGEX = r"^(WS/[A-Za-z0-9]+/\d{4}-\d{4}/\d+)-(.*)$"
UNRESOLVABLE_PREFIXES = ("NA-",)

MONEY_STRIP_CHARS = ["₹", ",", "Rs.", "Rs", "INR", "\xa0"]
WHITESPACE_CHARS = ["\xa0", "\u200b", "\t"]

DATE_COLUMNS = ["recommended_date", "sanction_date", "completion_date", "expenditure_date"]
MONEY_COLUMNS = ["recommended_amount", "sanction_amount", "disbursed_amount", "allocated_amount"]

TEXT_COLUMNS = [
    "state", "constituency", "mp_name", "ida", "work_category",
    "work_description", "vendor_name", "work_status", "payment_status",
]

COLUMN_MAP = {
    "sr no": "sr_no",
    "state": "state",
    "hon ble members of parliament": "mp_name",
    "hon ble members of parliaments": "mp_name",  # allocation file: plural
    "constituency": "constituency",
    "work category": "work_category",
    "work": "work_raw",
    "work id": "work_id_explicit",
    "ida": "ida",
    "work description": "work_description",
    "recommended date": "recommended_date",
    "recommended amount": "recommended_amount",
    "sanction date": "sanction_date",
    "sanction amount": "sanction_amount",
    "work status": "work_status",
    "expenditure date": "expenditure_date",
    "vendor name": "vendor_name",
    "payment status": "payment_status",
    "fund disbursed amount": "disbursed_amount",
    "amount disbursed": "disbursed_amount",
    "image": "image",
    "completion date": "completion_date",
    "allocated amount": "allocated_amount",
}
