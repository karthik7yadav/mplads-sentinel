import React from 'react'
import type { AiWorkSuggestion } from '../../types'
import { formatInrFromLakhs } from '../../lib/format'
import { SyntheticBadge } from '../common/SyntheticBadge'
import { Sparkles, ArrowRight } from 'lucide-react'

interface WorkSuggestionCardProps {
  suggestion: AiWorkSuggestion
  onDraftRecommendation: (suggestion: AiWorkSuggestion) => void
  className?: string
}

export const WorkSuggestionCard: React.FC<WorkSuggestionCardProps> = ({
  suggestion,
  onDraftRecommendation,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header: AI Assistance Tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 font-semibold">
              <Sparkles size={11} />
              AI-Assisted Suggestion
            </span>
            <SyntheticBadge label="Synthetic demo" />
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium shrink-0">
            {suggestion.category}
          </span>
        </div>

        {/* Suggested Title */}
        <h3 className="mt-3 text-base font-bold text-slate-900 tracking-tight leading-snug">
          {suggestion.suggestedTitle}
        </h3>

        {/* Rationale */}
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {suggestion.rationale}
        </p>

        {/* Context Grid: Peer cost & Existing asset check */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Historical Peer Range:</span>
            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
              {formatInrFromLakhs(suggestion.estimatedCostMinLakhs)} –{' '}
              {formatInrFromLakhs(suggestion.estimatedCostMaxLakhs)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Asset Deduplication Check:</span>
              <span
                className={`font-semibold font-mono ${
                  suggestion.potentialExistingAsset === 'No Overlap Detected'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {suggestion.potentialExistingAsset}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {suggestion.existingAssetNote}
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">
          Peer Median: <strong className="text-slate-800">{formatInrFromLakhs(suggestion.peerMedianLakhs)}</strong>
        </span>
        <button
          type="button"
          onClick={() => onDraftRecommendation(suggestion)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          Review & Draft <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}
