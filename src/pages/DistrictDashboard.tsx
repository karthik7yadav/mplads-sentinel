import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import type { Project } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { KpiCard } from '../components/common/KpiCard'
import { PriorityCard } from '../components/priority/PriorityCard'
import { EmptyState } from '../components/common/EmptyState'
import { AssignVerificationModal } from '../components/verification/AssignVerificationModal'
import { RECOMMENDED_WORKS } from '../data/realData'
import { formatInrFromLakhs } from '../lib/format'
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  ArrowRight,
  FileCheck2,
} from 'lucide-react'

export const DistrictDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { scopedProjects, priorityQueue } = useProjectData()
  const navigate = useNavigate()

  const [selectedProjectForVerification, setSelectedProjectForVerification] = useState<Project | null>(null)

  // 6 Essential Operational KPIs (Section 11)
  const totalWorks = scopedProjects.length
  const ongoingWorks = scopedProjects.filter((p) => p.status === 'in_progress' || p.status === 'flagged').length
  const completedWorks = scopedProjects.filter((p) => p.status === 'completed' || p.status === 'verified').length
  const criticalWorks = scopedProjects.filter((p) => p.riskLevel === 'critical').length
  const highRiskWorks = scopedProjects.filter((p) => p.riskLevel === 'high').length
  const pendingVerification = scopedProjects.filter((p) => p.inspectionStatus === 'requested' || p.inspectionStatus === 'assigned').length

  // Top works requiring attention (Priority Queue top 4)
  const topAttentionProjects = priorityQueue.slice(0, 4)

  return (
    <AppShell
      title={`District Monitoring — ${currentUser.district || 'Rajsamand'}`}
      subtitle="Works requiring review, monitoring and verification in your district."
    >
      {/* District Context & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
            Nodal District Collectorate
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
            {currentUser.district || 'Rajsamand'} District Administration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Operational decision-support dashboard for MPLADS sanctions, field verifications, and progress reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/projects?tab=FLAGGED')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ShieldAlert size={14} className="text-rose-600" />
            {criticalWorks + highRiskWorks} Flagged Works
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            View All Projects <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Top 6 KPI Cards (Section 11) */}
      <section aria-label="District Key Metrics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Works"
            value={totalWorks}
            subtitle={`${currentUser.district} jurisdiction`}
            icon={FolderKanban}
            onClick={() => navigate('/projects')}
          />
          <KpiCard
            title="Ongoing"
            value={ongoingWorks}
            subtitle="In physical execution"
            icon={Clock}
            variant="info"
            onClick={() => navigate('/projects?tab=ONGOING')}
          />
          <KpiCard
            title="Completed"
            value={completedWorks}
            subtitle="Verified or finished"
            icon={CheckCircle2}
            variant="success"
            onClick={() => navigate('/projects?tab=COMPLETED')}
          />
          <KpiCard
            title="Critical"
            value={criticalWorks}
            subtitle="Immediate review required"
            icon={ShieldAlert}
            variant="critical"
            onClick={() => navigate('/priority-queue')}
          />
          <KpiCard
            title="High Risk"
            value={highRiskWorks}
            subtitle="Signal mismatch detected"
            icon={AlertTriangle}
            variant="high"
            onClick={() => navigate('/priority-queue')}
          />
          <KpiCard
            title="Verification Pending"
            value={pendingVerification}
            subtitle="Inspections requested"
            icon={ClipboardCheck}
            variant="warning"
            onClick={() => navigate('/verification')}
          />
        </div>
      </section>

      {/* MAIN SECTION: WORKS REQUIRING ATTENTION (Priority Cards Grid, Section 11) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              Works Requiring Attention
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Prioritized operational queue based on progress mismatches, peer variance, and expenditure pace.
            </p>
          </div>

          <button
            onClick={() => navigate('/priority-queue')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            Full Priority Queue ({priorityQueue.length}) <ArrowRight size={13} />
          </button>
        </div>

        {topAttentionProjects.length === 0 ? (
          <EmptyState
            title="No critical projects currently require attention"
            description="All active works in your district are progressing within expected physical and financial benchmark ranges."
            variant="success"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {topAttentionProjects.map((project, index) => (
              <PriorityCard
                key={project.id}
                project={project}
                rank={index + 1}
                onAssignVerification={(p) => setSelectedProjectForVerification(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION: Recommended Works Awaiting Pre-Sanction Review (Section 4) */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
              <FileCheck2 size={16} className="text-blue-600" />
              Pre-Sanction Review Queue
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Works recommended by Member of Parliament awaiting District Authority administrative sanction.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            {RECOMMENDED_WORKS.length} Recommendations Pending
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECOMMENDED_WORKS.map((work) => (
            <div
              key={work.id}
              className="p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-xs font-bold text-slate-500">{work.id}</span>
                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                      work.status === 'Ready for Decision'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : work.status === 'Information Requested'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {work.status}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-bold text-slate-900 line-clamp-1">
                  {work.projectName}
                </h4>

                <div className="mt-1 text-xs text-slate-500 truncate">
                  {work.location} • <span className="font-medium text-slate-700">{work.projectType}</span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Estimated Outlay:</span>
                    <strong className="font-mono text-slate-900">{formatInrFromLakhs(work.estimatedLakhs)}</strong>
                  </div>
                  <div className="truncate text-slate-500">
                    Required: {work.requiredInformation}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Pre-Sanction Review</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('/projects?tab=RECOMMENDED')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    Sanction / Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assign Verification Modal */}
      {selectedProjectForVerification && (
        <AssignVerificationModal
          project={selectedProjectForVerification}
          isOpen={!!selectedProjectForVerification}
          onClose={() => setSelectedProjectForVerification(null)}
        />
      )}
    </AppShell>
  )
}
