
import time

print("Running per-row explanation builder over all works...")
t0 = time.time()
records = big.to_dict('records')
out_rows = []
errors = []
for i, r in enumerate(records):
    try:
        out_rows.append(build_row(r))
    except Exception as e:
        errors.append((r.get('work_id'), str(e)))
    if (i + 1) % 10000 == 0:
        print(f"  ...{i+1}/{len(records)} ({time.time()-t0:.1f}s elapsed)")

print(f"Done in {time.time()-t0:.1f}s. Errors: {len(errors)}")
if errors:
    print("First 5 errors:", errors[:5])
    raise SystemExit("Aborting due to per-row build errors")

di = pd.DataFrame(out_rows)
print("decision_intelligence shape:", di.shape)

COLUMN_ORDER = [
    "work_id", "state", "constituency", "work_category", "work_description", "lifecycle_mode",
    "overall_risk", "risk_band", "primary_risk_component", "secondary_risk_component",
    "primary_reason_title", "primary_reason_summary", "why_it_matters", "recommended_verification",
    "confidence_or_data_availability_note",
    "recommended_amount", "sanctioned_amount", "total_expenditure", "expenditure_to_sanction_ratio",
    "expenditure_event_count",
    "peer_metric_name", "peer_level", "peer_group_size", "peer_median", "peer_mean", "peer_percentile",
    "peer_deviation", "peer_comparison_text",
    "recommendation_date", "sanction_date", "completion_date", "implementation_duration_days",
    "peer_duration_median", "duration_deviation", "timeline_comparison_text",
    "technical_signal", "technical_metric", "technical_value", "technical_threshold",
    "technical_component", "technical_component_contribution",
    "available_financial_information", "available_lifecycle_information", "available_completion_information",
    "data_quality_note",
    "recommended_action_title", "recommended_action_steps",
]
di = di[COLUMN_ORDER]
di.to_csv(f'{OUT}/decision_intelligence.csv', index=False)
print(f"Wrote {OUT}/decision_intelligence.csv")
