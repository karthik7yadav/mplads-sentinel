import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getWork,
  getWorkRisk,
  getWorkSignals,
  getWorkExpenditure,
  assembleProjectDetail,
} from '../services/api'
import type { Project, RiskReassessmentResult, Role } from '../types'
import { AppShell } from '../components/shell/AppShell'
import { StatusBadge } from '../components/common/StatusBadge'
import { ProgressBar } from '../components/common/ProgressBar'
import { RiskScoreCard } from '../components/risk/RiskScoreCard'
import { RiskExplanationCard } from '../components/risk/RiskExplanationCard'
import { PeerComparisonBar } from '../components/risk/PeerComparisonBar'
import { EvidenceCard } from '../components/risk/EvidenceCard'
import { RecommendedActionList } from '../components/risk/RecommendedActionList'
import { UpdateProjectModal } from '../components/projects/UpdateProjectModal'
import { RiskReassessmentModal } from '../components/projects/RiskReassessmentModal'
import { AssignVerificationModal } from '../components/verification/AssignVerificationModal'
import { OfficialFindingModal } from '../components/verification/OfficialFindingModal'
import { EmptyState } from '../components/common/EmptyState'
import { formatInrFromLakhs } from '../lib/format'
import {
  ArrowLeft,
  Edit3,
  ClipboardCheck,
  FileCheck,
} from 'lucide-react'

function isProjectAuthorized(p: Project, role: Role, user: any): boolean {
  if (role === 'mospi') return true
  if (role === 'nodal') {
    const userState = (user?.state || '').toLowerCase()
    return !userState || p.state.toLowerCase() === userState
  }
  if (role === 'dm') {
    const userState = (user?.state || '').toLowerCase()
    const userDist = (user?.district || '').toLowerCase()
    const userConst = (user?.constituency || '').toLowerCase()

    const matchState = !userState || p.state.toLowerCase() === userState
    if (!matchState) return false
    if (!userDist && !userConst) return true

    const pDist = p.district.toLowerCase()
    const pConst = p.constituency.toLowerCase()

    return (
      (userDist && (pDist.includes(userDist) || userDist.includes(pDist))) ||
      (userConst && (pConst.includes(userConst) || userConst.includes(pConst)))
    )
  }
  if (role === 'mp') {
    const userState = (user?.state || '').toLowerCase()
    const userConst = (user?.constituency || '').toLowerCase()

    const matchState = !userState || p.state.toLowerCase() === userState
    if (!matchState) return false
    if (!userConst) return true

    const pConst = p.constituency.toLowerCase()
    return pConst.includes(userConst) || userConst.includes(pConst)
  }
  return false
}

export const ProjectDetailPage: React.FC = () => {
  const params = useParams()
  const rawId = params['*'] || params.id
  const id = rawId ? decodeURIComponent(rawId) : undefined
  const navigate = useNavigate()
  const { canUpdateExecution, canAssignVerification, canRecordFinding, role, currentUser } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [notFound, setNotFound] = useState<boolean>(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true)

  // Modal States
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showReassessmentModal, setShowReassessmentModal] = useState(false)
  const [reassessmentResult, setReassessmentResult] = useState<RiskReassessmentResult | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showFindingModal, setShowFindingModal] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)

    Promise.allSettled([
      getWork(id),
      getWorkRisk(id),
      getWorkSignals(id),
      getWorkExpenditure(id),
    ])
      .then(([workRes, riskRes, signalsRes, expRes]) => {
        if (!isMounted) return

        if (workRes.status !== 'fulfilled') {
          console.error('Core work fetch failed:', workRes.reason)
          setProject(null)
          setNotFound(true)
          setLoading(false)
          return
        }

        const detail = workRes.value
        const risk = riskRes.status === 'fulfilled' ? riskRes.value : null
        const signals = signalsRes.status === 'fulfilled' ? signalsRes.value : null
        const exp = expRes.status === 'fulfilled' ? expRes.value : null

        const assembled = assembleProjectDetail(detail, risk, signals, exp)
        const authorized = isProjectAuthorized(assembled, role, currentUser)

        setIsAuthorized(authorized)
        setProject(assembled)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Error loading project intelligence:', err)
        setProject(null)
        setNotFound(true)
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, role, currentUser])

  if (loading) {
    return (
      <AppShell
        title="Loading Project Intelligence..."
        subtitle={id ? `Work ID: ${id}` : 'Connecting to authoritative backend...'}
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="h-44 bg-white rounded-xl border border-slate-200 p-6" />
          <div className="h-48 bg-white rounded-xl border border-slate-200 p-6" />
          <div className="h-40 bg-white rounded-xl border border-slate-200 p-6" />
        </div>
      </AppShell>
    )
  }

  if (!project || notFound || !isAuthorized) {
    return (
      <AppShell title="Project Not Found">
        <EmptyState
          title="Project Record Not Found"
          description="The requested Work ID does not exist or falls outside your administrative jurisdiction."
          actionLabel="Return to Projects Catalog"
          onAction={() => navigate('/projects')}
        />
      </AppShell>
    )
  }

  const handleReassessmentComplete = (result: RiskReassessmentResult) => {
    setReassessmentResult(result)
    setShowReassessmentModal(true)
  }

  return (
    <AppShell
      title={project.name}
      subtitle={`Work ID: ${project.id} • ${project.district}, ${project.state}`}
    >
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Previous View
        </button>

        {/* Operational Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Update Project Execution (District Authority Only - Section 21) */}
          {canUpdateExecution && (
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Edit3 size={13} /> Update Project Execution
            </button>
          )}

          {/* Assign Verification */}
          {canAssignVerification && (
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ClipboardCheck size={13} className="text-blue-600" /> Assign Verification
            </button>
          )}

          {/* Record Official Finding */}
          {canRecordFinding && (
            <button
              type="button"
              onClick={() => setShowFindingModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <FileCheck size={13} className="text-emerald-600" /> Record Official Finding
            </button>
          )}
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{project.id}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{project.projectType}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
              {project.name}
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} size="md" />
          </div>
        </div>

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans font-semibold">
              Sanctioned Cost
            </span>
            <span className="text-sm font-bold text-slate-900">
              {formatInrFromLakhs(project.sanctionedLakhs)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans font-semibold">
              Booked Expenditure
            </span>
            <span className="text-sm font-bold text-slate-900">
              {formatInrFromLakhs(project.expenditureLakhs)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans font-semibold">
              Implementing Agency
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {project.implementingAgency}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-sans font-semibold">
              Recommending MP
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {project.mpName}
            </span>
          </div>
        </div>

        {/* Dual Progress Meter */}
        <div className="pt-2">
          <ProgressBar
            physical={project.physicalProgress}
            financial={project.financialProgress}
            physicalReported={project.physicalProgressReported}
          />
        </div>
      </div>

      {/* SECTION 16: SIGNATURE RISK SCORE CARD */}
      <section aria-label="Risk Intelligence Assessment">
        <RiskScoreCard
          score={project.riskScore}
          level={project.riskLevel}
          confidence={project.dataConfidence ?? 85}
          dataStreamsCount={project.dataStreamsCount}
          dataQualityNote={project.dataQualityNote}
          confidenceNote={project.confidenceNote}
          primaryReason={project.primaryReason || 'Routine administrative review'}
          primaryReasonSummary={project.primaryReasonSummary}
          recommendedAction={project.recommendedAction || 'Routine administrative review'}
        />
      </section>

      {/* SECTION 16 & 17: WHY WAS THIS PROJECT FLAGGED? */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Why Was This Work Flagged for Review?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent anomaly breakdown explaining contributing signals without making unsupported causal assertions.
          </p>
        </div>

        <RiskExplanationCard anomalies={project.anomalies} />
      </section>

      {/* SECTION 18: PEER COMPARISON BAR */}
      <section>
        <PeerComparisonBar
          projectExpenditureLakhs={project.expenditureLakhs}
          sanctionedLakhs={project.sanctionedLakhs}
          peerMinLakhs={project.peerCostMinLakhs ?? 0}
          peerMaxLakhs={project.peerCostMaxLakhs ?? 0}
          projectCategory={project.projectType}
          peerCount={project.peerGroupSize}
          peerMetricName={project.peerMetricName}
          peerLevel={project.peerLevel}
          peerGroupSize={project.peerGroupSize}
          peerMedian={project.peerMedian}
          peerMean={project.peerMean}
          peerPercentile={project.peerPercentile}
          peerDeviation={project.peerDeviation}
          peerComparisonText={project.peerComparisonText}
          timelineComparisonText={project.timelineComparisonText}
          implementationDurationDays={project.implementationDurationDays}
          recommendationDate={project.recommendationDate || project.startDate}
        />
      </section>

      {/* SECTION 19: CONTEXT & SUPPORTING EVIDENCE */}
      <section>
        <EvidenceCard evidence={project.evidence} />
      </section>

      {/* SECTION 20: RECOMMENDED VERIFICATION ACTIONS */}
      <section>
        <RecommendedActionList actions={project.actions} />
      </section>

      {/* MODALS */}
      <UpdateProjectModal
        project={project}
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onReassessmentDone={handleReassessmentComplete}
      />

      <RiskReassessmentModal
        result={reassessmentResult}
        isOpen={showReassessmentModal}
        onClose={() => setShowReassessmentModal(false)}
      />

      <AssignVerificationModal
        project={project}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      />

      <OfficialFindingModal
        project={project}
        isOpen={showFindingModal}
        onClose={() => setShowFindingModal(false)}
      />
    </AppShell>
  )
}
