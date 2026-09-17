import React from 'react'
import type { CitizenNeed } from '../../types'
import { SyntheticBadge } from '../common/SyntheticBadge'
import { Users, MapPin, Sparkles } from 'lucide-react'

interface CitizenNeedCardProps {
  need: CitizenNeed
  onReviewSuggestion?: (need: CitizenNeed) => void
  className?: string
}

export const CitizenNeedCard: React.FC<CitizenNeedCardProps> = ({
  need,
  onReviewSuggestion,
  className = '',
}) => {
  const isHigh = need.priority === 'High'

  return (
    <div
      className={`rounded-xl border p-5 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
        isHigh ? 'border-blue-200 hover:border-blue-300' : 'border-slate-200 hover:border-slate-300'
      } ${className}`}
    >
      <div>
        {/* Top Metadata: Severity Tag & Secondary Demo Indicator */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-md font-mono ${
              isHigh ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {need.priority} Priority
          </span>
          <SyntheticBadge label="Demo Need" />
        </div>

        {/* 1. Need Title */}
        <h4 className="mt-3 text-base font-bold text-slate-900 tracking-tight leading-snug">
          {need.category}
        </h4>

        {/* 2. Location */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <MapPin size={13} className="shrink-0 text-slate-400" />
          <span>{need.location}</span>
        </div>

        {/* 3. Short Summary (2-3 lines clamp) */}
        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
          {need.summary}
        </p>
      </div>

      {/* 5. Verified Petitions & 6. AI Action */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono font-semibold">
          <Users size={14} className="text-blue-600 shrink-0" />
          <span>{need.requestCount} Verified Petitions</span>
        </div>
        {onReviewSuggestion && (
          <button
            type="button"
            onClick={() => onReviewSuggestion(need)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles size={13} />
            <span>AI Suggestion</span>
          </button>
        )}
      </div>
    </div>
  )
}
