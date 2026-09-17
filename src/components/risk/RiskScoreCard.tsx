import React from 'react'
import type { RiskLevel } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { Info } from 'lucide-react'

interface RiskScoreCardProps {
  score: number
  level: RiskLevel
  confidence: number
  dataStreamsCount?: number
  dataQualityNote?: string
  confidenceNote?: string
  primaryReason: string
  primaryReasonSummary?: string
  recommendedAction: string
  className?: string
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  score,
  level,
  confidence,
  dataStreamsCount,
  dataQualityNote,
  confidenceNote,
  primaryReason,
  primaryReasonSummary,
  recommendedAction,
  className = '',
}) => {
  const isCritical = level === 'critical'
  const isHigh = level === 'high'

  const borderClass = isCritical
    ? 'border-rose-300 bg-rose-50/20'
    : isHigh
      ? 'border-amber-300 bg-amber-50/20'
      : 'border-slate-200 bg-white'

  const streams = dataStreamsCount !== undefined ? dataStreamsCount : (confidence > 80 ? 3 : 2)

  return (
    <div className={`rounded-xl border p-6 bg-white shadow-2xs ${borderClass} ${className}`}>
      {/* Top Banner: Score, Band, Data Quality, Directive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-5 border-b border-slate-200/80">
        {/* Risk Score */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
            Review Priority Score
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono tracking-tight text-slate-900">
              {score}
            </span>
            <span className="text-base text-slate-400 font-mono font-medium">/ 100</span>
          </div>
          <div className="mt-2">
            <RiskBadge level={level} size="md" />
          </div>
        </div>

        {/* Data Quality & Record Availability */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
            Data Quality & Record Availability
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono tracking-tight text-blue-900">
              {streams}
            </span>
            <span className="text-base text-slate-400 font-mono font-medium">/ 4 Streams</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-snug">
            {dataQualityNote || confidenceNote || `${streams} of 4 canonical lifecycle streams recorded on file (Recommendation, Sanction, Expenditure, Completion).`}
          </p>
        </div>

        {/* Action Needed */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
            Primary Signal & Directive
          </span>
          <div className="mt-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="font-semibold text-slate-900">{primaryReason}</div>
            {primaryReasonSummary && (
              <p className="text-[11px] text-slate-600 leading-relaxed">{primaryReasonSummary}</p>
            )}
            <div className="text-[11px] text-blue-700 font-medium pt-0.5">Directive: {recommendedAction}</div>
          </div>
        </div>
      </div>

      {/* Official Clarification Note */}
      <div className="mt-4 pt-1 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200/70">
        <Info size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="font-sans">
          <strong>Official Note:</strong> Risk score indicates administrative review priority, not fraud probability. Final decisions remain subject to human verification.
        </span>
      </div>
    </div>
  )
}
