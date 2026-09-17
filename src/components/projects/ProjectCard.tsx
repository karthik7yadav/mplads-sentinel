import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { StatusBadge } from '../common/StatusBadge'
import { ProgressBar } from '../common/ProgressBar'
import { formatInrFromLakhs } from '../../lib/format'
import { MapPin, ArrowUpRight } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  className?: string
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, className = '' }) => {
  const navigate = useNavigate()

  return (
    <div
      className={`rounded-lg border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Meta: Work ID, Category, Lifecycle */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-mono font-medium text-slate-500 truncate" title={project.id}>
            {project.id}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>

        {/* Project Name & Location */}
        <h3
          className="mt-2 text-sm font-bold text-slate-900 line-clamp-2 hover:text-blue-700 cursor-pointer transition-colors"
          onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)}
        >
          {project.name}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={12} className="shrink-0 text-slate-400" />
          <span className="truncate">{project.district}, {project.state}</span>
          <span className="text-slate-300">•</span>
          <span className="truncate font-medium text-slate-600">{project.projectType}</span>
        </div>

        {/* Financial & Physical Metrics */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Sanctioned</span>
            <span className="font-semibold text-slate-800 font-mono text-xs">
              {formatInrFromLakhs(project.sanctionedLakhs)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Booked Exp.</span>
            <span className="font-semibold text-slate-800 font-mono text-xs">
              {formatInrFromLakhs(project.expenditureLakhs)}
            </span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="mt-3">
          <ProgressBar
            physical={project.physicalProgress}
            financial={project.financialProgress}
            physicalReported={project.physicalProgressReported}
            compact
          />
        </div>
      </div>

      {/* Footer: Risk Badge & View Project CTA */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <RiskBadge level={project.riskLevel} score={project.riskScore} size="sm" showScore />
        <button
          type="button"
          onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors py-1 px-2 rounded hover:bg-blue-50"
        >
          View Project <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  )
}
