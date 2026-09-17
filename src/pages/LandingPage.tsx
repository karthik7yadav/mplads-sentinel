import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'
import { ShieldCheck, ArrowRight, Building2, CheckCircle2 } from 'lucide-react'

export const LandingPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState<Role>('mospi')

  const rolesList: {
    id: Role
    title: string
    subtitle: string
    description: string
    scopeBadge: string
  }[] = [
    {
      id: 'mospi',
      title: 'Central MoSPI Authority',
      subtitle: 'National Monitoring Cell • New Delhi',
      description: 'Pan-India oversight, state risk concentration & national synthesis.',
      scopeBadge: 'National',
    },
    {
      id: 'nodal',
      title: 'State Nodal Officer',
      subtitle: 'State Administration • Rajasthan',
      description: 'Inter-district risk benchmarking, state priority queue & escalations.',
      scopeBadge: 'State',
    },
    {
      id: 'dm',
      title: 'District Authority / DM',
      subtitle: 'District Collectorate • Rajsamand',
      description: 'Operational tracking, field inspections & execution monitoring.',
      scopeBadge: 'District',
    },
    {
      id: 'mp',
      title: 'Member of Parliament',
      subtitle: 'Constituency Development • Rajsamand',
      description: 'Citizen petition triage, AI suggestions & recommendation pipeline.',
      scopeBadge: 'Constituency',
    },
  ]

  const handleContinue = () => {
    login(selectedRole)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top Emblem & Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck size={26} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                MPLADS SENTINEL
                <span className="text-xs font-mono uppercase bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
                  SIH 2026 Prototype
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                AI-Powered Monitoring, Risk Intelligence & Verification Platform
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <Building2 size={14} className="text-slate-500" />
            <span>Ministry of Statistics and Programme Implementation (MoSPI)</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Role Selection Card */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Hero Area */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-blue-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational Decision-Support System
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Transforming MPLADS project data into explainable monitoring actions.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                An intelligent verification layer assisting Members of Parliament, District Collectors, and State Authorities to prioritize reviews, explain anomalies, and verify public works without replacing human decision-making.
              </p>
            </div>

            {/* Three Simple Value Points: Prioritize, Explain, Verify */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  01 • Prioritize
                </div>
                <h2 className="text-sm font-bold text-white">Risk-Ranked Queue</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Filters high-volume works into actionable priority items.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  02 • Explain
                </div>
                <h2 className="text-sm font-bold text-white">Transparent Signals</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Clear physical vs financial mismatch & peer benchmarks.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  03 • Verify
                </div>
                <h2 className="text-sm font-bold text-white">Human Oversight</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Field assignments, gazette cross-checks & official findings.
                </p>
              </div>
            </div>
          </div>

          {/* Right Role Selection Panel */}
          <div className="lg:col-span-5 bg-white text-slate-900 rounded-2xl p-7 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  SIH 2026 Prototype
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Interactive Evaluation
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Select Portal Perspective
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose an administrative role to explore its tailored monitoring view.
              </p>
            </div>

            {/* Role Options */}
            <div className="space-y-2.5">
              {rolesList.map((r) => {
                const isSelected = selectedRole === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedRole(r.id)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {r.title}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {r.scopeBadge}
                        </span>
                      </div>
                      {isSelected ? (
                        <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded">
                          <CheckCircle2 size={13} className="text-blue-600" />
                          <span>Selected</span>
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded border border-slate-200">
                          Select
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {r.subtitle}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Clear Primary Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-3 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={16} />
            </button>

            {/* Prototype Notice */}
            <div className="text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck size={13} className="text-slate-400" />
              <span>Demo Role Selection • SIH Prototype (No credentials required)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-3.5 text-xs text-slate-500 font-mono text-center">
        MPLADS SENTINEL Decision Support System • Ministry of Statistics & Programme Implementation
      </footer>
    </div>
  )
}
