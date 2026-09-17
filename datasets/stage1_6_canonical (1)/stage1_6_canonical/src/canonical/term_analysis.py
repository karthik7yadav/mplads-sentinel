"""
Parliamentary-term evidence extraction. Vendored unchanged from Stage 1.5
src/term_analysis.py.

ABSOLUTE RULES ENFORCED HERE (per Stage 1.6 spec Part 11):
  - Term is NEVER inferred from completion_date, financial_year, work_id
    year component, dataset package, or MP-name suffix absence.
  - The ONLY evidence accepted is an EXPLICIT "(<ordinal> Lok Sabha)"
    marker attached to mp_name in that specific source record.
  - No marker -> term = "Unknown", confidence = "UNKNOWN".
"""
import re
import pandas as pd

_SUFFIX_RE = re.compile(r"\(\s*(\d+)\w*\s*Lok\s*Sabha\s*\)", re.IGNORECASE)


def extract_term_evidence(mp_name) -> tuple[str, str, str]:
    if not isinstance(mp_name, str) or not mp_name.strip():
        return "Unknown", "UNKNOWN", "no_mp_name_available"
    m = _SUFFIX_RE.search(mp_name)
    if m:
        n = m.group(1)
        return f"{n}th Lok Sabha", "HIGH", "explicit_suffix_in_mp_name"
    return "Unknown", "UNKNOWN", "no_explicit_term_marker_in_source_record"


def add_term_columns(df: pd.DataFrame, mp_name_col: str, prefix: str) -> pd.DataFrame:
    out = df.copy()
    if mp_name_col not in out.columns:
        out[f"{prefix}_term"] = "Unknown"
        out[f"{prefix}_term_confidence"] = "UNKNOWN"
        out[f"{prefix}_term_evidence"] = "column_not_present"
        return out
    results = out[mp_name_col].apply(extract_term_evidence)
    out[f"{prefix}_term"] = results.apply(lambda r: r[0])
    out[f"{prefix}_term_confidence"] = results.apply(lambda r: r[1])
    out[f"{prefix}_term_evidence"] = results.apply(lambda r: r[2])
    return out


def determine_cross_term(term_a, conf_a, term_b, conf_b) -> str:
    """TRUE only if both ends are HIGH/MEDIUM confidence and differ.
    FALSE only if both ends are HIGH/MEDIUM confidence and equal.
    Otherwise UNKNOWN - never guessed."""
    sufficient = {"HIGH", "MEDIUM"}
    if conf_a in sufficient and conf_b in sufficient:
        return "TRUE" if term_a != term_b else "FALSE"
    return "UNKNOWN"
