import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import { AppShell } from '../components/shell/AppShell'
import { KpiCard } from '../components/common/KpiCard'
import { PriorityCard } from '../components/priority/PriorityCard'
import { IndiaRiskMap } from '../components/map/IndiaRiskMap'
import { getStateMetric } from '../data/realData'
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  Building,
  ArrowRight,
} from 'lucide-react'

export const StateDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { scopedProjects, priorityQueue } = useProjectData()
  const navigate = useNavigate()

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

  // Authoritative State Metrics
  const stateData = getStateMetric(currentUser.state || 'Rajasthan')
  const totalWorks = stateData?.totalWorks || scopedProjects.length
  const ongoingWorks = stateData?.activeWorks || scopedProjects.filter((p) => p.status === 'in_progress' || p.status === 'flagged').length
  const completedWorks = stateData?.completedWorks || scopedProjects.filter((p) => p.status === 'completed' || p.status === 'verified').length
  const criticalWorks = stateData?.criticalWorks || scopedProjects.filter((p) => p.riskLevel === 'critical').length
  const highRiskWorks = stateData?.highRiskWorks || scopedProjects.filter((p) => p.riskLevel === 'high').length
  const pendingVerification = stateData?.pendingVerification || scopedProjects.filter((p) => p.inspectionStatus === 'requested' || p.inspectionStatus === 'assigned').length

  // Authentic District Risk Overview Cards from canonical data
  const districtSummaries = stateData?.topDistricts?.slice(0, 4) || [
    { name: 'Rajsamand', total: 42, critical: 12, high: 18, sanctionedCr: 24.5 },
    { name: 'Jalore', total: 31, critical: 8, high: 14, sanctionedCr: 18.2 },
    { name: 'Jhunjhunu', total: 28, critical: 6, high: 11, sanctionedCr: 15.6 },
    { name: 'Jaipur', total: 23, critical: 4, high: 9, sanctionedCr: 12.8 },
  ]

  // Filter state priority queue by selected district if clicked
  const stateQueue = selectedDistrict
    ? priorityQueue.filter((p) => p.district.toLowerCase().includes(selectedDistrict.toLowerCase()))
    : priorityQueue

  return (
    <AppShell
      title={`State Nodal Authority — ${currentUser.state || 'Telangana'}`}
      subtitle="Inter-district risk benchmarking, escalation monitoring, and state priority queue."
    >
      {/* State Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
            State Headquarters Monitoring Cell
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
            {currentUser.state || 'Telangana'} State Nodal Administration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring implementation across 33 districts. Ensuring compliance, resolving cross-district bottlenecks, and escalating critical cases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedDistrict && (
            <button
              type="button"
              onClick={() => setSelectedDistrict(null)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer font-medium"
            >
              Clear District Filter ({selectedDistrict})
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            All State Works <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Top 6 State KPIs (Section 27) */}
      <section aria-label="State Key Performance Indicators">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Works"
            value={totalWorks}
            subtitle={`${currentUser.state} portfolio`}
            icon={FolderKanban}
            onClick={() => navigate('/projects')}
          />
          <KpiCard
            title="Ongoing"
            value={ongoingWorks}
            subtitle="Under physical execution"
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
            subtitle="Immediate state review"
            icon={ShieldAlert}
            variant="critical"
            onClick={() => navigate('/priority-queue')}
          />
          <KpiCard
            title="High Risk"
            value={highRiskWorks}
            subtitle="Progress mismatch signal"
            icon={AlertTriangle}
            variant="high"
            onClick={() => navigate('/priority-queue')}
          />
          <KpiCard
            title="Pending Verification"
            value={pendingVerification}
            subtitle="Awaiting district report"
            icon={ClipboardCheck}
            variant="warning"
            onClick={() => navigate('/verification')}
          />
        </div>
      </section>

      {/* MAIN SECTION: DISTRICT RISK OVERVIEW (Compact Cards, Section 27) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Building size={16} className="text-blue-600" />
              District Risk Overview & Comparisons
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Click a district card to filter the state priority queue below.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Drilldown: State → District → Project
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {districtSummaries.map((dist) => {
            const isSelected = selectedDistrict?.toLowerCase() === dist.name.toLowerCase()
            return (
              <div
                key={dist.name}
                onClick={() =>
                  setSelectedDistrict(isSelected ? null : dist.name)
                }
                className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    {dist.name} District
                  </h4>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                    {dist.total} Works
                  </span>
                </div>

                {/* Risk Distribution Grid */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-[10px] uppercase text-rose-700 block font-semibold">Critical</span>
                    <span className="font-bold text-rose-800 text-sm">{dist.critical}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-[10px] uppercase text-amber-700 block font-semibold">High</span>
                    <span className="font-bold text-amber-800 text-sm">{dist.high}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total</span>
                    <span className="font-bold text-slate-700 text-sm">{dist.total}</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Sanctioned: ₹{dist.sanctionedCr} Cr</span>
                  <span className="text-blue-600 font-semibold">
                    {isSelected ? 'Selected' : 'Filter →'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION: NATIONAL BENCHMARK & STATE CONTEXT MAP */}
      <section>
        <IndiaRiskMap
          selectedState={currentUser.state || 'Rajasthan'}
        />
      </section>

      {/* SECTION: STATE PRIORITY QUEUE (Section 27) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              State Priority Queue {selectedDistrict && `(${selectedDistrict} District)`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Flagged projects in {currentUser.state} requiring monitoring, verification, or escalation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/priority-queue')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Full Queue ({stateQueue.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stateQueue.slice(0, 4).map((project, idx) => (
            <PriorityCard key={project.id} project={project} rank={idx + 1} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
