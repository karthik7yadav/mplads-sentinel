import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ProgressBarProps {
  physical?: number
  financial?: number
  physicalReported?: boolean
  financialLabel?: string
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  physical,
  financial,
  physicalReported = true,
  financialLabel = 'Expenditure Utilization',
  showLabels = true,
  compact = false,
  className = '',
}) => {
  const isPhysicalKnown = Boolean(physicalReported && physical !== null && physical !== undefined)
  const hasFinancial = Boolean(financial !== null && financial !== undefined)
  const gap = isPhysicalKnown && hasFinancial ? (financial as number) - (physical as number) : 0
  const hasMismatch = isPhysicalKnown && hasFinancial && gap >= 25

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              Physical:{' '}
              {isPhysicalKnown ? (
                <strong className="text-slate-900 font-mono">{Math.round(physical as number)}%</strong>
              ) : (
                <span className="text-slate-400 font-mono italic">Not Reported in MIS</span>
              )}
            </span>
            <span className="text-slate-600">
              {financialLabel}:{' '}
              {hasFinancial ? (
                <strong className="text-slate-900 font-mono">{Math.round(financial as number)}%</strong>
              ) : (
                <span className="text-slate-400 font-mono italic">Not Available</span>
              )}
            </span>
          </div>
          {hasMismatch && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              <AlertCircle size={12} className="text-amber-600" />
              Gap: +{Math.round(gap)}%
            </span>
          )}
        </div>
      )}

      {/* Dual Progress Bars */}
      <div className="space-y-1">
        <div className="w-full bg-slate-100 rounded-full overflow-hidden h-2 border border-slate-200/60">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${isPhysicalKnown ? Math.min(100, Math.max(0, (physical as number) || 0)) : 0}%` }}
            title={isPhysicalKnown ? `Physical progress: ${physical}%` : 'Physical progress not reported in MIS'}
          />
        </div>
        <div className="w-full bg-slate-100 rounded-full overflow-hidden h-2 border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasMismatch ? 'bg-amber-500' : 'bg-blue-600'
            }`}
            style={{ width: `${hasFinancial ? Math.min(100, Math.max(0, (financial as number) || 0)) : 0}%` }}
            title={hasFinancial ? `${financialLabel}: ${financial}%` : `${financialLabel} not available`}
          />
        </div>
      </div>

      {!compact && (
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Physical Work
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                hasMismatch ? 'bg-amber-500' : 'bg-blue-600'
              }`}
            />{' '}
            Expenditure Booked
          </span>
        </div>
      )}
    </div>
  )
}
