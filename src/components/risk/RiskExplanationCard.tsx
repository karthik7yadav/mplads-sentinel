import React from 'react'
import type { AnomalyContributor } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { HelpCircle, Activity } from 'lucide-react'

interface RiskExplanationCardProps {
  anomalies: AnomalyContributor[]
  className?: string
}

export const RiskExplanationCard: React.FC<RiskExplanationCardProps> = ({
  anomalies,
  className = '',
}) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
        No active risk signals or anomalies detected for this work.
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {anomalies.map((item) => {
        const whyItMatters =
          item.whyItMatters ||
          (item.category === 'progress_mismatch'
            ? 'This pattern warrants verification of actual milestone progress before approving further expenditure vouchers.'
            : item.category === 'financial'
              ? 'Booked expenditure significantly deviates from the historical benchmark for comparable works of this category.'
              : item.category === 'timeline'
                ? 'Extended execution duration increases cost-escalation risk and indicates potential bottlenecks.'
                : item.category === 'vendor'
                  ? 'High concentration of works with the same contractor may limit competitive oversight.'
                  : 'Irregular MIS returns or late data submission affect reporting integrity.')

        const recommendedAction =
          item.recommendedAction ||
          (item.category === 'progress_mismatch'
            ? 'Conduct physical milestone reconciliation against sanctioned bills.'
            : item.category === 'financial'
              ? 'Request itemized expenditure breakdown and schedule of rates.'
              : item.category === 'timeline'
                ? 'Confirm current administrative status and request updated timeline.'
                : item.category === 'vendor'
                  ? 'Audit contract allocation and verify capacity constraints.'
                  : 'Direct implementing agency to submit updated progress certificate.')

        return (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200/90 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors"
          >
            {/* Top row: Title, Category, Severity */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  {item.title}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                  {item.category.replace('_', ' ')}
                </span>
              </div>
              <RiskBadge level={item.severity} size="sm" />
            </div>

            {/* Explanation */}
            <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
              {item.explanation}
            </p>

            {/* Metrics Comparison Grid */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200/60 font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">{item.metricLabel}</span>
                <span className="font-bold text-slate-900">{item.metricValue}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Expected Peer Benchmark</span>
                <span className="text-slate-600 font-semibold">{item.normalRange}</span>
              </div>
            </div>

            {/* Why it Matters & Recommended Action */}
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-1.5">
                <HelpCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-semibold">
                    Why It Deserves Review
                  </span>
                  <span className="text-slate-600 leading-snug">{whyItMatters}</span>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <Activity size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-blue-700 block font-semibold">
                    Recommended Verification Step
                  </span>
                  <span className="text-slate-700 font-medium leading-snug">{recommendedAction}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
