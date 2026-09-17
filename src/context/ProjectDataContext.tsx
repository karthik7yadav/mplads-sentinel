import React, { createContext, useContext, useState, useMemo } from 'react'
import type {
  AnomalyContributor,
  AppNotification,
  CitizenNeed,
  AiWorkSuggestion,
  Inspection,
  MpRecommendation,
  OfficialFindingOption,
  Project,
  ProjectUpdatePayload,
  RiskLevel,
  RiskReassessmentResult,
} from '../types'
import {
  REAL_PROJECTS,
  REAL_INSPECTIONS,
  REAL_NOTIFICATIONS as INITIAL_NOTIFICATIONS,
  CITIZEN_NEEDS as INITIAL_CITIZEN_NEEDS,
  AI_WORK_SUGGESTIONS as INITIAL_AI_SUGGESTIONS,
  MP_RECOMMENDATIONS as INITIAL_MP_RECOMMENDATIONS,
} from '../data/realData'
import { useAuth } from './AuthContext'

interface ProjectDataContextType {
  projects: Project[]
  scopedProjects: Project[]
  priorityQueue: Project[]
  inspections: Inspection[]
  notifications: AppNotification[]
  unreadAlertsCount: number
  citizenNeeds: CitizenNeed[]
  aiSuggestions: AiWorkSuggestion[]
  mpRecommendations: MpRecommendation[]
  getProjectById: (id: string) => Project | undefined
  getInspectionByProjectId: (projectId: string) => Inspection | undefined
  updateProjectExecution: (id: string, payload: ProjectUpdatePayload) => RiskReassessmentResult
  assignVerification: (projectId: string, officerName: string, scheduledDate: string, reason: string) => void
  recordOfficialFinding: (
    projectId: string,
    inspectionId: string,
    finding: OfficialFindingOption,
    remarks: string,
    action: 'RESOLVE' | 'ESCALATE',
  ) => void
  submitMpRecommendation: (rec: Omit<MpRecommendation, 'id' | 'recommendationDate'>) => void
  updateRecommendationStatus: (id: string, status: MpRecommendation['status'], remarks?: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  resetDemoData: () => void
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined)

const STORAGE_PREFIX = 'mplads_sentinel_v3_canonical_'

export const ProjectDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, role } = useAuth()

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'projects')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed parsing stored projects', e)
      }
    }
    return REAL_PROJECTS
  })

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'notifications_v2') || localStorage.getItem(STORAGE_PREFIX + 'notifications')
    const readIds = new Set<string>()
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          parsed.forEach((n) => {
            if (n && n.id && n.read) {
              readIds.add(n.id)
            }
          })
        }
      } catch (e) {
        console.error('Failed parsing stored notifications', e)
      }
    }
    // Clean legacy storage key to purge old mock notifications (n-3, n-5, or synthetic alerts)
    localStorage.removeItem(STORAGE_PREFIX + 'notifications')
    return INITIAL_NOTIFICATIONS.map((n) => ({
      ...n,
      read: readIds.has(n.id) ? true : n.read,
    }))
  })

  const [inspections, setInspections] = useState<Inspection[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'inspections')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed parsing stored inspections', e)
      }
    }
    return REAL_INSPECTIONS
  })

  const [citizenNeeds] = useState<CitizenNeed[]>(INITIAL_CITIZEN_NEEDS)
  const [aiSuggestions] = useState<AiWorkSuggestion[]>(INITIAL_AI_SUGGESTIONS)
  const [mpRecommendations, setMpRecommendations] = useState<MpRecommendation[]>(() => {
    localStorage.removeItem(STORAGE_PREFIX + 'recommendations')
    const saved = localStorage.getItem(STORAGE_PREFIX + 'recommendations_v2')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed parsing stored recommendations', e)
      }
    }
    return INITIAL_MP_RECOMMENDATIONS
  })

  const persistProjects = (updated: Project[]) => {
    setProjects(updated)
    localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify(updated))
  }

  const persistNotifications = (updated: AppNotification[]) => {
    setNotifications(updated)
    localStorage.setItem(STORAGE_PREFIX + 'notifications_v2', JSON.stringify(updated))
  }

  const persistInspections = (updated: Inspection[]) => {
    setInspections(updated)
    localStorage.setItem(STORAGE_PREFIX + 'inspections', JSON.stringify(updated))
  }

  const persistRecommendations = (updated: MpRecommendation[]) => {
    setMpRecommendations(updated)
    localStorage.setItem(STORAGE_PREFIX + 'recommendations_v2', JSON.stringify(updated))
  }

  // Scoped projects based on logged-in role & jurisdiction
  const scopedProjects = useMemo(() => {
    switch (role) {
      case 'dm': {
        const userState = (currentUser.state || '').toLowerCase()
        const userDist = (currentUser.district || '').toLowerCase()
        const userConst = (currentUser.constituency || '').toLowerCase()

        return projects.filter((p) => {
          const matchState = !userState || p.state.toLowerCase() === userState
          if (!matchState) return false
          if (!userDist && !userConst) return true

          // Match IDA district or constituency
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

        return projects.filter((p) => {
          const matchState = !userState || p.state.toLowerCase() === userState
          if (!matchState) return false
          if (!userConst) return true

          const pConst = p.constituency.toLowerCase()
          return pConst.includes(userConst) || userConst.includes(pConst)
        })
      }
      case 'nodal': {
        const userState = (currentUser.state || '').toLowerCase()
        return projects.filter((p) => !userState || p.state.toLowerCase() === userState)
      }
      case 'mospi':
      default:
        return projects
    }
  }, [projects, role, currentUser])

  // Role-scoped Priority Queue sorted by riskScore descending
  const priorityQueue = useMemo(() => {
    return scopedProjects
      .filter((p) => p.riskScore >= 60 || p.status === 'flagged' || p.status === 'inspection_required' || p.status === 'escalated')
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [scopedProjects])

  // Role-filtered notifications
  const scopedNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Audience match
      if (!n.audience.includes(role)) return false

      switch (role) {
        case 'dm': {
          const userState = (currentUser.state || '').toLowerCase()
          const userDist = (currentUser.district || '').toLowerCase()
          const userConst = (currentUser.constituency || '').toLowerCase()

          const nState = (n.state || '').toLowerCase()
          const nDist = (n.district || '').toLowerCase()
          const nConst = (n.constituency || '').toLowerCase()

          if (userState && nState && userState !== nState) return false
          if (!userDist && !userConst) return true

          return (
            (userDist && (nDist.includes(userDist) || userDist.includes(nDist))) ||
            (userConst && (nConst.includes(userConst) || userConst.includes(nConst)))
          )
        }
        case 'mp': {
          const userState = (currentUser.state || '').toLowerCase()
          const userConst = (currentUser.constituency || '').toLowerCase()

          const nState = (n.state || '').toLowerCase()
          const nConst = (n.constituency || '').toLowerCase()

          if (userState && nState && userState !== nState) return false
          if (!userConst) return true

          return nConst.includes(userConst) || userConst.includes(nConst)
        }
        case 'nodal': {
          const userState = (currentUser.state || '').toLowerCase()
          const nState = (n.state || '').toLowerCase()
          if (!userState || !nState) return true
          return nState === userState || nState.includes(userState) || userState.includes(nState)
        }
        case 'mospi':
        default:
          return true
      }
    })
  }, [notifications, role, currentUser])

  const unreadAlertsCount = useMemo(() => {
    return scopedNotifications.filter((n) => !n.read).length
  }, [scopedNotifications])

  // Constituency-scoped citizen needs
  const scopedCitizenNeeds = useMemo(() => {
    if (role === 'mp') {
      const userConst = (currentUser.constituency || '').toUpperCase().trim()
      const userState = (currentUser.state || '').toUpperCase().trim()
      return citizenNeeds.filter((n) => {
        const nConst = (n.constituency || '').toUpperCase().trim()
        const nState = (n.state || '').toUpperCase().trim()
        const matchConst = userConst ? nConst === userConst : true
        const matchState = userState && nState ? nState === userState : true
        return matchConst && matchState
      })
    }
    if (role === 'dm') {
      const userConst = (currentUser.constituency || '').toUpperCase().trim()
      const userDist = (currentUser.district || '').toUpperCase().trim()
      return citizenNeeds.filter((n) => {
        const nConst = (n.constituency || '').toUpperCase().trim()
        const nLoc = (n.location || '').toUpperCase().trim()
        return (userConst && nConst === userConst) || (userDist && nLoc.includes(userDist))
      })
    }
    if (role === 'nodal') {
      const userState = (currentUser.state || '').toUpperCase().trim()
      return citizenNeeds.filter((n) => {
        const nState = (n.state || '').toUpperCase().trim()
        return !userState || !nState || nState === userState
      })
    }
    return citizenNeeds
  }, [citizenNeeds, role, currentUser])

  // AI work suggestions strictly linked to scoped citizen needs
  const scopedAiSuggestions = useMemo(() => {
    const validNeedIds = new Set(scopedCitizenNeeds.map((n) => n.id))
    return aiSuggestions.filter((s) => validNeedIds.has(s.needId))
  }, [aiSuggestions, scopedCitizenNeeds])

  // Constituency-scoped MP recommendations
  const scopedMpRecommendations = useMemo(() => {
    if (role === 'mp' || role === 'dm') {
      const userConst = (currentUser.constituency || '').toUpperCase().trim()
      return mpRecommendations.filter(
        (r) => (r.constituency || '').toUpperCase().trim() === userConst
      )
    }
    return mpRecommendations
  }, [mpRecommendations, role, currentUser])

  const getProjectById = (id: string) => {
    return projects.find((p) => p.id === id)
  }

  const getInspectionByProjectId = (projectId: string) => {
    return inspections.find((i) => i.projectId === projectId)
  }

  // Continuous Project Update & Risk Reassessment Engine
  const updateProjectExecution = (id: string, payload: ProjectUpdatePayload): RiskReassessmentResult => {
    const existing = projects.find((p) => p.id === id)
    if (!existing) {
      throw new Error(`Project ${id} not found`)
    }

    const previousRisk = existing.riskScore
    const previousRiskLevel = existing.riskLevel

    // Compute updated risk based on operational signals:
    // Gap between Financial and Physical progress
    const gap = payload.financialProgress - payload.physicalProgress
    let updatedRisk = previousRisk
    let updatedRiskLevel: RiskLevel = previousRiskLevel
    const newSignals: AnomalyContributor[] = [...existing.anomalies]
    let primaryReason = existing.primaryReason || ''
    let recommendedAction = existing.recommendedAction || ''

    // If gap >= 35 points, trigger high/critical risk signal
    if (gap >= 35) {
      updatedRisk = Math.max(previousRisk, Math.min(94, 75 + Math.floor(gap * 0.35)))
      updatedRiskLevel = updatedRisk >= 90 ? 'critical' : 'high'
      primaryReason = 'Financial–physical progress mismatch'
      recommendedAction = 'Targeted verification of expenditure against physical progress'

      // Check if mismatch signal already exists or add/update it
      const mismatchIndex = newSignals.findIndex((s) => s.category === 'progress_mismatch')
      const mismatchSignal: AnomalyContributor = {
        id: `${id}-mm-updated`,
        category: 'progress_mismatch',
        title: 'Progress mismatch',
        severity: updatedRiskLevel,
        explanation: 'Financial progress is substantially ahead of reported physical progress.',
        metricLabel: 'Financial vs physical',
        metricValue: `${payload.financialProgress}% / ${payload.physicalProgress}%`,
        normalRange: 'Gap typically within 10–15 percentage points',
        detail: 'Expenditure booking has accelerated without proportional physical milestone verification.',
      }

      if (mismatchIndex >= 0) {
        newSignals[mismatchIndex] = mismatchSignal
      } else {
        newSignals.unshift(mismatchSignal)
      }
    } else if (gap <= 15 && previousRisk > 60) {
      // Convergence
      updatedRisk = Math.max(32, previousRisk - 30)
      updatedRiskLevel = updatedRisk >= 75 ? 'high' : updatedRisk >= 50 ? 'medium' : 'low'
      primaryReason = 'Progress alignment in progress'
    }

    const riskDelta = updatedRisk - previousRisk
    const addedToPriorityQueue = updatedRisk >= 60

    const updatedProject: Project = {
      ...existing,
      physicalProgress: payload.physicalProgress,
      financialProgress: payload.financialProgress,
      expenditureLakhs: payload.expenditureLakhs,
      riskScore: updatedRisk,
      riskLevel: updatedRiskLevel,
      primaryReason,
      recommendedAction,
      status: addedToPriorityQueue ? 'flagged' : existing.status,
      anomalies: newSignals,
      notes: payload.remarks
        ? [
            ...existing.notes,
            {
              id: `note-${Date.now()}`,
              author: currentUser.displayName,
              role: currentUser.role,
              text: `Execution update: Financial ${payload.financialProgress}%, Physical ${payload.physicalProgress}%. Remarks: ${payload.remarks}`,
              createdAt: new Date().toISOString(),
            },
          ]
        : existing.notes,
    }

    const updatedList = projects.map((p) => (p.id === id ? updatedProject : p))
    persistProjects(updatedList)

    // Option B: Local demo notification creation disabled to keep notifications feed strictly authoritative.

    return {
      projectId: id,
      projectName: existing.name,
      previousRisk,
      previousRiskLevel,
      updatedRisk,
      updatedRiskLevel,
      riskDelta,
      primaryReason,
      recommendedAction,
      newSignals,
      addedToPriorityQueue,
    }
  }

  // Assign Verification Workflow
  const assignVerification = (projectId: string, officerName: string, scheduledDate: string, reason: string) => {
    const proj = projects.find((p) => p.id === projectId)
    if (!proj) return

    const newInspection: Inspection = {
      id: `insp-${Date.now()}`,
      projectId,
      location: `${proj.name}, ${proj.district}`,
      riskLevel: proj.riskLevel,
      reason,
      requestedBy: currentUser.displayName,
      assignedOfficer: officerName,
      inspectionDate: scheduledDate,
      status: 'assigned',
    }

    persistInspections([newInspection, ...inspections.filter((i) => i.projectId !== projectId)])

    // Update project state
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          inspectionStatus: 'assigned' as const,
          status: 'inspection_required' as const,
          actions: p.actions.map((a) => (a.title.includes('field') ? { ...a, status: 'In Progress' as const } : a)),
        }
      }
      return p
    })
    persistProjects(updatedProjects)

    // Option B: Local demo notification creation disabled to keep notifications feed strictly authoritative.
  }

  // Record Official Finding Workflow
  const recordOfficialFinding = (
    projectId: string,
    inspectionId: string,
    finding: OfficialFindingOption,
    remarks: string,
    action: 'RESOLVE' | 'ESCALATE',
  ) => {
    const targetProj = projects.find((p) => p.id === projectId)
    if (!targetProj) return

    // Update inspection
    const updatedInspections = inspections.map((i) => {
      if (i.id === inspectionId || i.projectId === projectId) {
        return {
          ...i,
          status: 'report_submitted' as const,
          remarks,
          finalRecommendation:
            finding === 'EXPLAINED'
              ? ('Verified' as const)
              : finding === 'ESCALATED' || action === 'ESCALATE'
                ? ('Escalate' as const)
                : ('Requires Further Review' as const),
        }
      }
      return i
    })
    persistInspections(updatedInspections)

    // Update project status & risk
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        const isResolved = action === 'RESOLVE' && (finding === 'EXPLAINED' || finding === 'REQUIRES ACTION')
        const isEscalated = action === 'ESCALATE' || finding === 'ESCALATED'

        let newStatus = p.status
        let newRisk = p.riskScore
        let newLevel = p.riskLevel

        if (isResolved && finding === 'EXPLAINED') {
          newStatus = 'verified'
          newRisk = Math.min(newRisk, 38)
          newLevel = 'low'
        } else if (isEscalated) {
          newStatus = 'escalated'
          newLevel = 'critical'
        }

        return {
          ...p,
          status: newStatus,
          riskScore: newRisk,
          riskLevel: newLevel,
          inspectionStatus: 'completed' as const,
          notes: [
            ...p.notes,
            {
              id: `note-${Date.now()}`,
              author: currentUser.displayName,
              role: currentUser.role,
              text: `Official Finding: [${finding}] by District Authority. ${remarks}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      }
      return p
    })
    persistProjects(updatedProjects)

    // Option B: Local demo notification creation disabled to keep notifications feed strictly authoritative.
  }

  // Submit MP Recommendation
  const submitMpRecommendation = (rec: Omit<MpRecommendation, 'id' | 'recommendationDate'>) => {
    const newRec: MpRecommendation = {
      ...rec,
      id: `REC-${Date.now().toString().slice(-4)}`,
      constituency: currentUser.constituency || 'RAJSAMAND',
      state: currentUser.state || 'Rajasthan',
      recommendationDate: new Date().toISOString().split('T')[0],
      status: 'Submitted',
      isSynthetic: true,
    }
    persistRecommendations([newRec, ...mpRecommendations])

    // Option B: Local demo notification creation disabled to keep notifications feed strictly authoritative.
  }

  // DM Pre-Sanction Decision
  const updateRecommendationStatus = (id: string, status: MpRecommendation['status'], remarks?: string) => {
    const updated = mpRecommendations.map((r) => (r.id === id ? { ...r, status, districtAuthorityRemarks: remarks } : r))
    persistRecommendations(updated)
  }

  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    persistNotifications(updated)
  }

  const markAllNotificationsRead = () => {
    const scopedIds = new Set(scopedNotifications.map((n) => n.id))
    const updated = notifications.map((n) => (scopedIds.has(n.id) ? { ...n, read: true } : n))
    persistNotifications(updated)
  }

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_PREFIX + 'projects')
    localStorage.removeItem(STORAGE_PREFIX + 'notifications')
    localStorage.removeItem(STORAGE_PREFIX + 'notifications_v2')
    localStorage.removeItem(STORAGE_PREFIX + 'inspections')
    localStorage.removeItem(STORAGE_PREFIX + 'recommendations')
    localStorage.removeItem(STORAGE_PREFIX + 'recommendations_v2')
    setProjects(REAL_PROJECTS)
    setNotifications(INITIAL_NOTIFICATIONS)
    setInspections(REAL_INSPECTIONS)
    setMpRecommendations(INITIAL_MP_RECOMMENDATIONS)
  }

  const value: ProjectDataContextType = {
    projects,
    scopedProjects,
    priorityQueue,
    inspections,
    notifications: scopedNotifications,
    unreadAlertsCount,
    citizenNeeds: scopedCitizenNeeds,
    aiSuggestions: scopedAiSuggestions,
    mpRecommendations: scopedMpRecommendations,
    getProjectById,
    getInspectionByProjectId,
    updateProjectExecution,
    assignVerification,
    recordOfficialFinding,
    submitMpRecommendation,
    updateRecommendationStatus,
    markNotificationRead,
    markAllNotificationsRead,
    resetDemoData,
  }

  return <ProjectDataContext.Provider value={value}>{children}</ProjectDataContext.Provider>
}

export function useProjectData(): ProjectDataContextType {
  const ctx = useContext(ProjectDataContext)
  if (!ctx) {
    throw new Error('useProjectData must be used within a ProjectDataProvider')
  }
  return ctx
}
