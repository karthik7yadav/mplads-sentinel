export type Role = 'dm' | 'mp' | 'nodal' | 'mospi'

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

export type ProjectStatus =
  | 'recommended'
  | 'under_review'
  | 'approved'
  | 'funded'
  | 'contractor_assigned'
  | 'in_progress'
  | 'inspection_required'
  | 'verified'
  | 'completed'
  | 'flagged'
  | 'escalated'

export type InspectionStatus =
  | 'none'
  | 'requested'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'report_submitted'

export type AnomalyCategory =
  | 'financial'
  | 'progress_mismatch'
  | 'timeline'
  | 'cost'
  | 'vendor'
  | 'duplicate'
  | 'data_quality'
  | 'other'

export type NotificationKind =
  | 'critical'
  | 'high'
  | 'inspection'
  | 'update'
  | 'verified'

export interface User {
  id: string
  username: string
  displayName: string
  designation: string
  role: Role
  district?: string
  state?: string
  constituency?: string
}

export interface AnomalyContributor {
  id: string
  category: AnomalyCategory
  title: string
  severity: RiskLevel
  explanation: string
  metricLabel: string
  metricValue: string
  normalRange: string
  detail?: string
  whyItMatters?: string
  recommendedAction?: string
}

export interface ContextualEvidence {
  id: string
  found: boolean
  statement?: string
  source?: string
  date?: string
  relevance?: 'High' | 'Medium' | 'Low'
  confidence?: number
  contextualExplanation?: string
  isSynthetic?: boolean
}

export interface RecommendedAction {
  id: string
  step: number
  title: string
  priority: 'Immediate' | 'High' | 'Standard'
  reason: string
  status: 'Pending' | 'In Progress' | 'Completed'
  assignedAuthority: string
}

export interface Contractor {
  id: string
  name: string
  registrationId: string
  previousProjects: number
  delayedProjects: number
  highRiskAssociations: number
  riskIndicator: RiskLevel
  currentActiveProjects: number
  historicalPerformance: string
}

export interface Project {
  id: string
  name: string
  district: string
  state: string
  constituency: string
  mpName: string
  projectType: string
  status: ProjectStatus
  sanctionedLakhs: number
  expenditureLakhs: number
  physicalProgress?: number
  financialProgress?: number
  riskScore: number
  dataConfidence?: number
  riskLevel: RiskLevel
  primaryReason?: string
  recommendedAction?: string
  inspectionStatus: InspectionStatus
  lat?: number
  lng?: number
  implementingAgency?: string
  contractorId?: string
  startDate?: string
  expectedMonths?: number
  actualMonths?: number
  peerCostMinLakhs?: number
  peerCostMaxLakhs?: number
  beneficiaries?: string
  description?: string
  anomalies: AnomalyContributor[]
  evidence: ContextualEvidence[]
  actions: RecommendedAction[]
  notes: Note[]
  flaggedAt?: string
  isSynthetic?: boolean
  // Decision Intelligence & Data Quality Extensions
  primaryReasonSummary?: string
  whyItMatters?: string
  recommendedVerification?: string
  confidenceNote?: string
  dataQualityNote?: string
  availableFinancial?: string
  availableLifecycle?: string
  availableCompletion?: string
  peerMetricName?: string
  peerLevel?: string
  peerGroupSize?: number
  peerMedian?: number | string
  peerMean?: number | string
  peerPercentile?: number | string
  peerDeviation?: number | string
  peerComparisonText?: string
  timelineComparisonText?: string
  peerDurationMedian?: number | string
  durationDeviation?: number | string
  implementationDurationDays?: number | string
  recommendationDate?: string
  sanctionDate?: string
  completionDate?: string
  dataStreamsCount?: number
  physicalProgressReported?: boolean
}

export interface Note {
  id: string
  author: string
  role: Role
  text: string
  createdAt: string
}

export interface Inspection {
  id: string
  projectId: string
  location: string
  riskLevel: RiskLevel
  reason: string
  requestedBy: string
  assignedOfficer?: string
  inspectionDate?: string
  status: Exclude<InspectionStatus, 'none'>
  physicalProgressObserved?: number
  expenditureVerified?: boolean
  workQuality?: 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory'
  remarks?: string
  photographs?: string[]
  documents?: string[]
  finalRecommendation?: 'Verified' | 'Requires Further Review' | 'Escalate' | 'Close Alert'
  isSynthetic?: boolean
}

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  message: string
  projectId?: string
  createdAt: string
  read: boolean
  audience: Role[]
  district?: string
  state?: string
  constituency?: string
}

export interface RecommendedWork {
  id: string
  projectName: string
  location: string
  estimatedLakhs: number
  projectType: string
  status: 'Pending Review' | 'Information Requested' | 'Ready for Decision'
  requiredInformation: string
  district: string
  isSynthetic?: boolean
}

export interface DashboardKpis {
  [key: string]: number | string
}

export const ROLE_LABEL: Record<Role, string> = {
  dm: 'District Authority / DM',
  mp: 'Member of Parliament',
  nodal: 'MoSPI Nodal Authority',
  mospi: 'Central MoSPI Authority',
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  recommended: 'Recommended',
  under_review: 'Under Review',
  approved: 'Approved',
  funded: 'Funded',
  contractor_assigned: 'Contractor Assigned',
  in_progress: 'In Progress',
  inspection_required: 'Inspection Required',
  verified: 'Verified',
  completed: 'Completed',
  flagged: 'Flagged',
  escalated: 'Escalated',
}

export const INSPECTION_LABEL: Record<InspectionStatus, string> = {
  none: 'Not required',
  requested: 'Requested',
  assigned: 'Assigned',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  report_submitted: 'Report Submitted',
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const ANOMALY_LABEL: Record<AnomalyCategory, string> = {
  financial: 'Financial',
  progress_mismatch: 'Progress mismatch',
  timeline: 'Timeline',
  cost: 'Cost anomaly',
  vendor: 'Vendor anomaly',
  duplicate: 'Duplicate / similarity',
  data_quality: 'Data quality',
  other: 'Other',
}

export interface CitizenNeed {
  id: string
  category: string
  location: string
  constituency: string
  state?: string
  requestCount: number
  priority: 'High' | 'Medium' | 'Low'
  summary: string
  dateReported: string
  isSynthetic?: boolean
}

export interface AiWorkSuggestion {
  id: string
  needId: string
  suggestedTitle: string
  category: string
  estimatedCostMinLakhs: number
  estimatedCostMaxLakhs: number
  peerMedianLakhs: number
  potentialExistingAsset: 'Available / Verification Needed' | 'No Overlap Detected' | 'Existing Asset Nearby'
  existingAssetNote: string
  rationale: string
  isSynthetic?: boolean
}

export type MpRecommendationStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Sanctioned' | 'Returned'

export interface MpRecommendation {
  id: string
  projectName: string
  location: string
  constituency: string
  state?: string
  estimatedLakhs: number
  category: string
  status: MpRecommendationStatus
  recommendationDate: string
  justification: string
  beneficiaryCount: number
  districtAuthorityRemarks?: string
  isSynthetic?: boolean
}

export type OfficialFindingOption = 'EXPLAINED' | 'REQUIRES ACTION' | 'ESCALATED' | 'INCONCLUSIVE'

export interface ProjectUpdatePayload {
  physicalProgress: number
  financialProgress: number
  expenditureLakhs: number
  milestoneStatus: string
  expectedCompletionDate: string
  remarks: string
  documentName?: string
}

export interface RiskReassessmentResult {
  projectId: string
  projectName: string
  previousRisk: number
  previousRiskLevel: RiskLevel
  updatedRisk: number
  updatedRiskLevel: RiskLevel
  riskDelta: number
  primaryReason: string
  recommendedAction: string
  newSignals: AnomalyContributor[]
  addedToPriorityQueue: boolean
}
