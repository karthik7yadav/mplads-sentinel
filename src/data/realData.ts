import type {
  AiWorkSuggestion,
  AppNotification,
  CitizenNeed,
  Inspection,
  MpRecommendation,
  Project,
  RecommendedWork,
  User,
} from '../types'

import stateMetricsData from './real/state_metrics.json'
import nationalSummaryData from './real/national_summary.json'
import nationalRiskSignalsData from './real/national_risk_signals.json'
import canonicalProjectsData from './real/canonical_projects.json'
import syntheticOperationalData from './real/synthetic_operational.json'
import indiaMapPathsData from './real/india_map_paths.json'

export interface StateDistrictSummary {
  name: string
  total: number
  critical: number
  high: number
  sanctionedCr: number
}

export interface StateMetrics {
  state: string
  code: string
  totalWorks: number
  activeWorks: number
  completedWorks: number
  recommendedWorks: number
  criticalWorks: number
  highRiskWorks: number
  mediumRiskWorks: number
  lowRiskWorks: number
  pendingVerification: number
  sanctionedCrores: number
  expenditureCrores: number
  utilizationPercent: number
  topDistricts?: StateDistrictSummary[]
}

export interface IndiaMapPath {
  name: string
  path: string
  cx: number
  cy: number
}

export interface NationalRiskSignalCategory {
  label: string
  type: string
  count: number
  pct: string
  color: string
  description: string
}

export interface NationalRiskSignals {
  totalSignals: number
  categories: NationalRiskSignalCategory[]
}

// 1. Authoritative State & National Metrics from 72,675 canonical works
export const STATE_NATIONAL_METRICS: StateMetrics[] = stateMetricsData as StateMetrics[]
export const NATIONAL_SUMMARY = nationalSummaryData
export const NATIONAL_RISK_SIGNALS: NationalRiskSignals = nationalRiskSignalsData as NationalRiskSignals
export const INDIA_MAP_PATHS: IndiaMapPath[] = indiaMapPathsData as IndiaMapPath[]

// 2. Authoritative Canonical Projects
export const REAL_PROJECTS: Project[] = canonicalProjectsData as Project[]

// 3. Operational Synthetic Demo Data (Clearly tagged)
export const CITIZEN_NEEDS: CitizenNeed[] = (syntheticOperationalData.citizenNeeds || []) as CitizenNeed[]
export const AI_WORK_SUGGESTIONS: AiWorkSuggestion[] = (syntheticOperationalData.aiSuggestions || []) as AiWorkSuggestion[]
export const MP_RECOMMENDATIONS: MpRecommendation[] = (syntheticOperationalData.mpRecommendations || []) as MpRecommendation[]
export const REAL_INSPECTIONS: Inspection[] = (syntheticOperationalData.inspections || []) as Inspection[]

// 4. Canonical Pre-Sanction Recommended Works for District Authority Action
export const RECOMMENDED_WORKS: RecommendedWork[] = REAL_PROJECTS
  .filter((p) => p.status === 'recommended')
  .slice(0, 15)
  .map((p) => ({
    id: p.id,
    projectName: p.name,
    location: `${p.constituency}, ${p.state}`,
    estimatedLakhs: p.sanctionedLakhs,
    projectType: p.projectType,
    status: p.riskLevel === 'critical' ? 'Information Requested' : 'Pending Review',
    requiredInformation: p.primaryReason || 'Detailed project estimate and site clearance confirmation pending.',
    district: p.district,
    isSynthetic: false,
  }))

// 5. Official Role Personas (Scoped to active jurisdictions)
export const USERS: User[] = [
  {
    id: 'u-dm-rajsamand',
    username: 'dm.rajsamand',
    displayName: 'Shri Arun Kumar Purohit, IAS',
    designation: 'District Collector & District Magistrate',
    role: 'dm',
    district: 'RAJSAMAND(DISTRICT COLLECTOR RAJSAMAND_IDA)',
    state: 'Rajasthan',
    constituency: 'RAJSAMAND',
  },
  {
    id: 'u-dm-jaunpur',
    username: 'dm.jaunpur',
    displayName: 'Shri Ravindra Kumar Mandar, IAS',
    designation: 'District Magistrate & Collector',
    role: 'dm',
    district: 'JAUNPUR',
    state: 'Uttar Pradesh',
    constituency: 'JAUNPUR',
  },
  {
    id: 'u-mp-rajsamand',
    username: 'mp.rajsamand',
    displayName: 'Smt. Mahima Kumari Mewar',
    designation: 'Member of Parliament (Lok Sabha)',
    role: 'mp',
    district: 'RAJSAMAND',
    state: 'Rajasthan',
    constituency: 'RAJSAMAND',
  },
  {
    id: 'u-mp-karakat',
    username: 'mp.karakat',
    displayName: 'Shri Raja Ram Singh',
    designation: 'Member of Parliament (Lok Sabha)',
    role: 'mp',
    district: 'ROHTAS',
    state: 'Bihar',
    constituency: 'KARAKAT',
  },
  {
    id: 'u-nodal-rajasthan',
    username: 'nodal.rajasthan',
    displayName: 'Dr. Neeraj K. Pawan, IAS',
    designation: 'State Nodal Officer — Planning & Programme Monitoring',
    role: 'nodal',
    state: 'Rajasthan',
  },
  {
    id: 'u-nodal-up',
    username: 'nodal.up',
    displayName: 'Shri Manoj Kumar Singh, IAS',
    designation: 'State Nodal Authority — Uttar Pradesh',
    role: 'nodal',
    state: 'Uttar Pradesh',
  },
  {
    id: 'u-mospi',
    username: 'mospi.central',
    displayName: 'Smt. Meera Iyer, ISS',
    designation: 'Director, MPLADS Central Monitoring Cell',
    role: 'mospi',
  },
]

// 6. Operational System Review Notices (Referencing authentic Canonical Work IDs)
export const REAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    kind: 'critical',
    title: 'System Review Notice — Rajsamand',
    message: 'Work WS/MP383/2024-2025/11215 is flagged with review priority 96.3/100 due to unusual expenditure as a share of sanctioned amount compared with portfolio. Review recommended.',
    projectId: 'WS/MP383/2024-2025/11215',
    createdAt: '2026-03-01T10:15:00+05:30',
    read: false,
    audience: ['dm', 'nodal', 'mospi', 'mp'],
    district: 'RAJSAMAND(DISTRICT COLLECTOR RAJSAMAND_IDA)',
    state: 'Rajasthan',
    constituency: 'RAJSAMAND',
  },
  {
    id: 'n-2',
    kind: 'critical',
    title: 'System Review Notice — Rohtak',
    message: 'Work WS/MP18065/2026-2027/152353 is flagged with review priority 94.5/100 due to unusual sanctioned amount compared with similar works. Review recommended.',
    projectId: 'WS/MP18065/2026-2027/152353',
    createdAt: '2026-03-03T08:42:00+05:30',
    read: false,
    audience: ['dm', 'nodal', 'mospi', 'mp'],
    district: 'ROHTAK',
    state: 'Haryana',
    constituency: 'ROHTAK',
  },
  {
    id: 'n-4',
    kind: 'high',
    title: 'Review Priority Alert — Amravati',
    message: 'Work WS/MP18112/2025-2026/177331 is flagged with review priority 75.0/100 due to unusual expenditure share compared with peer cluster. Review recommended.',
    projectId: 'WS/MP18112/2025-2026/177331',
    createdAt: '2026-04-14T16:00:00+05:30',
    read: true,
    audience: ['dm', 'nodal', 'mospi', 'mp'],
    district: 'AMRAVATI(SC)',
    state: 'Maharashtra',
    constituency: 'AMRAVATI',
  },
  {
    id: 'n-6',
    kind: 'update',
    title: 'System Review Notice — Karakat',
    message: 'Work WS/MP003/2023-2024/13040 is flagged with compliance review signal: RULE-001 Lifecycle delay (pre-sanction proposal pending administrative sanction confirmation). Review recommended.',
    projectId: 'WS/MP003/2023-2024/13040',
    createdAt: '2026-06-01T14:20:00+05:30',
    read: false,
    audience: ['dm', 'mp', 'nodal', 'mospi'],
    district: 'ROHTAS',
    state: 'Bihar',
    constituency: 'KARAKAT',
  },
]

// Helper lookup functions
export function getStateMetric(stateName: string): StateMetrics | undefined {
  const norm = stateName.toLowerCase().trim()
  return STATE_NATIONAL_METRICS.find(
    (s) =>
      s.state.toLowerCase() === norm ||
      s.code.toLowerCase() === norm ||
      (norm.includes('kashmir') && s.state.includes('Kashmir')) ||
      (norm.includes('nicobar') && s.state.includes('Nicobar')),
  )
}
