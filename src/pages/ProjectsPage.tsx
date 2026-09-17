import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchWorks, mapBackendWorkToProject } from '../services/api'
import type { Project } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { ProjectCard } from '../components/projects/ProjectCard'
import { EmptyState } from '../components/common/EmptyState'
import { Search } from 'lucide-react'

type LifecycleTab = 'ALL' | 'RECOMMENDED' | 'SANCTIONED' | 'ONGOING' | 'COMPLETED' | 'FLAGGED' | 'VERIFICATION'

export const ProjectsPage: React.FC = () => {
  const { role, currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTabParam = (searchParams.get('tab') as LifecycleTab) || 'ALL'
  const initialSearch = searchParams.get('search') || ''

  const [activeTab, setActiveTab] = useState<LifecycleTab>(activeTabParam)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedRisk, setSelectedRisk] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const [works, setWorks] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch authoritative projects from FastAPI GET /works (operational scope: 863 projects)
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchWorks({ scope: 'operational', limit: 1000 })
      .then((data) => {
        if (isMounted) {
          const mapped = data.works.map(mapBackendWorkToProject)
          setWorks(mapped)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load works from FastAPI:', err)
          setError('Unable to connect to FastAPI backend at http://127.0.0.1:8000/works')
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Available lifecycle tabs (Section 12)
  const tabs: LifecycleTab[] = [
    'ALL',
    'RECOMMENDED',
    'SANCTIONED',
    'ONGOING',
    'COMPLETED',
    'FLAGGED',
    'VERIFICATION',
  ]

  // Role-scoped visibility preserved strictly from authenticated session
  const scopedProjects = useMemo(() => {
    switch (role) {
      case 'dm': {
        const userState = (currentUser.state || '').toLowerCase()
        const userDist = (currentUser.district || '').toLowerCase()
        const userConst = (currentUser.constituency || '').toLowerCase()

        return works.filter((p) => {
          const matchState = !userState || p.state.toLowerCase() === userState
          if (!matchState) return false
          if (!userDist && !userConst) return true

          const pDist = p.district.toLowerCase()
          const pConst = p.constituency.toLowerCase()

          return (
            (userDist && (pDist.includes(userDist) || userDist.includes(pDist))) ||
            (userConst && (pConst.includes(userConst) || userConst.includes(pConst)))
          )
        })
      }
      case 'mp': {
        const userState = (currentUser.state || '').toLowerCase()
        const userConst = (currentUser.constituency || '').toLowerCase()

        return works.filter((p) => {
          const matchState = !userState || p.state.toLowerCase() === userState
          if (!matchState) return false
          if (!userConst) return true

          const pConst = p.constituency.toLowerCase()
          return pConst.includes(userConst) || userConst.includes(pConst)
        })
      }
      case 'nodal': {
        const userState = (currentUser.state || '').toLowerCase()
        return works.filter((p) => !userState || p.state.toLowerCase() === userState)
      }
      case 'mospi':
      default:
        return works
    }
  }, [works, role, currentUser])

  // Filter projects by Tab, Search, Risk, and Category
  const filteredProjects = useMemo(() => {
    return scopedProjects.filter((p) => {
      // Tab filter
      if (activeTab === 'RECOMMENDED' && p.status !== 'recommended' && p.status !== 'under_review') return false
      if (activeTab === 'SANCTIONED' && p.status !== 'approved' && p.status !== 'funded') return false
      if (activeTab === 'ONGOING' && p.status !== 'in_progress' && p.status !== 'contractor_assigned') return false
      if (activeTab === 'COMPLETED' && p.status !== 'completed' && p.status !== 'verified') return false
      if (activeTab === 'FLAGGED' && p.status !== 'flagged' && p.status !== 'escalated') return false
      if (activeTab === 'VERIFICATION' && p.inspectionStatus === 'none') return false

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchId = (p.id || '').toLowerCase().includes(query)
        const matchName = (p.name || '').toLowerCase().includes(query)
        const matchAgency = (p.implementingAgency || '').toLowerCase().includes(query)
        const matchDistrict = (p.district || '').toLowerCase().includes(query)
        const matchState = (p.state || '').toLowerCase().includes(query)
        const matchMp = (p.mpName || '').toLowerCase().includes(query)
        const matchConst = (p.constituency || '').toLowerCase().includes(query)
        if (!matchId && !matchName && !matchAgency && !matchDistrict && !matchState && !matchMp && !matchConst) return false
      }

      // Risk filter
      if (selectedRisk !== 'all' && p.riskLevel !== selectedRisk) return false

      // Category filter
      if (selectedCategory !== 'all' && p.projectType.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      return true
    })
  }, [scopedProjects, activeTab, searchQuery, selectedRisk, selectedCategory])

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(scopedProjects.map((p) => p.projectType))
    return Array.from(set)
  }, [scopedProjects])

  return (
    <AppShell
      title="Projects Directory"
      subtitle={`Lifecycle tracking and risk catalog — Scoped to ${
        role === 'dm'
          ? `${currentUser.district} District`
          : role === 'mp'
            ? `${currentUser.constituency} Constituency`
            : role === 'nodal'
              ? `${currentUser.state} State`
              : 'National Portfolio'
      }`}
    >
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Work ID, Project Title, Location, Implementing Agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-600 bg-slate-50 focus:bg-white text-slate-900"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white text-slate-700"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Priority</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white text-slate-700"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lifecycle Tabs (Section 12) */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          {tabs.map((tab) => {
            const count = scopedProjects.filter((p) => {
              if (tab === 'ALL') return true
              if (tab === 'RECOMMENDED') return p.status === 'recommended' || p.status === 'under_review'
              if (tab === 'SANCTIONED') return p.status === 'approved' || p.status === 'funded'
              if (tab === 'ONGOING') return p.status === 'in_progress' || p.status === 'contractor_assigned'
              if (tab === 'COMPLETED') return p.status === 'completed' || p.status === 'verified'
              if (tab === 'FLAGGED') return p.status === 'flagged' || p.status === 'escalated'
              if (tab === 'VERIFICATION') return p.inspectionStatus !== 'none'
              return true
            }).length

            const isActive = activeTab === tab

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab)
                  setSearchParams({ tab })
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between font-mono">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline font-semibold ml-4 hover:text-rose-950 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Projects Grid */}
      <section aria-label="Projects Results">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-200 rounded"></div>
                  <div className="h-4 w-16 bg-slate-100 rounded"></div>
                </div>
                <div className="mt-3 h-5 w-3/4 bg-slate-200 rounded"></div>
                <div className="mt-2 h-3 w-1/2 bg-slate-100 rounded"></div>
                <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-4 w-20 bg-slate-100 rounded"></div>
                  <div className="h-4 w-20 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No projects match the selected criteria"
            description="Try loosening your search terms, changing the lifecycle tab, or clearing the risk filter."
            actionLabel="Reset Filters"
            onAction={() => {
              setActiveTab('ALL')
              setSearchQuery('')
              setSelectedRisk('all')
              setSelectedCategory('all')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
