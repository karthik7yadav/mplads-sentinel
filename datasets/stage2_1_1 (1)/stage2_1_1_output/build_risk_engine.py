#!/usr/bin/env python3
"""
Stage 2 -- MPLADS Sentinel Risk & Intelligence Engine
Build orchestrator.

Runs the full pipeline end-to-end against the canonical Stage 1.6 data and
writes every deliverable listed in the Stage 2 spec's EXPECTED OUTPUT tree.

Usage:
    python3 build_risk_engine.py
"""

import json
import pickle
import sys
import time
from pathlib import Path
import argparse

sys.path.insert(0, str(Path(__file__).parent / "src"))

import pandas as pd

from risk import (
    config,
    feature_engineering as fe,
    peer_benchmark as pb,
    anomaly_detection as ad,
    rules,
    risk_scoring as rs,
    explainability as ex,
    top_anomalies as ta,
    reports,
    validation,
)


def main():
    parser = argparse.ArgumentParser(description="Build MPLADS Sentinel Stage 2 risk engine")
    parser.add_argument("--canonical-dir", default=None, help="Stage 1.6 canonical data directory")
    parser.add_argument("--output-dir", default=None, help="Stage 2 output directory")
    args = parser.parse_args()
    config.configure_runtime_paths(args.canonical_dir, args.output_dir)
    t_start = time.time()
    log = []

    def step(msg):
        elapsed = time.time() - t_start
        line = f"[{elapsed:6.1f}s] {msg}"
        print(line)
        log.append(line)

    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------------
    # PART 1 + 2: Feature engineering + temporal safety
    # ---------------------------------------------------------------
    step("Building risk_features.csv (Parts 1-2)...")
    features = fe.build_risk_features()

    # ---------------------------------------------------------------
    # PART 3: Peer benchmarking
    # ---------------------------------------------------------------
    step("Computing peer benchmarks (Part 3)...")
    features = pb.add_peer_benchmarks(features)

    # ---------------------------------------------------------------
    # PART 4: Statistical anomaly detection
    # ---------------------------------------------------------------
    step("Computing statistical anomalies (Part 4)...")
    stat_anomalies = ad.compute_statistical_anomalies(features)
    features = features.join(stat_anomalies)

    # Persist risk_features.csv now (drop the working reference-date globals).
    features_out_cols = [c for c in features.columns]
    features.to_csv(config.OUTPUT_DIR / "risk_features.csv", index=False)
    step(f"Wrote risk_features.csv ({len(features)} rows, {len(features_out_cols)} columns).")

    # ---------------------------------------------------------------
    # PART 5: Deterministic compliance / rule engine
    # ---------------------------------------------------------------
    step("Running rule engine (Part 5)...")
    signals = rules.compute_rule_signals(features)
    signals.to_csv(config.OUTPUT_DIR / "risk_signals.csv", index=False)
    step(f"Wrote risk_signals.csv ({len(signals)} signal rows across {signals['work_id'].nunique() if len(signals) else 0} works).")

    # ---------------------------------------------------------------
    # PART 6: Isolation Forest
    # ---------------------------------------------------------------
    step("Training Isolation Forest models (Part 6)...")
    models, model_meta = ad.train_isolation_forests(features)
    ml_scores = ad.score_isolation_forests(features, models)

    with open(config.MODELS_DIR / "isolation_forest.pkl", "wb") as f:
        pickle.dump({mode: {"model": bundle["model"], "columns": bundle["columns"]} for mode, bundle in models.items()}, f)

    with open(config.MODELS_DIR / "model_metadata.json", "w") as f:
        json.dump(model_meta, f, indent=2, default=str)
    step("Saved models/isolation_forest.pkl and models/model_metadata.json.")

    # ---------------------------------------------------------------
    # PART 7: Risk scoring
    # ---------------------------------------------------------------
    step("Computing risk scores (Part 7)...")
    scores = rs.compute_risk_scores(features, signals, ml_scores)
    scores.to_csv(config.OUTPUT_DIR / "risk_scores.csv", index=False)
    step(f"Wrote risk_scores.csv ({len(scores)} rows).")

    # ---------------------------------------------------------------
    # PART 8 + 9: Explainability + recommended action
    # ---------------------------------------------------------------
    step("Building explanations (Parts 8-9)...")
    explanations = ex.build_risk_explanations(scores, signals)
    explanations.to_csv(config.OUTPUT_DIR / "risk_explanations.csv", index=False)
    step(f"Wrote risk_explanations.csv ({len(explanations)} rows).")

    # ---------------------------------------------------------------
    # PART 10: Top anomalies
    # ---------------------------------------------------------------
    step("Building top_anomalies.csv (Part 10)...")
    top = ta.build_top_anomalies(features, scores, explanations, signals)
    top.to_csv(config.OUTPUT_DIR / "top_anomalies.csv", index=False)
    step(f"Wrote top_anomalies.csv ({len(top)} rows).")

    # ---------------------------------------------------------------
    # PART 11: Risk distribution report
    # ---------------------------------------------------------------
    step("Writing risk_distribution_report.md (Part 11)...")
    reports.write_risk_distribution_report(features, scores, signals, config.REPORTS_DIR / "risk_distribution_report.md")

    # ---------------------------------------------------------------
    # PART 12: Feature dictionary
    # ---------------------------------------------------------------
    step("Writing feature_dictionary.md (Part 12)...")
    reports.write_feature_dictionary(config.REPORTS_DIR / "feature_dictionary.md")

    # ---------------------------------------------------------------
    # PART 13: Validation
    # ---------------------------------------------------------------
    step("Running validation checks (Part 13)...")
    checks = validation.run_validation(
        features, scores, explanations, signals, models, model_meta, config.CANONICAL_CONFLICTS_CSV
    )
    stage2_passes = validation.write_validation_report(checks, config.REPORTS_DIR / "risk_engine_validation.md")
    step(f"Validation complete. Stage 2 passes: {stage2_passes}")

    total_elapsed = time.time() - t_start
    step(f"Build complete in {total_elapsed:.1f}s.")

    return {
        "features": features,
        "signals": signals,
        "scores": scores,
        "explanations": explanations,
        "top_anomalies": top,
        "checks": checks,
        "stage2_passes": stage2_passes,
        "model_meta": model_meta,
        "log": log,
    }


if __name__ == "__main__":
    main()
