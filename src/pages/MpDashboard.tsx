import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import type { AiWorkSuggestion, CitizenNeed } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { KpiCard } from '../components/common/KpiCard'
import { CitizenNeedCard } from '../components/mp/CitizenNeedCard'
import { WorkSuggestionCard } from '../components/mp/WorkSuggestionCard'
import { DraftRecommendationModal } from '../components/mp/DraftRecommendationModal'
import { SyntheticBadge } from '../components/common/SyntheticBadge'
import { EmptyState } from '../components/common/EmptyState'
import { formatInrFromLakhs, formatDate } from '../lib/format'
import {
  MessageSquare,
  FileEdit,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react'

export const MpDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { citizenNeeds, aiSuggestions, mpRecommendations, scopedProjects } = useProjectData()
  const location = useLocation()
  const navigate = useNavigate()

  const [activeSuggestionModal, setActiveSuggestionModal] = useState<AiWorkSuggestion | null>(null)

  const currentTab =
    location.pathname === '/suggestions'
      ? 'suggestions'
      : location.pathname === '/recommendations'
      ? 'recommendations'
      : 'all'

  // Top KPIs for MP (Section 10)
  const totalSuggestions = citizenNeeds.reduce((acc, curr) => acc + curr.requestCount, 0)
  const draftedRecs = mpRecommendations.filter((r) => r.status === 'Draft').length
  const submittedRecs = mpRecommendations.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length
  const approvedRecs = mpRecommendations.filter((r) => r.status === 'Sanctioned').length
  const ongoingWorks = scopedProjects.filter((p) => p.status === 'in_progress').length

  const handleReviewSuggestionFromNeed = (need: CitizenNeed) => {
    const matched = aiSuggestions.find((s) => s.needId === need.id) || aiSuggestions[0]
    setActiveSuggestionModal(matched)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sanctioned':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'Submitted':
      case 'Under Review':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'Returned':
        return 'bg-rose-50 text-rose-800 border-rose-200'
      case 'Draft':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <AppShell
      title={`Member of Parliament — ${currentUser.constituency || 'Rajsamand'} Constituency`}
      subtitle="Constituency development needs, AI-assisted suggestions and statutory recommendations."
    >
      {/* Constituency Banner with Prominent Scope Badge (Section 5 & 20) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ACTIVE CONSTITUENCY: {currentUser.constituency} Constituency, {currentUser.state}
            </span>
            <SyntheticBadge label="Constituency demo data" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
            {currentUser.displayName} • {currentUser.constituency} Constituency
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Constituency development workspace scoped exclusively to {currentUser.constituency} Parliamentary Constituency ({currentUser.state}). Identify community priorities, review AI-assisted peer-benchmarked formulations, and transmit statutory recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveSuggestionModal(aiSuggestions[0] || null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-[0.98]"
        >
          <Sparkles size={14} />
          Prepare Recommendation
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Constituency Overview
        </button>
        <button
          type="button"
          onClick={() => navigate('/suggestions')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'suggestions'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Citizen Needs & Suggestions ({citizenNeeds.length})
        </button>
        <button
          type="button"
          onClick={() => navigate('/recommendations')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'recommendations'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Recommendations ({mpRecommendations.length})
        </button>
      </div>

      {/* Top 5 KPIs for MP (Section 10 & 11) */}
      <section aria-label="Constituency Pipeline Metrics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Citizen Petitions"
            value={totalSuggestions}
            subtitle={`Across ${citizenNeeds.length} priority need clusters`}
            icon={MessageSquare}
            variant="info"
          />
          <KpiCard
            title="Recommendations Drafted"
            value={draftedRecs}
            subtitle="Under formulation"
            icon={FileEdit}
          />
          <KpiCard
            title="Submitted"
            value={submittedRecs}
            subtitle="Under District review"
            icon={Send}
            variant="warning"
          />
          <KpiCard
            title="Sanctioned"
            value={approvedRecs}
            subtitle="Approved by Collector"
            icon={CheckCircle2}
            variant="success"
          />
          <KpiCard
            title="Works Ongoing"
            value={ongoingWorks}
            subtitle={`Ground execution in ${currentUser.constituency}`}
            icon={Clock}
          />
        </div>
      </section>

      {/* SECTION 1: CITIZEN NEEDS (Section 6 & 10) */}
      {(currentTab === 'all' || currentTab === 'suggestions') && (
        <section className="space-y-4" id="citizen-needs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Emerging Citizen Needs — {currentUser.constituency} Constituency
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verified public needs and petitions originating strictly within {currentUser.constituency} Parliamentary Constituency.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SyntheticBadge label="Synthetic demonstration needs" />
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                {citizenNeeds.length} Needs in {currentUser.constituency}
              </span>
            </div>
          </div>

          {citizenNeeds.length === 0 ? (
            <EmptyState
              title="No Citizen Needs Found"
              description={`No citizen representations or petitions recorded for ${currentUser.constituency} Constituency.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citizenNeeds.map((need) => (
                <CitizenNeedCard
                  key={need.id}
                  need={need}
                  onReviewSuggestion={handleReviewSuggestionFromNeed}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: AI-ASSISTED WORK SUGGESTIONS (Section 8 & 10) */}
      {(currentTab === 'all' || currentTab === 'suggestions') && (
        <section className="space-y-4" id="ai-suggestions">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                AI-Assisted Work Suggestions — {currentUser.constituency} Constituency
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Evidence-based project formulations generated directly from active {currentUser.constituency} citizen needs and benchmarked against historical peer costs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SyntheticBadge label="Synthetic demonstration suggestions" />
              <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded font-semibold">
                Statutory MP Decision Support
              </span>
            </div>
          </div>

          {aiSuggestions.length === 0 ? (
            <EmptyState
              title="No AI Suggestions Available"
              description={`No active project formulations pending for ${currentUser.constituency} Constituency.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {aiSuggestions.map((sug) => (
                <WorkSuggestionCard
                  key={sug.id}
                  suggestion={sug}
                  onDraftRecommendation={(s) => setActiveSuggestionModal(s)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: MY RECOMMENDATIONS (Section 10) */}
      {(currentTab === 'all' || currentTab === 'recommendations') && (
        <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4" id="my-recommendations">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
              My Recommendations — {currentUser.constituency} Constituency
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Official recommendations transmitted to District Collectorate under MPLADS guidelines for {currentUser.constituency} Constituency.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            {mpRecommendations.length} Recommendations Total
          </span>
        </div>

        {mpRecommendations.length === 0 ? (
          <EmptyState
            title="No Recommendations Drafted"
            description={`No recommendations formulated or submitted yet for ${currentUser.constituency} Constituency.`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mpRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
              >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-xs font-bold text-slate-500">{rec.id}</span>
                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                      rec.status,
                    )}`}
                  >
                    {rec.status}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-bold text-slate-900">{rec.projectName}</h4>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="shrink-0 text-slate-400" />
                  <span>{rec.location}</span>
                  <span className="text-slate-300">•</span>
                  <span>{rec.category}</span>
                </div>

                <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Amount:</span>
                    <strong className="font-mono text-slate-900">{formatInrFromLakhs(rec.estimatedLakhs)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beneficiaries:</span>
                    <strong className="font-mono text-slate-700">{rec.beneficiaryCount.toLocaleString('en-IN')}</strong>
                  </div>
                  {rec.districtAuthorityRemarks && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-xs text-slate-600">
                      <strong>District Authority Note:</strong> {rec.districtAuthorityRemarks}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} /> {formatDate(rec.recommendationDate)}
                </span>
                <span className="text-slate-500">Final Decision by MP</span>
              </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Draft Recommendation Modal */}
      <DraftRecommendationModal
        suggestion={activeSuggestionModal}
        isOpen={!!activeSuggestionModal}
        onClose={() => setActiveSuggestionModal(null)}
      />
    </AppShell>
  )
}
