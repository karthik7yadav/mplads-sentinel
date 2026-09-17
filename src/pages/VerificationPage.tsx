import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import type { Project } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { StatusBadge } from '../components/common/StatusBadge'
import { RiskBadge } from '../components/common/RiskBadge'
import { SyntheticBadge } from '../components/common/SyntheticBadge'
import { OfficialFindingModal } from '../components/verification/OfficialFindingModal'
import { EmptyState } from '../components/common/EmptyState'
import { formatDate } from '../lib/format'
import {
  ClipboardCheck,
  Calendar,
  UserCheck,
  FileCheck,
  ArrowRight,
} from 'lucide-react'

export const VerificationPage: React.FC = () => {
  const { canRecordFinding } = useAuth()
  const { inspections, getProjectById } = useProjectData()
  const navigate = useNavigate()

  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all')
  const [selectedFindingProject, setSelectedFindingProject] = useState<{
    project: Project
    inspectionId: string
  } | null>(null)

  // Status categories per Section 25
  const statuses = [
    'all',
    'requested',
    'assigned',
    'in_progress',
    'report_submitted',
    'completed',
  ]

  const filteredInspections = inspections.filter((i) => {
    if (activeStatusFilter !== 'all' && i.status !== activeStatusFilter) return false
    return true
  })

  return (
    <AppShell
      title="Field Verifications & Findings"
      subtitle="Physical measurement verification, joint inspections, and official administrative determinations."
    >
      {/* Header & Status Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <ClipboardCheck size={16} className="text-blue-600" />
              Inspection & Evidence Tracking
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Coordinated by District Authority to reconcile physical progress against contractor billing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SyntheticBadge label="Synthetic demonstration cases" />
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {inspections.length} Total Cases
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs font-mono">
          {statuses.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveStatusFilter(st)}
              className={`px-3 py-1 rounded-md transition-colors uppercase cursor-pointer ${
                activeStatusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections Cards Grid */}
      <section aria-label="Verification Orders">
        {filteredInspections.length === 0 ? (
          <EmptyState
            title="No verification cases match this status filter"
            description="Field inspections are assigned dynamically when high-risk progress discrepancies are detected."
            variant="neutral"
            actionLabel="View All Verifications"
            onAction={() => setActiveStatusFilter('all')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInspections.map((insp) => {
              const project = getProjectById(insp.projectId)

              return (
                <div
                  key={insp.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: Project ID & Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {insp.projectId}
                      </span>
                      <StatusBadge status={insp.status} size="sm" />
                    </div>

                    {/* Location / Work */}
                    <h3
                      className="mt-2 text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer transition-colors"
                      onClick={() => navigate(`/projects/${insp.projectId}`)}
                    >
                      {insp.location}
                    </h3>

                    {/* Risk Badge */}
                    <div className="mt-2 flex items-center gap-2">
                      <RiskBadge level={insp.riskLevel} size="sm" />
                    </div>

                    {/* Scope & Reason */}
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-md border border-slate-200/60">
                      <strong>Directive:</strong> {insp.reason}
                    </p>

                    {/* Assigned Officer & Date */}
                    <div className="mt-3 space-y-1 text-xs text-slate-500 font-mono">
                      {insp.assignedOfficer && (
                        <div className="flex items-center gap-1.5 text-slate-700 font-sans">
                          <UserCheck size={13} className="text-blue-600 shrink-0" />
                          <span className="font-medium">{insp.assignedOfficer}</span>
                        </div>
                      )}
                      {insp.inspectionDate && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={13} className="shrink-0" />
                          <span>Target Date: {formatDate(insp.inspectionDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Final Recommendation if Recorded */}
                    {insp.finalRecommendation && (
                      <div className="mt-3 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-center gap-2">
                        <FileCheck size={14} className="text-emerald-700 shrink-0" />
                        <div>
                          <span>Official Finding: <strong>{insp.finalRecommendation}</strong></span>
                          {insp.remarks && <p className="text-[11px] text-emerald-900 mt-0.5">{insp.remarks}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: Review Work & Record Finding */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${insp.projectId}`)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      Review Project Data <ArrowRight size={12} />
                    </button>

                    {canRecordFinding && (
                      <button
                        type="button"
                        onClick={() => {
                          if (project) {
                            setSelectedFindingProject({ project, inspectionId: insp.id })
                          }
                        }}
                        className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Record Official Finding
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Official Finding Modal */}
      {selectedFindingProject && (
        <OfficialFindingModal
          project={selectedFindingProject.project}
          inspectionId={selectedFindingProject.inspectionId}
          isOpen={!!selectedFindingProject}
          onClose={() => setSelectedFindingProject(null)}
        />
      )}
    </AppShell>
  )
}
