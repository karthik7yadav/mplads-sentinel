"""
Stage 2 Risk Engine - Configuration
=====================================
Central place for paths, thresholds, weights and other configurable
parameters. Every "magic number" used by the rule engine, peer
benchmarking, and risk scoring modules is defined here so it can be
audited and changed without touching the underlying code.

Nothing in this file infers or fabricates data. It only sets
thresholds/parameters applied to canonical Stage 1.6 data.
"""

from pathlib import Path
import os

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------

# Root of the canonical Stage 1.6 data (authoritative, read-only input).
# Runtime paths are configurable. Defaults are project-relative so the package is
# portable across machines/environments. Environment variables take precedence.
PACKAGE_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_DIR = Path(os.environ.get("MPLADS_CANONICAL_DIR", PACKAGE_ROOT.parent / "stage1_6_canonical"))

# Root of this Stage 2 deliverable.
OUTPUT_DIR = Path(os.environ.get("MPLADS_STAGE2_OUTPUT_DIR", PACKAGE_ROOT))
MODELS_DIR = OUTPUT_DIR / "models"
REPORTS_DIR = OUTPUT_DIR / "reports"

CANONICAL_FILES = {
    "work_master": CANONICAL_DIR / "canonical_work_master.csv",
    "recommended": CANONICAL_DIR / "canonical_recommended.csv",
    "sanctioned": CANONICAL_DIR / "canonical_sanctioned.csv",
    "expenditure_events": CANONICAL_DIR / "canonical_expenditure_events.csv",
    "expenditure_summary": CANONICAL_DIR / "canonical_expenditure_summary.csv",
    "completed": CANONICAL_DIR / "canonical_completed.csv",
    "allocation": CANONICAL_DIR / "canonical_allocation.csv",
    "provenance": CANONICAL_DIR / "canonical_provenance.csv",
}

CANONICAL_VALIDATION_MD = CANONICAL_DIR / "reports" / "canonical_validation.md"
CANONICAL_VALIDATION_JSON = CANONICAL_DIR / "reports" / "canonical_validation.json"
CANONICAL_CONFLICTS_CSV = CANONICAL_DIR / "reports" / "canonical_conflicts.csv"

EXPECTED_CANONICAL_WORK_ID_COUNT = 72675


def configure_runtime_paths(canonical_dir=None, output_dir=None):
    """Update runtime paths for CLI/reproducible execution."""
    global CANONICAL_DIR, OUTPUT_DIR, MODELS_DIR, REPORTS_DIR, CANONICAL_FILES
    if canonical_dir is not None:
        CANONICAL_DIR = Path(canonical_dir).expanduser().resolve()
    if output_dir is not None:
        OUTPUT_DIR = Path(output_dir).expanduser().resolve()
    MODELS_DIR = OUTPUT_DIR / "models"
    REPORTS_DIR = OUTPUT_DIR / "reports"
    CANONICAL_FILES = {
        "work_master": CANONICAL_DIR / "canonical_work_master.csv",
        "recommended": CANONICAL_DIR / "canonical_recommended.csv",
        "sanctioned": CANONICAL_DIR / "canonical_sanctioned.csv",
        "expenditure_events": CANONICAL_DIR / "canonical_expenditure_events.csv",
        "expenditure_summary": CANONICAL_DIR / "canonical_expenditure_summary.csv",
        "completed": CANONICAL_DIR / "canonical_completed.csv",
        "allocation": CANONICAL_DIR / "canonical_allocation.csv",
        "provenance": CANONICAL_DIR / "canonical_provenance.csv",
    }
    globals()["CANONICAL_VALIDATION_MD"] = CANONICAL_DIR / "reports" / "canonical_validation.md"
    globals()["CANONICAL_VALIDATION_JSON"] = CANONICAL_DIR / "reports" / "canonical_validation.json"
    globals()["CANONICAL_CONFLICTS_CSV"] = CANONICAL_DIR / "reports" / "canonical_conflicts.csv"
    return CANONICAL_DIR, OUTPUT_DIR

# ---------------------------------------------------------------------------
# RANDOM SEED (used everywhere randomness is possible)
# ---------------------------------------------------------------------------

RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# LIFECYCLE MODES
# ---------------------------------------------------------------------------

LIFECYCLE_MODES = ["PRE_SANCTION", "IN_PROGRESS", "POST_COMPLETION"]

# ---------------------------------------------------------------------------
# PEER BENCHMARKING
# ---------------------------------------------------------------------------

# Minimum number of works required in a peer group before it is trusted.
# If a group is smaller than this, we fall back to a broader group.
PEER_MIN_GROUP_SIZE = 20

# Peer hierarchy, most specific first. Each level is a tuple of work_master
# columns to group by. The pipeline walks this list until it finds a group
# of at least PEER_MIN_GROUP_SIZE, falling back toward the end.
PEER_HIERARCHY = [
    ("work_category", "state", "constituency"),  # LEVEL 2 (most specific)
    ("work_category", "state"),                  # LEVEL 1
    ("work_category",),                           # LEVEL 0 fallback
    (),                                            # global fallback (all works)
]

# ---------------------------------------------------------------------------
# STATISTICAL ANOMALY DETECTION
# ---------------------------------------------------------------------------

# Robust z-score modified using MAD (median absolute deviation).
# 1.4826 is the consistency constant that makes MAD comparable to std-dev
# for normally distributed data.
MAD_CONSISTENCY_CONSTANT = 1.4826

# A robust z-score beyond this magnitude is flagged as a statistical anomaly.
ROBUST_Z_ANOMALY_THRESHOLD = 3.5

# IQR multiplier for outlier fencing (standard Tukey fence uses 1.5;
# we use a slightly wider fence for "extreme" outliers).
IQR_OUTLIER_MULTIPLIER = 1.5
IQR_EXTREME_MULTIPLIER = 3.0

# Percentile thresholds used to flag "unusually high" values in the
# peer-relative and statistical checks.
HIGH_PERCENTILE_THRESHOLD = 0.95
EXTREME_PERCENTILE_THRESHOLD = 0.99

# ---------------------------------------------------------------------------
# RULE ENGINE THRESHOLDS
# ---------------------------------------------------------------------------
# Every threshold below is a configurable review trigger, not proof of
# wrongdoing. Rationale is documented alongside each rule in rules.py and
# in reports/feature_dictionary.md.

RULE_THRESHOLDS = {
    # RULE-001: recommended but not sanctioned after an unusually long wait.
    # 365 days chosen as a generous outer bound for MPLADS administrative
    # sanctioning; works recommended more than a year ago with no sanction
    # on file deserve a look even accounting for administrative delay.
    "RULE_001_days_since_recommendation_no_sanction": 365,

    # RULE-002: sanctioned but no expenditure evidence after this many days.
    "RULE_002_days_since_sanction_no_expenditure": 270,

    # RULE-007: expenditure exceeds sanction by more than this fraction
    # (0.0 = any excess at all triggers the rule; severity scales with size).
    "RULE_007_expenditure_over_sanction_ratio": 1.0,

    # RULE-008: expenditure/sanction ratio unusually high relative to peers
    # (expressed as a peer percentile threshold).
    "RULE_008_peer_percentile_threshold": 0.95,

    # RULE-009/010: peer-relative percentile threshold for unusually long
    # lifecycle durations.
    "RULE_009_010_duration_percentile_threshold": 0.95,

    # RULE-011: peer-relative percentile threshold for payment event count.
    "RULE_011_payment_count_percentile_threshold": 0.95,

    # RULE-012: vendor concentration (share of total expenditure paid to the
    # single largest vendor) above this fraction is flagged, requires at
    # least 2 payment events (concentration is meaningless with only one).
    "RULE_012_vendor_concentration_threshold": 0.90,

    # RULE-014: peer-relative robust z-score threshold for "strong" anomaly.
    "RULE_014_peer_robust_z_threshold": 3.5,

    # RULE-015: general statistical robust z-score threshold.
    "RULE_015_statistical_robust_z_threshold": 3.5,
}

# ---------------------------------------------------------------------------
# ISOLATION FOREST
# ---------------------------------------------------------------------------

ISOLATION_FOREST_PARAMS = {
    "n_estimators": 200,
    "max_samples": "auto",
    "contamination": 0.05,  # assumed review-priority proportion, NOT a fraud rate
    "random_state": RANDOM_SEED,
    "n_jobs": -1,
}

# ---------------------------------------------------------------------------
# RISK SCORING WEIGHTS
# ---------------------------------------------------------------------------
# Each component is scaled to 0-100 before weighting. Weights must sum to 1.0
# per lifecycle mode. Data-quality is deliberately capped (see risk_scoring.py)
# so that missingness alone can never push a work into HIGH/CRITICAL.

RISK_COMPONENT_WEIGHTS = {
    "PRE_SANCTION": {
        "rule_risk_component": 0.35,
        "statistical_anomaly_component": 0.15,
        "ml_anomaly_component": 0.15,
        "peer_anomaly_component": 0.20,
        "data_quality_component": 0.15,
    },
    "IN_PROGRESS": {
        "rule_risk_component": 0.35,
        "statistical_anomaly_component": 0.15,
        "ml_anomaly_component": 0.20,
        "peer_anomaly_component": 0.20,
        "data_quality_component": 0.10,
    },
    "POST_COMPLETION": {
        "rule_risk_component": 0.35,
        "statistical_anomaly_component": 0.15,
        "ml_anomaly_component": 0.20,
        "peer_anomaly_component": 0.25,
        "data_quality_component": 0.05,
    },
}

# Hard cap on how much of the final 0-100 score can come from the
# data-quality component alone, regardless of weight above. This directly
# implements "do not allow data-quality issues alone to dominate the score".
DATA_QUALITY_COMPONENT_CAP = 30.0

# overall_risk = max across lifecycle-applicable components, blended; see
# risk_scoring.py for exact formula. Bands:
RISK_BANDS = [
    (0, 24, "LOW"),
    (25, 49, "MEDIUM"),
    (50, 74, "HIGH"),
    (75, 100, "CRITICAL"),
]

# ---------------------------------------------------------------------------
# MISC
# ---------------------------------------------------------------------------

TOP_ANOMALIES_N = 100
