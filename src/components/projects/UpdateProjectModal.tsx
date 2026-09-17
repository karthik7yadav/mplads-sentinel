import React, { useState } from 'react'
import type { Project, ProjectUpdatePayload, RiskReassessmentResult } from '../../types'
import { useProjectData } from '../../context/ProjectDataContext'
import { X, Sparkles, AlertTriangle, Upload, Check } from 'lucide-react'

interface UpdateProjectModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
  onReassessmentDone: (result: RiskReassessmentResult) => void
}

export const UpdateProjectModal: React.FC<UpdateProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onReassessmentDone,
}) => {
  const { updateProjectExecution } = useProjectData()

  const [physicalProgress, setPhysicalProgress] = useState(project.physicalProgress ?? 0)
  const [financialProgress, setFinancialProgress] = useState(project.financialProgress ?? 0)
  const [expenditureLakhs, setExpenditureLakhs] = useState(project.expenditureLakhs)
  const [milestoneStatus, setMilestoneStatus] = useState('Plinth & Foundation Completed')
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('2026-11-30')
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Escape key handler
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 1-Click SIH Hackathon Demo Trigger (Section 60)
  const handleLoadDemoSpike = () => {
    setFinancialProgress(84)
    setPhysicalProgress(42)
    setExpenditureLakhs(Number((project.sanctionedLakhs * 0.84).toFixed(1)))
    setRemarks('Contractor submitted RA Bill-04. Milestone inspection pending verification.')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload: ProjectUpdatePayload = {
      physicalProgress: Number(physicalProgress),
      financialProgress: Number(financialProgress),
      expenditureLakhs: Number(expenditureLakhs),
      milestoneStatus,
      expectedCompletionDate,
      remarks,
    }

    try {
      const result = updateProjectExecution(project.id, payload)
      setIsSubmitting(false)
      onClose()
      onReassessmentDone(result)
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              District Authority Operation
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Update Project Execution Information
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {project.name} ({project.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Demo Fast-Trigger Banner */}
        <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            <span>SIH Demo: Simulate progress discrepancy scenario</span>
          </div>
          <button
            type="button"
            onClick={handleLoadDemoSpike}
            className="text-xs font-mono font-bold px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded shadow-2xs transition-colors"
          >
            Trigger Risk Spike
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Physical Progress (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={physicalProgress}
                onChange={(e) => setPhysicalProgress(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Financial Progress (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={financialProgress}
                onChange={(e) => setFinancialProgress(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Booked Expenditure (₹ Lakhs)
              </label>
              <input
                type="number"
                step="0.1"
                value={expenditureLakhs}
                onChange={(e) => setExpenditureLakhs(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600 text-sm font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Current Milestone Status
            </label>
            <input
              type="text"
              value={milestoneStatus}
              onChange={(e) => setMilestoneStatus(e.target.value)}
              placeholder="e.g. Masonry & Roofing In Progress"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              District Authority Officer Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record details of contractor billing, measurement book verification, or field notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Document Upload Placeholder */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Upload size={16} className="text-slate-400" />
              <div>
                <span className="font-medium text-slate-800 block">Measurement Book / RA Bill Upload</span>
                <span className="text-[10px] text-slate-400">PDF, JPG up to 10MB</span>
              </div>
            </div>
            <button
              type="button"
              className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700"
            >
              Browse
            </button>
          </div>

          {/* Gap Warning indicator */}
          {financialProgress - physicalProgress >= 25 && (
            <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Progress gap of +{financialProgress - physicalProgress}%:</strong> Submitting this update will trigger an automatic risk reassessment and flag the project for targeted verification.
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5"
            >
              <Check size={14} />
              {isSubmitting ? 'Updating & Reassessing...' : 'Submit & Reassess Risk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
