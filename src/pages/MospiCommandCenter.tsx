import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectData } from '../context/ProjectDataContext'
import { AppShell } from '../components/shell/AppShell'
import { KpiCard } from '../components/common/KpiCard'
import { IndiaRiskMap } from '../components/map/IndiaRiskMap'
import { PriorityCard } from '../components/priority/PriorityCard'
import {
  fetchDashboardSummary,
  fetchStateSummary,
  type DashboardSummary,
  type StateSummaryResponse,
} from '../services/api'
import {
  NATIONAL_RISK_SIGNALS,
  type StateMetrics,
} from '../data/realData'
import {
  Layers,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  ArrowRight,
  BarChart3,
  X,
  Filter,
} from 'lucide-react'

export const MospiCommandCenter: React.FC = () => {
  const { priorityQueue } = useProjectData()
  const navigate = useNavigate()

  const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null)
  const [showStateDropdown, setShowStateDropdown] = useState<boolean>(false)
  const [isStateTableExpanded, setIsStateTableExpanded] = useState<boolean>(false)
  const stateSelectorRef = React.useRef<HTMLDivElement>(null)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const [stateSummary, setStateSummary] = useState<StateSummaryResponse | null>(null)
  const [stateLoading, setStateLoading] = useState<boolean>(true)
  const [stateError, setStateError] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stateSelectorRef.current && !stateSelectorRef.current.contains(e.target as Node)) {
        setShowStateDropdown(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const loadDashboardData = React.useCallback(() => {
    setLoading(true)
    setApiError(null)
    fetchDashboardSummary()
      .then((data) => {
        setSummary(data)
        setApiError(null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load dashboard summary from FastAPI:', err)
        setApiError('Unable to connect to FastAPI backend at http://127.0.0.1:8000/dashboard/summary')
        setLoading(false)
      })

    setStateLoading(true)
    setStateError(null)
    fetchStateSummary()
      .then((data) => {
        setStateSummary(data)
        setStateError(null)
        setStateLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load state summary from FastAPI:', err)
        setStateError('Unable to connect to FastAPI backend at http://127.0.0.1:8000/state/summary')
        setStateLoading(false)
      })
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Top National KPIs dynamically fetched from FastAPI (GET /dashboard/summary)
  const totalWorksDisplay = loading ? '...' : summary ? summary.total_works.toLocaleString('en-IN') : '—'
  const activeWorksDisplay = loading ? '...' : summary ? summary.active_works.toLocaleString('en-IN') : '—'
  const criticalWorksDisplay = loading ? '...' : summary ? summary.critical_works.toLocaleString('en-IN') : '—'
  const highRiskWorksDisplay = loading ? '...' : summary ? summary.high_risk_works.toLocaleString('en-IN') : '—'
  const pendingVerificationDisplay = loading ? '...' : summary ? summary.pending_verification.toLocaleString('en-IN') : '—'
  const investigationCasesDisplay = loading ? '...' : summary ? summary.investigation_cases.toString() : '—'

  const handleStateClick = (state: StateMetrics) => {
    if (!state.state || selectedStateFilter === state.state) {
      setSelectedStateFilter(null)
    } else {
      setSelectedStateFilter(state.state)
    }
  }

  // Filter queue if state selected
  const displayQueue = selectedStateFilter
    ? priorityQueue.filter((p) => p.state.toLowerCase() === selectedStateFilter.toLowerCase())
    : priorityQueue

  // Mapped States from FastAPI GET /state/summary (excluding unmapped cohort)
  const mappedStates = stateSummary?.states.filter((s) => s.state !== 'Unknown') || []

  // Authoritative State metrics for selected state from GET /state/summary
  const selectedStateData = selectedStateFilter
    ? mappedStates.find((s) => s.state.toLowerCase() === selectedStateFilter.toLowerCase()) || null
    : null

  return (
    <AppShell
      title="MPLADS National Command Center"
      subtitle="National monitoring and risk intelligence overview — Ministry of Statistics & Programme Implementation."
    >
      {/* Drill-down Breadcrumbs & National Financial Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <nav aria-label="National Drill-down Navigation" className="flex items-center gap-2 text-xs font-mono">
          <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">INDIA</span>
          <span className="text-slate-400">/</span>
          {selectedStateFilter ? (
            <>
              <span
                onClick={() => setSelectedStateFilter(null)}
                className="text-blue-700 hover:underline cursor-pointer font-semibold"
              >
                {selectedStateFilter}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">All Districts</span>
            </>
          ) : (
            <span className="text-slate-500 font-medium">All States & UTs</span>
          )}
        </nav>

        {/* Executive Financial Summary (Dynamic from FastAPI) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-slate-600 bg-slate-50/80 border border-slate-200/70 px-3.5 py-1.5 rounded-lg">
          <span>
            Total Project Outlay:{' '}
            <strong className="text-slate-900 font-bold">
              {loading
                ? '...'
                : summary
                ? `₹${summary.total_project_outlay_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr`
                : '—'}
            </strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span>
            Pure Administrative Sanctions:{' '}
            <strong className="text-slate-900 font-bold">
              {loading
                ? '...'
                : summary
                ? `₹${summary.total_pure_sanctioned_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr`
                : '—'}
            </strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span>
            Total Recorded Expenditure:{' '}
            <strong className="text-slate-900 font-bold">
              {loading
                ? '...'
                : summary
                ? `₹${summary.total_expenditure_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr`
                : '—'}
            </strong>
          </span>
        </div>
      </div>

      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between font-mono">
          <span>⚠️ {apiError}</span>
          <button
            type="button"
            onClick={loadDashboardData}
            className="underline font-semibold ml-4 hover:text-rose-950 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 6 National KPIs (Section 28) */}
      <section aria-label="National Executive Metrics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          <KpiCard
            title="Total Works"
            value={totalWorksDisplay}
            subtitle="Pan-India MPLADS"
            icon={Layers}
            onClick={() => navigate('/projects')}
          />
          <KpiCard
            title="Active Works"
            value={activeWorksDisplay}
            subtitle="In active execution"
            icon={Clock}
            variant="info"
            onClick={() => navigate('/projects?tab=ONGOING')}
          />
          <KpiCard
            title="Critical Works"
            value={criticalWorksDisplay}
            subtitle="Verified Stage 2.1.1 (1,800 state-mapped)"
            icon={ShieldAlert}
            variant="critical"
            onClick={() => navigate('/priority-queue?risk=critical')}
          />
          <KpiCard
            title="High-Risk Works"
            value={highRiskWorksDisplay}
            subtitle="Verified Stage 2.1.1 (11,382 state-mapped)"
            icon={AlertTriangle}
            variant="high"
            onClick={() => navigate('/priority-queue?risk=high')}
          />
          <KpiCard
            title="Pending Verification"
            value={pendingVerificationDisplay}
            subtitle="Operational estimate (flagged queue)"
            icon={ClipboardCheck}
            variant="warning"
            onClick={() => navigate('/verification')}
          />
          <KpiCard
            title="Investigation Cases"
            value={investigationCasesDisplay}
            subtitle="Operational demo cases"
            icon={Building2}
            variant="default"
            onClick={() => navigate('/priority-queue?tab=escalated')}
          />
        </div>
      </section>

      {/* SECTION 29: REQUIRED NATIONAL MAP */}
      <section>
        <IndiaRiskMap
          selectedState={selectedStateFilter || undefined}
          onSelectState={handleStateClick}
        />
      </section>

      {/* SECTION 30: STATE RISK OVERVIEW (Ranked Cards + Complete State Register) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" />
              State Risk Overview
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ranked concentration of high-priority works and expenditure compliance ({mappedStates.length} monitored States & UTs).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Interactive State Selector Dropdown (Requirement 1 & 5) */}
            <div className="relative" ref={stateSelectorRef}>
              <button
                type="button"
                onClick={() => setShowStateDropdown(!showStateDropdown)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                  showStateDropdown
                    ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                    : selectedStateFilter
                    ? 'border-blue-300 bg-blue-50/90 text-blue-900'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-400'
                }`}
                aria-expanded={showStateDropdown}
                title="Select a monitored State or Union Territory"
              >
                <Filter size={13} className="text-blue-600 shrink-0" />
                <span className="text-slate-500 font-medium">State:</span>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">
                  {selectedStateFilter || 'All States'}
                </span>
                <span className="text-slate-600 font-bold text-xs ml-0.5">
                  {showStateDropdown ? '▴' : '▾'}
                </span>
              </button>

              {showStateDropdown && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between font-semibold">
                    <span>Select Monitored State / UT</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      {mappedStates.length} States & UTs
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-1">
                    {/* Option: All States */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStateFilter(null)
                        setShowStateDropdown(false)
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 ${
                        selectedStateFilter === null
                          ? 'bg-blue-50 text-blue-950 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedStateFilter === null ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span>All States (Pan-India Scope)</span>
                      </div>
                      {selectedStateFilter === null && (
                        <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                          ✓ ACTIVE
                        </span>
                      )}
                    </button>

                    {/* All 34 Monitored States */}
                    {mappedStates.map((st) => {
                      const isSelected = selectedStateFilter === st.state
                      return (
                        <button
                          key={st.state}
                          type="button"
                          onClick={() => {
                            setSelectedStateFilter(st.state)
                            setShowStateDropdown(false)
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 text-blue-950 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate mr-2 font-medium">{st.state}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {st.critical_works > 0 ? (
                              <span className="text-[10px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                                {st.critical_works} Critical
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">
                                {st.total_works.toLocaleString('en-IN')}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* View All States Register Toggle Button (Requirement 4) */}
            <button
              type="button"
              onClick={() => setIsStateTableExpanded(!isStateTableExpanded)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <span>{isStateTableExpanded ? 'Hide States Register' : `View All States (${mappedStates.length})`}</span>
              <span className="text-slate-500 font-bold text-xs">
                {isStateTableExpanded ? '▴' : '▾'}
              </span>
            </button>
          </div>
        </div>

        {/* Selected State Active Detail Card (Requirement 3) */}
        {selectedStateData && (
          <div className="p-4 sm:p-5 rounded-xl border border-blue-300 bg-blue-50/50 shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                  Active State Scope
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {selectedStateData.state}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Authoritative state risk engine output from GET /state/summary.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white border border-blue-200 text-blue-900 shadow-2xs">
                  Utilization: {selectedStateData.utilization_percent}%
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStateFilter(null)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <X size={12} />
                  Clear State Filter
                </button>
              </div>
            </div>

            {/* Authoritative State Metrics Grid using actual API fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Works</span>
                <strong className="text-sm text-slate-900 font-bold">{selectedStateData.total_works.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-rose-200 shadow-2xs">
                <span className="text-[10px] text-rose-700 uppercase block font-sans font-semibold">Critical Works</span>
                <strong className="text-sm text-rose-700 font-bold">{selectedStateData.critical_works.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs">
                <span className="text-[10px] text-amber-700 uppercase block font-sans font-semibold">High-Risk Works</span>
                <strong className="text-sm text-amber-700 font-bold">{selectedStateData.high_risk_works.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-yellow-200 shadow-2xs">
                <span className="text-[10px] text-yellow-700 uppercase block font-sans">Medium-Risk Works</span>
                <strong className="text-sm text-yellow-800 font-bold">{selectedStateData.medium_risk_works.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Low-Risk Works</span>
                <strong className="text-sm text-slate-700 font-bold">{selectedStateData.low_risk_works.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Project Outlay</span>
                <strong className="text-sm text-slate-900 font-bold">₹{selectedStateData.project_outlay_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Pure Sanctions</span>
                <strong className="text-sm text-slate-900 font-bold">₹{selectedStateData.pure_sanctioned_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</strong>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Expenditure</span>
                <strong className="text-sm text-slate-900 font-bold">₹{selectedStateData.expenditure_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</strong>
              </div>
            </div>
          </div>
        )}

        {stateLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  <div className="h-4 w-16 bg-slate-100 rounded"></div>
                </div>
                <div className="mt-3 h-3 w-36 bg-slate-100 rounded"></div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-100 rounded"></div>
                  <div className="h-3 w-16 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : stateError ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-mono flex items-center justify-between">
            <span>⚠️ {stateError}</span>
            <button
              type="button"
              onClick={loadDashboardData}
              className="underline font-semibold ml-4 hover:text-rose-950 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          /* Quick Top 4 Overview Cards (Requirement 1 & 2) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mappedStates.slice(0, 4).map((st) => {
              const isSelected = selectedStateFilter === st.state
              return (
                <div
                  key={st.state}
                  onClick={() => setSelectedStateFilter(isSelected ? null : st.state)}
                  className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{st.state}</span>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                      {st.critical_works > 0 ? `${st.critical_works} Critical` : 'Normal'}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <div>Project Outlay: <strong className="text-slate-800">₹{st.project_outlay_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</strong></div>
                    <div className="text-slate-500">Active Works: {st.active_works.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Utilization: {st.utilization_percent}%</span>
                    <span className="text-blue-600 font-semibold">
                      {isSelected ? 'Selected ✓' : 'Filter Queue →'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Complete Monitored States & UTs Register (Requirement 2 & 4) */}
        {isStateTableExpanded && !stateLoading && !stateError && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
                  Complete Monitored States & UTs Register ({mappedStates.length})
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Authoritative risk profile and expenditure benchmarking across all 34 monitored jurisdictions from GET /state/summary.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                Authoritative MoSPI Coverage
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/90 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">State / UT</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total Works</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Critical</th>
                    <th className="py-2.5 px-3 font-semibold text-right">High Risk</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Project Outlay</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Pure Sanctions</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Expenditure</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Utilization</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {mappedStates.map((st) => {
                    const isSelected = selectedStateFilter === st.state
                    return (
                      <tr
                        key={st.state}
                        onClick={() => setSelectedStateFilter(isSelected ? null : st.state)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 font-semibold text-blue-950' : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900">
                          {st.state}
                        </td>
                        <td className="py-2.5 px-3 text-right">{st.total_works.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          {st.critical_works > 0 ? st.critical_works.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                          {st.high_risk_works > 0 ? st.high_risk_works.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">₹{st.project_outlay_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</td>
                        <td className="py-2.5 px-3 text-right">₹{st.pure_sanctioned_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</td>
                        <td className="py-2.5 px-3 text-right">₹{st.expenditure_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{st.utilization_percent}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedStateFilter(isSelected ? null : st.state)
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 30: PRIORITY QUEUE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Priority Queue {selectedStateFilter && `(${selectedStateFilter})`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Operational triage queue prioritized by authoritative risk factors
            </p>
          </div>
          <button
            onClick={() => navigate('/priority-queue')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <span>Full Priority Queue ({displayQueue.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayQueue.slice(0, 4).map((project, idx) => (
            <PriorityCard key={project.id} project={project} rank={idx + 1} />
          ))}
        </div>
      </section>

      {/* SECTION 30: RISK PATTERN OVERVIEW */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
                National Risk Pattern Overview
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Authoritative distribution across all {loading ? '...' : summary ? summary.national_compliance_signals.toLocaleString('en-IN') : '—'} compliance signals (Stage 2.1.1).
              </p>
            </div>
            <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {loading ? '...' : summary ? summary.national_compliance_signals.toLocaleString('en-IN') : '—'} Total Signals
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {NATIONAL_RISK_SIGNALS.categories.map((pat) => (
            <div key={pat.label} className={`p-3.5 rounded-xl border text-xs ${pat.color}`}>
              <span className="text-xs font-mono uppercase font-bold block truncate" title={pat.description}>
                {pat.label}
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono">{pat.count.toLocaleString('en-IN')}</span>
                <span className="font-mono text-xs font-semibold opacity-85">{pat.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
