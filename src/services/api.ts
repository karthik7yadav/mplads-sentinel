/**
 * MPLADS SENTINEL — API Service Layer
 *
 * This service layer decouples visual components from underlying data storage.
 * In prototype demonstration mode, it bridges directly to reactive in-memory state.
 * When connecting to live FastAPI / backend endpoints, replace mock returns with
 * actual fetch calls to:
 * - GET  /api/v1/dashboard/summary
 * - GET  /api/v1/works
 * - GET  /api/v1/works/{id}
 * - GET  /api/v1/works/{id}/risk
 * - POST /api/v1/works/{id}/update
 * - POST /api/v1/works/{id}/reassess
 * - GET  /api/v1/inspections
 * - POST /api/v1/inspections/{id}/finding
 */

import type {
  Project,
  ProjectStatus,
  InspectionStatus,
  RiskLevel,
  ProjectUpdatePayload,
  RiskReassessmentResult,
  OfficialFindingOption,
  Inspection,
  Role,
  AnomalyContributor,
  AnomalyCategory,
  ContextualEvidence,
  RecommendedAction,
  AppNotification,
} from '../types'

export interface DashboardSummary {
  total_works: number
  active_works: number
  completed_works: number
  recommended_works: number
  critical_works: number
  high_risk_works: number
  medium_risk_works: number
  low_risk_works: number
  total_project_outlay_crores: number
  total_pure_sanctioned_crores: number
  total_sanctioned_crores: number
  total_expenditure_crores: number
  pending_verification: number
  investigation_cases: number
  national_compliance_signals: number
  data_provenance?: Record<string, string>
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`)
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export interface StateSummaryItem {
  state: string
  total_works: number
  active_works: number
  completed_works: number
  recommended_works: number
  critical_works: number
  high_risk_works: number
  medium_risk_works: number
  low_risk_works: number
  project_outlay_crores: number
  pure_sanctioned_crores: number
  sanctioned_crores: number
  expenditure_crores: number
  project_outlay_crores_exact?: number
  pure_sanctioned_crores_exact?: number
  expenditure_crores_exact?: number
  utilization_percent: number
}

export interface StateSummaryResponse {
  total_states: number
  reconciliation: {
    total_works: number
    critical_works: number
    high_risk_works: number
    total_project_outlay_crores: number
    total_pure_sanctioned_crores: number
    total_expenditure_crores: number
  }
  states: StateSummaryItem[]
}

export async function fetchStateSummary(): Promise<StateSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/state/summary`)
  if (!response.ok) {
    throw new Error(`Failed to fetch state summary: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export interface BackendWorkRecord {
  work_id: string
  work_name: string
  state: string
  district: string
  constituency: string
  mp_name: string
  work_category: string
  work_status?: string | null
  recommendation_present: boolean
  recommendation_date?: string | null
  recommended_amount: number
  sanction_present: boolean
  sanction_date?: string | null
  sanction_amount: number
  expenditure_present: boolean
  total_expenditure: number
  completion_present: boolean
  completion_date?: string | null
  overall_risk: number
  risk_band: string
  risk_mode: string
  primary_reason: string
}

export interface WorksResponse {
  total: number
  limit: number
  offset: number
  works: BackendWorkRecord[]
}

export async function fetchWorks(params?: {
  search?: string
  state?: string
  risk_band?: string
  lifecycle?: string
  scope?: string
  limit?: number
  offset?: number
}): Promise<WorksResponse> {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.state) query.set('state', params.state)
  if (params?.risk_band) query.set('risk_band', params.risk_band)
  if (params?.lifecycle) query.set('lifecycle', params.lifecycle)
  if (params?.scope) query.set('scope', params.scope)
  if (params?.limit) query.set('limit', params.limit.toString())
  if (params?.offset) query.set('offset', params.offset.toString())

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/works${queryString}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch works: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export function mapBackendWorkToProject(w: BackendWorkRecord): Project {
  // Authoritative financial conversions (Rupees to Lakhs)
  // Use sanction_amount if sanction is formally present and > 0,
  // otherwise recommended_amount for pre-sanction works (or 0)
  const sancLakhs = w.sanction_present && w.sanction_amount > 0
    ? Number((w.sanction_amount / 100000).toFixed(2))
    : (w.recommended_amount > 0 ? Number((w.recommended_amount / 100000).toFixed(2)) : 0)

  const expLakhs = Number(((w.total_expenditure || 0) / 100000).toFixed(2))

  // Risk Engine authoritative values
  const riskBandLower = (w.risk_band ? w.risk_band.toLowerCase() : 'low') as RiskLevel
  const riskScore = Number((w.overall_risk || 0).toFixed(1))

  // Lifecycle status derived ONLY from authoritative lifecycle fields (no risk_band inference)
  let status: ProjectStatus = 'approved'
  if (w.work_status && w.work_status.toLowerCase() === 'flagged') {
    status = 'flagged'
  } else if (w.completion_present) {
    status = 'completed'
  } else if (!w.sanction_present) {
    status = 'recommended'
  } else if ((w.total_expenditure || 0) > 0 && w.sanction_present) {
    status = 'in_progress'
  } else {
    status = 'approved'
  }

  // Financial Progress: Left unavailable in the directory.
  // Authoritative expenditure-to-sanction ratio is reserved for Project Intelligence / Decision Intelligence integration.
  const financialProgress = undefined

  // Physical Progress: Unavailable in /works master dataset.
  // Financial expenditure is NOT physical progress; do not derive.
  // Flag physicalProgressReported as false to preserve truthful "Not Reported in MIS" UI.
  const physicalProgress = undefined
  const physicalProgressReported = false

  // Inspection Status: Only 'none' unless an authoritative backend field explicitly provides it.
  // Do NOT derive from risk_band or risk score.
  const inspectionStatus: InspectionStatus = 'none'

  return {
    id: w.work_id,
    name: w.work_name || 'MPLADS Work',
    description: w.work_name || '',
    district: w.district || '',
    state: w.state || '',
    constituency: w.constituency || '',
    mpName: w.mp_name || '',
    projectType: w.work_category || '',
    status,
    sanctionedLakhs: sancLakhs,
    expenditureLakhs: expLakhs,
    physicalProgress,
    physicalProgressReported,
    financialProgress,
    riskScore,
    riskLevel: riskBandLower,
    primaryReason: w.primary_reason || '',
    inspectionStatus,
    startDate: w.sanction_date || w.recommendation_date || undefined,
    // Explicitly leave unavailable fields undefined (no fabrication)
    lat: undefined,
    lng: undefined,
    implementingAgency: undefined,
    dataConfidence: undefined,
    recommendedAction: undefined,
    expectedMonths: undefined,
    actualMonths: undefined,
    peerCostMinLakhs: undefined,
    peerCostMaxLakhs: undefined,
    beneficiaries: undefined,
    anomalies: [],
    evidence: [],
    actions: [],
    notes: [],
    isSynthetic: false,
  }
}

export interface PriorityQueueResponse {
  total: number
  limit: number
  offset: number
  queue_scope: string
  records: any[]
}

export async function getPriorityQueue(params?: {
  limit?: number
  offset?: number
}): Promise<PriorityQueueResponse> {
  const query = new URLSearchParams()
  query.set('limit', String(params?.limit ?? 500))
  if (params?.offset !== undefined) query.set('offset', String(params.offset))
  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/risk/priority${queryString}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch priority queue: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export function mapPriorityQueueRecordToProject(raw: any): Project {
  return {
    id: raw.id || raw.work_id,
    name: raw.name || raw.work_description || 'MPLADS Priority Work',
    description: raw.description || raw.name || raw.work_description || '',
    district: raw.district || '',
    state: raw.state || '',
    constituency: raw.constituency || '',
    mpName: raw.mpName || raw.mp_name || '',
    projectType: raw.projectType || raw.work_category || 'Normal/Others',
    status: raw.status || (raw.work_status === 'flagged' ? 'flagged' : 'in_progress'),
    sanctionedLakhs: raw.sanctionedLakhs ?? (raw.sanction_amount ? Number((raw.sanction_amount / 100000).toFixed(2)) : 0),
    expenditureLakhs: raw.expenditureLakhs ?? (raw.total_expenditure ? Number((raw.total_expenditure / 100000).toFixed(2)) : 0),
    physicalProgress: raw.physicalProgressReported && raw.physicalProgress !== undefined ? raw.physicalProgress : undefined,
    physicalProgressReported: Boolean(raw.physicalProgressReported),
    financialProgress: raw.financialProgress !== undefined ? raw.financialProgress : undefined,
    riskScore: typeof raw.riskScore === 'number' ? raw.riskScore : (raw.overall_risk ?? 0),
    riskLevel: (raw.riskLevel || (raw.risk_band ? raw.risk_band.toLowerCase() : 'medium')) as RiskLevel,
    primaryReason: raw.primaryReason || raw.primary_reason || '',
    primaryReasonSummary: raw.primaryReasonSummary || '',
    whyItMatters: raw.whyItMatters || '',
    recommendedAction: raw.recommendedAction || raw.recommended_action || '',
    recommendedVerification: raw.recommendedVerification || raw.recommended_action || '',
    inspectionStatus: 'none', // Do not infer inspection status from risk
    startDate: raw.startDate || raw.sanction_date || raw.recommendation_date,
    // Explicitly unmapped / unfabricated fields:
    lat: undefined,
    lng: undefined,
    implementingAgency: undefined,
    beneficiaries: undefined,
    peerCostMinLakhs: undefined,
    peerCostMaxLakhs: undefined,
    anomalies: raw.anomalies || [],
    evidence: raw.evidence || [],
    actions: raw.actions || [],
    notes: raw.notes || [],
    isSynthetic: Boolean(raw.isSynthetic),
    dataStreamsCount: raw.dataStreamsCount,
    confidenceNote: raw.confidenceNote,
    dataQualityNote: raw.dataQualityNote,
  }
}

export function deriveSystemReviewNoticeFromRecord(raw: any, isRead = false): AppNotification {
  const wid = raw.id || raw.work_id
  const riskScore = typeof raw.riskScore === 'number' ? raw.riskScore : (raw.overall_risk ?? 0)
  const riskBand = (raw.riskLevel || raw.risk_band || 'medium').toLowerCase()
  const kind: AppNotification['kind'] = riskBand === 'critical' ? 'critical' : riskBand === 'high' ? 'high' : 'update'
  const loc = raw.district || raw.state || wid
  const reason = raw.primaryReason || raw.primary_reason || 'unusual expenditure or sanction metric'

  return {
    id: `notif-${wid}`,
    kind,
    title: `System Review Notice — ${loc}`,
    message: `Work ${wid} is flagged with review priority ${riskScore.toFixed(1)}/100 due to ${reason.toLowerCase()}. Review recommended.`,
    projectId: wid,
    createdAt: raw.startDate || '2026-03-01T10:00:00+05:30',
    read: isRead,
    audience: ['dm', 'nodal', 'mospi', 'mp'],
    district: raw.district,
    state: raw.state,
    constituency: raw.constituency,
  }
}

export interface BackendWorkDetailResponse {
  work_id: string
  master_data: Record<string, any>
  risk_intelligence?: Record<string, any> | null
  decision_intelligence?: Record<string, any> | null
  signals_count: number
  signals: any[]
  expenditure_events_count: number
  expenditure_events: any[]
}

export interface BackendWorkRiskResponse {
  work_id: string
  pre_sanction_risk?: number | null
  in_progress_risk?: number | null
  post_completion_risk?: number | null
  risk_mode: string
  overall_risk: number
  risk_band: string
  rule_risk_component?: number | null
  statistical_anomaly_component?: number | null
  ml_anomaly_component?: number | null
  peer_anomaly_component?: number | null
  data_quality_component?: number | null
  [key: string]: any
}

export interface BackendWorkSignalsResponse {
  work_id: string
  signals_count: number
  signals: Array<{
    work_id: string
    risk_mode?: string
    signal_id: string
    signal_type: string
    severity: string
    signal_value?: number | string | null
    threshold?: number | string | null
    explanation: string
    source_fields?: string
    [key: string]: any
  }>
}

export interface BackendWorkExpenditureResponse {
  work_id: string
  expenditure_events_count: number
  total_disbursed_amount: number
  events: Array<{
    work_id: string
    event_id?: string
    disbursed_amount?: number
    voucher_date?: string
    [key: string]: any
  }>
}

export async function getWork(workId: string): Promise<BackendWorkDetailResponse> {
  const enc = encodeURIComponent(workId.trim())
  const res = await fetch(`${API_BASE_URL}/works/${enc}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch work ${workId}: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getWorkRisk(workId: string): Promise<BackendWorkRiskResponse> {
  const enc = encodeURIComponent(workId.trim())
  const res = await fetch(`${API_BASE_URL}/works/${enc}/risk`)
  if (!res.ok) {
    throw new Error(`Failed to fetch risk for ${workId}: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getWorkSignals(workId: string): Promise<BackendWorkSignalsResponse> {
  const enc = encodeURIComponent(workId.trim())
  const res = await fetch(`${API_BASE_URL}/works/${enc}/signals`)
  if (!res.ok) {
    throw new Error(`Failed to fetch signals for ${workId}: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getWorkExpenditure(workId: string): Promise<BackendWorkExpenditureResponse> {
  const enc = encodeURIComponent(workId.trim())
  const res = await fetch(`${API_BASE_URL}/works/${enc}/expenditure`)
  if (!res.ok) {
    throw new Error(`Failed to fetch expenditure for ${workId}: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function assembleProjectDetail(
  detail: BackendWorkDetailResponse,
  riskRes?: BackendWorkRiskResponse | null,
  signalsRes?: BackendWorkSignalsResponse | null,
  expRes?: BackendWorkExpenditureResponse | null,
): Project {
  const m = detail.master_data || {}
  const r = riskRes || detail.risk_intelligence || {}
  const di = detail.decision_intelligence || {}
  const signals = signalsRes?.signals || detail.signals || []

  // Core Financials
  const sancNum = Number(m.sanction_num || m.sanction_amount || 0)
  const recNum = Number(m.rec_num || m.recommended_amount || 0)
  const expNum = Number(m.exp_num || m.total_expenditure || 0)

  const isSanctioned = Boolean(m.sanc_bool || m.sanction_present) && sancNum > 0
  const isCompleted = Boolean(m.comp_bool || m.completion_present)

  const sancLakhs = isSanctioned
    ? Number((sancNum / 100000).toFixed(2))
    : (recNum > 0 ? Number((recNum / 100000).toFixed(2)) : 0)

  const expLakhs = Number((expNum / 100000).toFixed(2))

  // Risk Engine authoritative values
  const riskScore = Number(Number(r.overall_risk ?? m.overall_risk ?? 0).toFixed(1))
  const riskBand = (r.risk_band || m.risk_band || 'LOW').toLowerCase() as RiskLevel

  // Operational Status (strictly from lifecycle fields, no inference from risk_band)
  let status: ProjectStatus = 'approved'
  if (m.work_status && String(m.work_status).toLowerCase() === 'flagged') {
    status = 'flagged'
  } else if (isCompleted) {
    status = 'completed'
  } else if (!isSanctioned) {
    status = 'recommended'
  } else if (expNum > 0) {
    status = 'in_progress'
  } else {
    status = 'approved'
  }

  // Anomalies / Signals
  const anomalies: AnomalyContributor[] = signals.map((sig: any) => {
    let cat: AnomalyCategory = 'other'
    const st = (sig.signal_type || '').toLowerCase()
    if (st.includes('delay') || st.includes('duration') || st.includes('timeline')) cat = 'timeline'
    else if (st.includes('cost') || st.includes('expenditure') || st.includes('ratio')) cat = 'financial'
    else if (st.includes('vendor') || st.includes('contractor')) cat = 'vendor'
    else if (st.includes('progress') || st.includes('mismatch')) cat = 'progress_mismatch'
    else if (st.includes('data') || st.includes('quality') || st.includes('missing')) cat = 'data_quality'

    return {
      id: `${detail.work_id}-${sig.signal_id}`,
      category: cat,
      title: `${sig.signal_id}: ${sig.signal_type.replace(/_/g, ' ').toUpperCase()}`,
      severity: (sig.severity ? String(sig.severity).toLowerCase() : 'medium') as RiskLevel,
      explanation: sig.explanation || '',
      metricLabel: sig.signal_type || 'Risk Signal',
      metricValue: sig.signal_value !== null && sig.signal_value !== undefined ? String(sig.signal_value) : 'Active',
      normalRange: sig.threshold !== null && sig.threshold !== undefined ? `Threshold: ${sig.threshold}` : 'Standard threshold',
      detail: sig.source_fields ? `Source: ${sig.source_fields}` : undefined,
    }
  })

  // Evidence from DI streams
  const evidence: ContextualEvidence[] = []
  if (di.available_financial_information) {
    evidence.push({
      id: 'ev-financial',
      found: true,
      source: 'Financial Stream (eSAKSHI)',
      statement: di.available_financial_information,
      relevance: 'High',
    })
  }
  if (di.available_lifecycle_information) {
    evidence.push({
      id: 'ev-lifecycle',
      found: true,
      source: 'Lifecycle & Sanction Stream',
      statement: di.available_lifecycle_information,
      relevance: 'High',
    })
  }
  if (di.available_completion_information) {
    evidence.push({
      id: 'ev-completion',
      found: true,
      source: 'Completion & Asset Verification',
      statement: di.available_completion_information,
      relevance: 'Medium',
    })
  }
  if (di.data_quality_note || di.confidence_or_data_availability_note) {
    evidence.push({
      id: 'ev-data-quality',
      found: true,
      source: 'Data Quality & Provenance Audit',
      statement: di.data_quality_note || di.confidence_or_data_availability_note,
      relevance: 'High',
    })
  }

  // Recommended Verification Actions from DI
  const rawSteps: string = di.recommended_action_steps || di.recommended_verification || ''
  const actionItems = rawSteps
    .split('|')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const actions: RecommendedAction[] = actionItems.map((stepText: string, idx: number) => {
    const cleanText = stepText.replace(/^\d+\.\s*/, '')
    return {
      id: `act-${idx + 1}`,
      step: idx + 1,
      title: cleanText,
      priority: riskBand === 'critical' ? 'Immediate' : riskBand === 'high' ? 'High' : 'Standard',
      reason: di.primary_reason_title || 'Sequential verification protocol',
      status: 'Pending',
      assignedAuthority: m.ida ? `Competent Authority (${m.ida})` : 'District Authority',
    }
  })

  // Data streams count: 4 canonical streams (Recommendation, Sanction, Expenditure, Completion)
  const recBool = Boolean(m.rec_bool || m.recommendation_present)
  const sancBool = isSanctioned
  const expBool = Boolean(m.expenditure_present || (expRes ? expRes.expenditure_events_count > 0 : expNum > 0))
  const compBool = isCompleted
  const dataStreamsCount = (recBool ? 1 : 0) + (sancBool ? 1 : 0) + (expBool ? 1 : 0) + (compBool ? 1 : 0)

  // Determine start date: do not use sanction_date for unsanctioned works
  const startDate = isSanctioned
    ? (m.sanction_date || m.recommendation_date || undefined)
    : (m.recommendation_date || undefined)

  return {
    id: detail.work_id,
    name: m.work_description || 'MPLADS Work',
    description: m.work_description || '',
    district: m.ida || m.district || '',
    state: m.state || '',
    constituency: m.constituency || '',
    mpName: m.mp_name || '',
    projectType: m.work_category || 'Normal/Others',
    status,
    sanctionedLakhs: sancLakhs,
    expenditureLakhs: expLakhs,
    physicalProgress: undefined,
    physicalProgressReported: false,
    financialProgress: undefined,
    riskScore,
    riskLevel: riskBand,
    inspectionStatus: 'none',
    startDate,
    recommendationDate: m.recommendation_date || undefined,
    sanctionDate: isSanctioned ? (m.sanction_date || undefined) : undefined,
    completionDate: m.completion_date || undefined,
    implementationDurationDays: di.implementation_duration_days || undefined,
    lat: undefined,
    lng: undefined,
    implementingAgency: undefined,
    beneficiaries: undefined,
    expectedMonths: undefined,
    actualMonths: undefined,
    peerCostMinLakhs: undefined,
    peerCostMaxLakhs: undefined,
    anomalies,
    evidence,
    actions,
    notes: [],
    isSynthetic: false,
    // Decision Intelligence Extensions
    primaryReason: di.primary_reason_title || m.primary_reason || '',
    primaryReasonSummary: di.primary_reason_summary || '',
    whyItMatters: di.why_it_matters || '',
    recommendedVerification: di.recommended_verification || '',
    confidenceNote: di.confidence_or_data_availability_note || '',
    dataQualityNote: di.data_quality_note || '',
    availableFinancial: di.available_financial_information || '',
    availableLifecycle: di.available_lifecycle_information || '',
    availableCompletion: di.available_completion_information || '',
    peerMetricName: di.peer_metric_name || '',
    peerLevel: di.peer_level || '',
    peerGroupSize: di.peer_group_size ? Number(di.peer_group_size) : undefined,
    peerMedian: di.peer_median ? Number(di.peer_median) : undefined,
    peerMean: di.peer_mean ? Number(di.peer_mean) : undefined,
    peerPercentile: di.peer_percentile ? Number(di.peer_percentile) : undefined,
    peerDeviation: di.peer_deviation ? Number(di.peer_deviation) : undefined,
    peerComparisonText: di.peer_comparison_text || '',
    timelineComparisonText: di.timeline_comparison_text || '',
    peerDurationMedian: di.peer_duration_median ? Number(di.peer_duration_median) : undefined,
    durationDeviation: di.duration_deviation ? Number(di.duration_deviation) : undefined,
    dataStreamsCount,
  }
}

export interface WorkFilters {
  role?: Role
  district?: string
  state?: string
  status?: string
  riskLevel?: string
  category?: string
  searchQuery?: string
}

export const SentinelApi = {
  // Base configuration
  isLiveApi: true,
  apiBaseUrl: API_BASE_URL,

  getWork,
  getWorkRisk,
  getWorkSignals,
  getWorkExpenditure,

  async getDashboardSummary(_role?: Role, _district?: string, _state?: string): Promise<DashboardSummary> {
    return fetchDashboardSummary()
  },

  async getStateSummary(): Promise<StateSummaryResponse> {
    return fetchStateSummary()
  },

  async getWorks(filters?: WorkFilters): Promise<{ works: Project[]; total: number }> {
    const res = await fetchWorks({
      search: filters?.searchQuery,
      state: filters?.state,
      risk_band: filters?.riskLevel,
    })
    return {
      works: res.works.map(mapBackendWorkToProject),
      total: res.total,
    }
  },

  async getWorkById(id: string): Promise<Project | null> {
    try {
      const [detail, risk, signals, exp] = await Promise.all([
        getWork(id),
        getWorkRisk(id).catch(() => null),
        getWorkSignals(id).catch(() => null),
        getWorkExpenditure(id).catch(() => null),
      ])
      return assembleProjectDetail(detail, risk, signals, exp)
    } catch (e) {
      console.error(`Failed to fetch project by id ${id}:`, e)
      return null
    }
  },

  async updateWork(id: string, _payload: ProjectUpdatePayload): Promise<RiskReassessmentResult> {
    // Contract definition for POST /api/v1/works/{id}/update
    return {
      projectId: id,
      projectName: '',
      previousRisk: 0,
      previousRiskLevel: 'low',
      updatedRisk: 0,
      updatedRiskLevel: 'low',
      riskDelta: 0,
      primaryReason: '',
      recommendedAction: '',
      newSignals: [],
      addedToPriorityQueue: false,
    }
  },

  async assignInspection(payload: {
    projectId: string
    officerName: string
    scheduledDate: string
    reason: string
  }): Promise<Inspection> {
    return {
      id: `insp-${Date.now()}`,
      projectId: payload.projectId,
      location: '',
      riskLevel: 'high',
      reason: payload.reason,
      requestedBy: 'District Authority',
      assignedOfficer: payload.officerName,
      inspectionDate: payload.scheduledDate,
      status: 'assigned',
    }
  },

  async submitOfficialFinding(payload: {
    inspectionId: string
    projectId: string
    finding: OfficialFindingOption
    remarks: string
    action: 'RESOLVE' | 'ESCALATE'
  }) {
    return {
      status: 'recorded',
      timestamp: new Date().toISOString(),
      ...payload,
    }
  },
}
