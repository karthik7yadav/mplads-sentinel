import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProjectDataProvider } from './context/ProjectDataContext'

import { LandingPage } from './pages/LandingPage'
import { DistrictDashboard } from './pages/DistrictDashboard'
import { MpDashboard } from './pages/MpDashboard'
import { StateDashboard } from './pages/StateDashboard'
import { MospiCommandCenter } from './pages/MospiCommandCenter'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { PriorityQueuePage } from './pages/PriorityQueuePage'
import { VerificationPage } from './pages/VerificationPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'

// Dynamic Dashboard Resolver based on Active User Role (Section 8)
const DashboardDispatcher: React.FC = () => {
  const { role } = useAuth()

  switch (role) {
    case 'dm':
      return <DistrictDashboard />
    case 'mp':
      return <MpDashboard />
    case 'nodal':
      return <StateDashboard />
    case 'mospi':
    default:
      return <MospiCommandCenter />
  }
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectDataProvider>
          <Routes>
            {/* Landing & Authentication Gateway */}
            <Route path="/" element={<LandingPage />} />

            {/* Dynamic Role Dashboard */}
            <Route path="/dashboard" element={<DashboardDispatcher />} />

            {/* Core Project Directory */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/*" element={<ProjectDetailPage />} />

            {/* Priority Queue (Role-Scoped) */}
            <Route path="/priority-queue" element={<PriorityQueuePage />} />

            {/* Verification & Official Findings */}
            <Route path="/verification" element={<VerificationPage />} />

            {/* MP Specific Paths */}
            <Route path="/suggestions" element={<MpDashboard />} />
            <Route path="/recommendations" element={<MpDashboard />} />

            {/* State & National Specific Views */}
            <Route path="/district-monitoring" element={<StateDashboard />} />
            <Route path="/state-monitoring" element={<MospiCommandCenter />} />
            <Route path="/risk-analysis" element={<MospiCommandCenter />} />

            {/* Reports & Audit */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Notifications Center */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
