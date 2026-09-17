import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { RiskReassessmentResult } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { ArrowRight, TrendingUp, ShieldAlert, ListOrdered } from 'lucide-react'

interface RiskReassessmentModalProps {
  result: RiskReassessmentResult | null
  isOpen: boolean
  onClose: () => void
}

export const RiskReassessmentModal: React.FC<RiskReassessmentModalProps> = ({
  result,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate()

  // Escape key handler
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !result) return null

  const isSpike = result.riskDelta > 0

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Risk Assessment Updated</h3>
              <p className="text-[11px] text-slate-300 font-mono">{result.projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Risk Change Comparison Card */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              {/* Previous Risk */}
              <div className="text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Previous Score
                </span>
                <span className="text-2xl font-bold font-mono text-slate-700">
                  {result.previousRisk}
                </span>
                <div className="mt-1">
                  <RiskBadge level={result.previousRiskLevel} size="sm" />
                </div>
              </div>

              {/* Arrow & Delta */}
              <div className="flex flex-col items-center px-3">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSpike ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {result.riskDelta > 0 ? `+${result.riskDelta}` : `${result.riskDelta}`}
                </span>
                <ArrowRight size={18} className="text-slate-400 my-1" />
              </div>

              {/* Updated Risk */}
              <div className="text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Current Score
                </span>
                <span
                  className={`text-2xl font-bold font-mono ${
                    result.updatedRisk >= 80 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {result.updatedRisk}
                </span>
                <div className="mt-1">
                  <RiskBadge level={result.updatedRiskLevel} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* New Signal Explanation */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">
              Primary Risk Signal Detected
            </span>
            <div className="p-3 rounded-md bg-amber-50/80 border border-amber-200 text-amber-950 font-medium leading-relaxed flex items-start gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{result.primaryReason}</div>
                <div className="text-[11px] text-amber-900 mt-1">
                  Expenditure booking exceeds reported physical milestone pace.
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Outcome Pill */}
          {result.addedToPriorityQueue && (
            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-blue-900">
              <ListOrdered size={16} className="text-blue-600 shrink-0" />
              <div>
                <strong className="block text-xs font-semibold">Added to Priority Queue</strong>
                <span className="text-[11px] text-blue-800">
                  Targeted verification alert dispatched to District Authority & State Nodal Cell.
                </span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/priority-queue')
              }}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              Go to Priority Queue <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
