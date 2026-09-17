# Stage 2.2.1 — Required Test Case Regression Check

Per the task spec's "IMPORTANT EXAMPLES" section, all 8 required Work IDs
were re-checked against Stage 2.2's output. `overall_risk` and `risk_band`
are unchanged for all 8 (spot-checked directly, not just via the
full-file diff).

| Work ID | primary_risk_component | overall_risk | risk_band | Text changed? |
|---|---|---|---|---|
| WS/MP383/2024-2025/11215 | Deterministic compliance rule | 96.25 | CRITICAL | No |
| WS/MP18167/2025-2026/228471 | Peer comparison | 78.07 | CRITICAL | No |
| WS/MP446/2023-2024/122215 | **ML anomaly model** | 72.25 | HIGH | **Yes** |
| WS/MP383/2024-2025/11216 | Deterministic compliance rule | 95.14 | CRITICAL | No |
| WS/MP18019/2025-2026/216372 | Data quality / coverage uncertainty | 15.80 | LOW | No |
| WS/MP508/2023-2024/13249 | Deterministic compliance rule | 61.64 | HIGH | No |
| WS/MP18112/2025-2026/177331 | Deterministic compliance rule | 74.99 | HIGH | No |
| WS/MP18177/2025-2026/168464 | Deterministic compliance rule | 74.98 | HIGH | No |

Only `WS/MP446/2023-2024/122215` (the ML-dominant required case) has
different text in this release, as expected — it is exactly the case
this release targets. Its risk score and band are unchanged.

**Before (Stage 2.2):**
> "Considered together — financial amounts, durations, payment patterns,
> and data completeness — this work's overall profile is unusual
> relative to other in-progress works. This is a holistic pattern signal
> from an unsupervised anomaly model: it does not point to one specific
> field, and 'unusual' does not mean 'improper'."

**After (Stage 2.2.1):**
> "No single deterministic rule explains this work's review priority. An
> unsupervised anomaly model ranks its overall combination of
> characteristics as atypical relative to other in-progress works.
> Looking at this work's own individual measurements (not just the
> combination), the following stood out on their own: payment-pattern
> (number of payment events (100.0th percentile among comparable works);
> number of distinct vendors (100.0th percentile across the portfolio);
> vendor concentration (3.2th percentile across the portfolio); and
> multiple payments recorded on the same day). This is a holistic
> pattern signal: it does not point to one single field as 'the' cause,
> and 'unusual' does not mean 'improper'."

The new text is strictly more specific and better evidenced than the
old one: it correctly identifies that this particular work's anomaly
signal is driven by its **payment pattern** (very high payment-event
count, maximal distinct-vendor count, unusually low vendor concentration,
and same-day multi-payment activity) — not by financial amounts or
duration, which the old template implied without support. Every figure
quoted traces to `risk_features.csv` (payment_event_percentile_in_peer_group,
unique_vendor_count_statistical_anomaly/_percentile,
vendor_concentration_statistical_anomaly/_percentile,
same_day_multi_payment_indicator).
