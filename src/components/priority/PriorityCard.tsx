import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { StatusBadge } from '../common/StatusBadge'
import { ArrowRight, AlertCircle, CheckSquare } from 'lucide-react'

interface PriorityCardProps {
  project: Project
  rank: number
  onAssignVerification?: (project: Project) => void
  className?: string
}

export const PriorityCard: React.FC<PriorityCardProps> = ({
  project,
  rank,
  onAssignVerification,
  className = '',
}) => {
  const navigate = useNavigate()
  const formattedRank = rank < 10 ? `#0${rank}` : `#${rank}`

  const isCritical = project.riskLevel === 'critical'
  const cardBorder = isCritical
    ? 'border-rose-300 hover:border-rose-400 bg-white'
    : 'border-amber-200 hover:border-amber-300 bg-white'

  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${cardBorder} ${className}`}
    >
      <div>
        {/* Top Header: Rank + Risk Badge */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            {formattedRank}
          </span>
          <RiskBadge level={project.riskLevel} score={project.riskScore} size="sm" showScore />
        </div>

        {/* Project Name + Work ID + Lifecycle */}
        <div className="mt-3.5">
          <h3
            className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 hover:text-blue-700 cursor-pointer transition-colors"
            onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)}
          >
            {project.name}
          </h3>
          <div className="flex items-center justify-between mt-1 text-xs">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-mono text-xs text-slate-500 shrink-0">{project.id}</span>
              {(project.constituency || project.state) && (
                <span className="text-xs text-slate-400 truncate">
                  • {project.constituency ? `${project.constituency}, ${project.state}` : project.state}
                </span>
              )}
            </div>
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>

        {/* Key Supporting Metrics: Financial vs Physical Progress */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-600">
            <span>Financial Progress:</span>
            <span className="font-mono font-bold text-slate-900">
              {project.financialProgress !== undefined ? `${project.financialProgress}%` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Physical Progress:</span>
            <span className="font-mono font-bold text-slate-900">
              {project.physicalProgressReported && project.physicalProgress !== undefined
                ? `${project.physicalProgress}%`
                : 'Not Reported in MIS'}
            </span>
          </div>
          {project.physicalProgressReported && project.financialProgress !== undefined && project.physicalProgress !== undefined && (
            <div className="flex justify-between items-center text-xs text-amber-800 font-medium pt-1 border-t border-slate-200">
              <span>Progress Discrepancy:</span>
              <span className="font-mono font-bold">
                +{project.financialProgress - project.physicalProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Primary Signal Box */}
        <div className="mt-4 space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Primary Signal
          </div>
          <div className="text-xs font-semibold text-slate-800 flex items-start gap-2 leading-relaxed">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{project.primaryReason}</span>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="mt-3.5 space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Recommended Action
          </div>
          <div className="text-xs text-slate-700 font-medium flex items-start gap-2 leading-relaxed">
            <CheckSquare size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{project.recommendedAction}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Review Project & Assign Verification */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          Review Project <ArrowRight size={13} />
        </button>
        {onAssignVerification && (
          <button
            type="button"
            onClick={() => onAssignVerification(project)}
            className="text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Assign Verification"
          >
            Assign
          </button>
        )}
      </div>
    </div>
  )
}
