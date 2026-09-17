import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import { AppShell } from '../components/shell/AppShell'
import { FileText, Download, Printer } from 'lucide-react'

export const ReportsPage: React.FC = () => {
  const { currentUser } = useAuth()
  const { scopedProjects, priorityQueue, inspections } = useProjectData()

  const [activeReportTab, setActiveReportTab] = useState<'risk' | 'status' | 'verification' | 'overview'>('risk')

  const handleExport = (format: string) => {
    alert(`Generating ${format.toUpperCase()} export for official administrative records...`)
  }

  return (
    <AppShell
      title="Administrative Reports & Compliance"
      subtitle="Periodic risk intelligence digests, statutory compliance summaries, and verification returns."
    >
      {/* Header with Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            Statutory Reporting Module
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepared for periodic reconciliation with State Nodal Officer & Ministry of Statistics (MoSPI).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer size={13} /> Print / PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={13} /> Export Data (XLSX)
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-mono">
        {[
          { id: 'risk', label: 'Risk Intelligence Summary' },
          { id: 'status', label: 'Project Lifecycle Status' },
          { id: 'verification', label: 'Verification & Findings Log' },
          { id: 'overview', label: 'District / State Overview' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeReportTab === tab.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content View */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
        {activeReportTab === 'risk' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Risk Prioritization Matrix ({currentUser.district || currentUser.state || 'National'})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Summary of active projects categorized by review priority band.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Work ID</th>
                    <th className="py-2.5 px-3">Project Title</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Primary Signal</th>
                    <th className="py-2.5 px-3">Financial / Physical</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {priorityQueue.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={p.riskScore >= 80 ? 'text-rose-600' : 'text-amber-600'}>
                          {p.riskScore}/100 ({p.riskLevel.toUpperCase()})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{p.primaryReason}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {p.financialProgress}% / {p.physicalProgress}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] uppercase text-slate-500">
                        {p.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReportTab === 'verification' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Verification & Official Findings Register
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of physical inspection directives, assigned engineers, and recorded findings.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Work ID & Location</th>
                    <th className="py-2.5 px-3">Assigned Officer</th>
                    <th className="py-2.5 px-3">Inspection Status</th>
                    <th className="py-2.5 px-3">Official Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {inspections.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{i.id}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium">{i.location}</td>
                      <td className="py-2.5 px-3 text-slate-700">{i.assignedOfficer || 'Pending Designation'}</td>
                      <td className="py-2.5 px-3 font-mono uppercase text-[11px] text-blue-700">
                        {i.status.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {i.finalRecommendation || 'Pending Review'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeReportTab === 'status' || activeReportTab === 'overview') && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Quarterly Infrastructure Execution Digest
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Composite progress across active community amenity categories.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase text-[10px] block font-semibold">Total Monitored Works</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{scopedProjects.length}</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase text-[10px] block font-semibold">Flagged for Verification</span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">{priorityQueue.length}</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase text-[10px] block font-semibold">Reconciliation Rate</span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">94.2%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
