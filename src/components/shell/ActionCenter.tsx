import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProjectData } from '../../context/ProjectDataContext'
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Layers,
} from 'lucide-react'

export const ActionCenter: React.FC = () => {
  const { role, currentUser } = useAuth()
  const { priorityQueue, inspections, mpRecommendations, citizenNeeds, aiSuggestions } = useProjectData()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Generate concise role-specific operational tasks conforming to Section 9
  const getTasks = () => {
    switch (role) {
      case 'dm': {
        const topCritical = priorityQueue.find((p) => p.riskLevel === 'critical')
        const pendingInsp = inspections.find((i) => i.status === 'requested' || i.status === 'assigned')
        const pendingRec = mpRecommendations.find((r) => r.status === 'Submitted' || r.status === 'Under Review')

        return [
          topCritical && {
            id: 'task-dm-1',
            level: 'critical',
            dot: 'bg-rose-600',
            border: 'border-rose-200 bg-rose-50/50 hover:bg-rose-50',
            icon: ShieldAlert,
            iconColor: 'text-rose-600',
            label: 'Critical Review Required',
            description: `${topCritical.name} (${topCritical.id})`,
            action: () => navigate(`/projects/${encodeURIComponent(topCritical.id)}`),
          },
          pendingInsp && {
            id: 'task-dm-2',
            level: 'high',
            dot: 'bg-amber-600',
            border: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
            label: 'Verification Assigned — Demo Workflow',
            description: `Field inspection pending for ${pendingInsp.location}`,
            action: () => navigate('/verification'),
          },
          {
            id: 'task-dm-3',
            level: 'medium',
            dot: 'bg-yellow-500',
            border: 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50',
            icon: Clock,
            iconColor: 'text-yellow-600',
            label: 'Operational Follow-up',
            description: 'Review ongoing works in the district portfolio.',
            action: () => navigate('/projects?tab=ONGOING'),
          },
          pendingRec && {
            id: 'task-dm-4',
            level: 'info',
            dot: 'bg-blue-600',
            border: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
            icon: FileCheck2,
            iconColor: 'text-blue-600',
            label: 'Recommendation Awaiting Review — Demo Workflow',
            description: `${pendingRec.projectName} (${pendingRec.estimatedLakhs}L)`,
            action: () => navigate('/recommendations'),
          },
        ].filter(Boolean)
      }

      case 'nodal': {
        const topCritical = priorityQueue.find((p) => p.riskLevel === 'critical')

        return [
          {
            id: 'task-sn-1',
            level: 'critical',
            dot: 'bg-rose-600',
            border: 'border-rose-200 bg-rose-50/50 hover:bg-rose-50',
            icon: ShieldAlert,
            iconColor: 'text-rose-600',
            label: 'Critical State Review Required',
            description: topCritical
              ? `${topCritical.name} (${topCritical.id})`
              : 'Review high-priority works requiring state-level administrative attention.',
            action: () =>
              topCritical
                ? navigate(`/projects/${encodeURIComponent(topCritical.id)}`)
                : navigate('/priority-queue?risk=critical'),
          },
          {
            id: 'task-sn-2',
            level: 'high',
            dot: 'bg-amber-600',
            border: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
            label: 'High-Risk Works Require Review',
            description: `${priorityQueue.length} flagged projects in state priority queue`,
            action: () => navigate('/priority-queue'),
          },
          {
            id: 'task-sn-3',
            level: 'medium',
            dot: 'bg-yellow-500',
            border: 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50',
            icon: Clock,
            iconColor: 'text-yellow-600',
            label: 'District Monitoring Follow-up',
            description: 'District verification progress and expenditure reconciliation',
            action: () => navigate('/district-monitoring'),
          },
        ]
      }

      case 'mospi': {
        const pendingCount = inspections.filter(
          (i) => i.status === 'assigned' || i.status === 'in_progress' || i.status === 'requested'
        ).length
        const escalatedCount = inspections.filter((i) => (i.status as string) === 'escalated').length

        return [
          {
            id: 'task-mo-1',
            level: 'critical',
            dot: 'bg-rose-600',
            border: 'border-rose-200 bg-rose-50/50 hover:bg-rose-50',
            icon: ShieldAlert,
            iconColor: 'text-rose-600',
            label: 'Critical Concentration Detected',
            description: 'National portfolio monitoring shows localized review priority clusters',
            action: () => navigate('/state-monitoring'),
          },
          {
            id: 'task-mo-2',
            level: 'high',
            dot: 'bg-amber-600',
            border: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
            label: 'Review Queue Oversight',
            description: `${pendingCount} verification cases tracked in system register (${inspections.length} total recorded, ${escalatedCount} escalated)`,
            action: () => navigate('/verification'),
          },
          {
            id: 'task-mo-3',
            level: 'info',
            dot: 'bg-blue-600',
            border: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
            icon: Layers,
            iconColor: 'text-blue-600',
            label: 'National Quarterly Synthesis Due',
            description: 'Cross-state expenditure vs peer cost band reconciliation',
            action: () => navigate('/reports'),
          },
        ]
      }

      case 'mp': {
        const topNeed = citizenNeeds[0]
        const topAi = aiSuggestions[0]
        const topRec = mpRecommendations.find((r) => r.status === 'Draft' || r.status === 'Submitted')

        return [
          {
            id: 'task-mp-1',
            level: 'high',
            dot: 'bg-blue-600',
            border: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
            icon: Layers,
            iconColor: 'text-blue-600',
            label: 'Citizen Petitions — Demo Workflow',
            description: topNeed
              ? `${topNeed.category} in ${topNeed.location} (${topNeed.requestCount} verified petitions)`
              : `No pending citizen petitions for ${currentUser.constituency}`,
            action: () => navigate('/suggestions'),
          },
          {
            id: 'task-mp-2',
            level: 'medium',
            dot: 'bg-emerald-600',
            border: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50',
            icon: CheckCircle,
            iconColor: 'text-emerald-600',
            label: 'AI Work Suggestion — Demo Workflow',
            description: topAi
              ? `${topAi.suggestedTitle} (Peer median: ₹${topAi.peerMedianLakhs}L)`
              : `No pending AI formulations for ${currentUser.constituency}`,
            action: () => navigate('/suggestions'),
          },
          {
            id: 'task-mp-3',
            level: 'info',
            dot: 'bg-purple-600',
            border: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50',
            icon: Clock,
            iconColor: 'text-purple-600',
            label: 'Recommendation Pipeline — Demo Workflow',
            description: topRec
              ? `${topRec.projectName} (${topRec.location})`
              : `No active recommendation drafts for ${currentUser.constituency}`,
            action: () => navigate('/recommendations'),
          },
        ]
      }
    }
  }

  const tasks = getTasks()

  if (isCollapsed) {
    return (
      <div className="border-l border-slate-200 bg-slate-50/80 p-2 flex flex-col items-center justify-start shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          title="Expand Action Center"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 [writing-mode:vertical-lr] rotate-180 mt-6 font-semibold">
          Current Tasks ({tasks.length})
        </span>
      </div>
    )
  }

  return (
    <aside className="w-72 bg-slate-50/90 border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
            Action Center
          </h2>
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          title="Collapse panel"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Task List */}
      <div className="p-3 space-y-2.5 flex-1">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-0.5 font-semibold">
          Role Priorities
        </div>
        {tasks.map((task: any) => {
          const Icon = task.icon
          return (
            <div
              key={task.id}
              onClick={task.action}
              className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs group ${task.border}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  task.action()
                }
              }}
            >
              <div className="flex items-start gap-2.5">
                <Icon size={16} className={`${task.iconColor} shrink-0 mt-0.5`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                    <span>{task.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {task.description}
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 group-hover:text-blue-900 transition-colors">
                      Take Action <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Small Operational Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-white/70 text-xs text-slate-500 font-mono">
        Tasks synced with workflow status.
      </div>
    </aside>
  )
}
