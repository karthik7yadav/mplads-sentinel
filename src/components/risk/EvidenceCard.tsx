import React from 'react'
import type { ContextualEvidence } from '../../types'
import { FileText, Calendar, Award, CheckCircle, HelpCircle } from 'lucide-react'

interface EvidenceCardProps {
  evidence: ContextualEvidence[]
  className?: string
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, className = '' }) => {
  const verifiedEvidence = evidence.filter((e) => e.found)

  return (
    <div className={`rounded-lg border border-slate-200/90 bg-white p-5 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
            Data & Provenance Context
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational data availability, lifecycle reconciliation, and data quality notes from eSAKSHI canonical records.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {verifiedEvidence.length} Contextual Stream(s)
        </span>
      </div>

      <div className="mt-4">
        {verifiedEvidence.length === 0 ? (
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <HelpCircle size={15} className="text-slate-400" />
            <span>No contextual data quality or provenance notes recorded for this work.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedEvidence.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-blue-50/40 border border-blue-200/70 text-xs space-y-2.5"
              >
                {/* Source & Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <FileText size={14} className="text-blue-700 shrink-0" />
                    <span>{item.source}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {item.date}
                      </span>
                    )}
                    {item.relevance && (
                      <span className="flex items-center gap-1 text-blue-800 bg-blue-100/70 px-1.5 py-0.5 rounded font-sans font-medium">
                        <Award size={12} /> {item.relevance} Relevance
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Statement */}
                {item.statement && (
                  <div className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded border border-blue-100">
                    "{item.statement}"
                  </div>
                )}

                {/* Contextual Explanation */}
                {item.contextualExplanation && (
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item.contextualExplanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-slate-400 italic">
        Note: Provenance streams reflect recorded MIS data availability and system integrity notes to assist verification, not conclusive determinations.
      </div>
    </div>
  )
}
