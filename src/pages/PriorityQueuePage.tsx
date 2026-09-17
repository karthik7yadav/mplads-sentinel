import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import { getPriorityQueue, mapPriorityQueueRecordToProject } from '../services/api'
import type { Project } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { PriorityCard } from '../components/priority/PriorityCard'
import { EmptyState } from '../components/common/EmptyState'
import { AssignVerificationModal } from '../components/verification/AssignVerificationModal'
import { ShieldAlert, AlertTriangle, ListOrdered } from 'lucide-react'

export const PriorityQueuePage: React.FC = () => {
  const { role, currentUser } = useAuth()
  const { priorityQueue: contextPriorityQueue } = useProjectData()
  const [searchParams] = useSearchParams()

  const [apiRecords, setApiRecords] = useState<Project[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedForVerification, setSelectedForVerification] = useState<Project | null>(null)

  // Fetch operational priority queue directly from FastAPI GET /risk/priority
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getPriorityQueue({ limit: 500 })
      .then((res) => {
        if (isMounted) {
          const mapped = res.records.map(mapPriorityQueueRecordToProject)
          setApiRecords(mapped)
          setApiError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load priority queue from FastAPI:', err)
          setApiError('Unable to connect to FastAPI backend at http://127.0.0.1:8000/risk/priority')
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Use live authoritative API records when loaded, fallback to context
  const rawQueue = apiRecords ?? contextPriorityQueue

  // Strictly enforce role-based operational scope
  const roleScopedQueue = useMemo(() => {
    switch (role) {
      case 'dm': {
        const userState = (currentUser.state || '').toLowerCase()
        const userDist = (currentUser.district || '').toLowerCase()
        const userConst = (currentUser.constituency || '').toLowerCase()

        return rawQueue.filter((p) => {
          const matchState = !userState || (p.state || '').toLowerCase() === userState
          if (!matchState) return false
          if (!userDist && !userConst) return true

          const pDist = (p.district || '').toLowerCase()
          const pConst = (p.constituency || '').toLowerCase()

          return (
            (userDist && (pDist.includes(userDist) || userDist.includes(pDist))) ||
            (userConst && (pConst.includes(userConst) || userConst.includes(pConst)))
          )
        })
      }
      case 'mp': {
        const userState = (currentUser.state || '').toLowerCase()
        const userConst = (currentUser.constituency || '').toLowerCase()

        return rawQueue.filter((p) => {
          const matchState = !userState || (p.state || '').toLowerCase() === userState
          if (!matchState) return false
          if (!userConst) return true

          const pConst = (p.constituency || '').toLowerCase()
          return pConst.includes(userConst) || userConst.includes(pConst)
        })
      }
      case 'nodal': {
        const userState = (currentUser.state || '').toLowerCase()
        return rawQueue.filter((p) => !userState || (p.state || '').toLowerCase() === userState)
      }
      case 'mospi':
      default:
        return rawQueue
    }
  }, [rawQueue, role, currentUser])

  // Summary counts for filter chips
  const criticalCount = roleScopedQueue.filter((p) => p.riskLevel === 'critical').length
  const highCount = roleScopedQueue.filter((p) => p.riskLevel === 'high').length
  const mediumCount = roleScopedQueue.filter((p) => p.riskLevel === 'medium').length
  const lowCount = roleScopedQueue.filter((p) => p.riskLevel === 'low').length

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(roleScopedQueue.map((p) => p.projectType))
    return Array.from(set).filter(Boolean)
  }, [roleScopedQueue])

  const searchQuery = searchParams.get('search') || ''

  const filteredQueue = useMemo(() => {
    return roleScopedQueue.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches =
          (p.id || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.constituency || '').toLowerCase().includes(q) ||
          (p.district || '').toLowerCase().includes(q) ||
          (p.state || '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (riskFilter !== 'all' && p.riskLevel !== riskFilter) return false
      if (categoryFilter !== 'all' && (p.projectType || '').toLowerCase() !== categoryFilter.toLowerCase()) return false
      return true
    })
  }, [roleScopedQueue, riskFilter, categoryFilter, searchQuery])

  return (
    <AppShell
      title="Priority Queue"
      subtitle={`Projects requiring attention based on current risk and available evidence — Scoped to ${
        role === 'dm'
          ? `${currentUser.district} District`
          : role === 'mp'
            ? `${currentUser.constituency} Constituency`
            : role === 'nodal'
              ? `${currentUser.state} State`
              : 'National Portfolio'
      }`}
    >
      {/* Error banner if FastAPI is unreachable */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between mb-4">
          <span>{apiError}</span>
          <span className="text-xs text-red-400/70">Ensure backend is running: python backend/run.py</span>
        </div>
      )}

      {/* Priority Summary Strip */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <ListOrdered size={16} className="text-blue-600" />
              Triage & Review Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked dynamically by the MPLADS Sentinel risk engine. Projects move here when physical milestones deviate from booked expenditure.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Total in Queue:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {roleScopedQueue.length} Works
            </span>
          </div>
        </div>

        {/* Filter Chips & Category Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRiskFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                riskFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Priority ({roleScopedQueue.length})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('critical')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                riskFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert size={13} /> Critical ({criticalCount})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('high')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                riskFilter === 'high'
                  ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle size={13} /> High Risk ({highCount})
            </button>

            {mediumCount > 0 && (
              <button
                type="button"
                onClick={() => setRiskFilter('medium')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  riskFilter === 'medium'
                    ? 'bg-yellow-600 text-white shadow-2xs font-semibold'
                    : 'bg-yellow-50 text-yellow-900 border border-yellow-200 hover:bg-yellow-100'
                }`}
              >
                Medium ({mediumCount})
              </button>
            )}

            {lowCount > 0 && (
              <button
                type="button"
                onClick={() => setRiskFilter('low')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  riskFilter === 'low'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Low ({lowCount})
              </button>
            )}
          </div>

          <div className="w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-700"
            >
              <option value="all">All Project Types</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Priority Cards Grid (Section 15) */}
      <section aria-label="Priority Cards List">
        {loading && !apiRecords ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading priority queue from FastAPI backend...
          </div>
        ) : filteredQueue.length === 0 ? (
          <EmptyState
            title="No projects currently in the priority queue for this filter"
            description="All monitored works within this view are progressing according to standard milestone tolerances."
            variant="success"
            actionLabel="Reset Risk Filter"
            onAction={() => {
              setRiskFilter('all')
              setCategoryFilter('all')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQueue.map((project, index) => (
              <PriorityCard
                key={project.id}
                project={project}
                rank={index + 1}
                onAssignVerification={(p) => setSelectedForVerification(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Verification Modal */}
      {selectedForVerification && (
        <AssignVerificationModal
          project={selectedForVerification}
          isOpen={!!selectedForVerification}
          onClose={() => setSelectedForVerification(null)}
        />
      )}
    </AppShell>
  )
}
