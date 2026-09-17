import React, { useState } from 'react'
import type { OfficialFindingOption, Project } from '../../types'
import { useProjectData } from '../../context/ProjectDataContext'
import { X, CheckCircle, ShieldAlert, AlertTriangle, HelpCircle, FileCheck } from 'lucide-react'

interface OfficialFindingModalProps {
  project: Project
  inspectionId?: string
  isOpen: boolean
  onClose: () => void
}

export const OfficialFindingModal: React.FC<OfficialFindingModalProps> = ({
  project,
  inspectionId = 'insp-default',
  isOpen,
  onClose,
}) => {
  const { recordOfficialFinding } = useProjectData()

  const [finding, setFinding] = useState<OfficialFindingOption>('REQUIRES ACTION')
  const [remarks, setRemarks] = useState(
    'Expenditure documentation and Measurement Book reconciliation require additional field verification by Assistant Executive Engineer.',
  )
  const [actionChoice, setActionChoice] = useState<'RESOLVE' | 'ESCALATE'>('RESOLVE')

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    recordOfficialFinding(project.id, inspectionId, finding, remarks, actionChoice)
    onClose()
  }

  const options: Array<{
    val: OfficialFindingOption
    label: string
    icon: any
    color: string
    desc: string
  }> = [
    {
      val: 'EXPLAINED',
      label: 'EXPLAINED',
      icon: CheckCircle,
      color: 'border-emerald-300 bg-emerald-50/50 text-emerald-950',
      desc: 'Contextual notification or valid delay explains the anomaly. No fiscal irregularity found.',
    },
    {
      val: 'REQUIRES ACTION',
      label: 'REQUIRES ACTION',
      icon: AlertTriangle,
      color: 'border-amber-300 bg-amber-50/50 text-amber-950',
      desc: 'Measurement Book discrepancy or billing pace requires corrective administrative action.',
    },
    {
      val: 'ESCALATED',
      label: 'ESCALATED',
      icon: ShieldAlert,
      color: 'border-rose-300 bg-rose-50/50 text-rose-950',
      desc: 'Significant unexplained discrepancy; referred to State Nodal Authority & MoSPI audit.',
    },
    {
      val: 'INCONCLUSIVE',
      label: 'INCONCLUSIVE',
      icon: HelpCircle,
      color: 'border-slate-300 bg-slate-50 text-slate-900',
      desc: 'Insufficient physical evidence or incomplete measurement records; joint re-inspection required.',
    },
  ]

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Official Finding Record
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Record Verification Finding
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Select Official Administrative Determination
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt) => {
                const Icon = opt.icon
                const isSelected = finding === opt.val
                return (
                  <div
                    key={opt.val}
                    onClick={() => {
                      setFinding(opt.val)
                      if (opt.val === 'ESCALATED') setActionChoice('ESCALATE')
                      else setActionChoice('RESOLVE')
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? `${opt.color} ring-2 ring-blue-600 shadow-xs`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold font-mono text-xs">
                      <Icon size={15} />
                      <span>{opt.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Officer Inspection Remarks & Evidence Summary
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              placeholder="Record official observations from site visit, contractor bills inspected, or measurement entries..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Case Disposition Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer ${
                  actionChoice === 'RESOLVE'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="actionChoice"
                  checked={actionChoice === 'RESOLVE'}
                  onChange={() => setActionChoice('RESOLVE')}
                />
                <span>Resolve at District Level</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer ${
                  actionChoice === 'ESCALATE'
                    ? 'border-purple-300 bg-purple-50 text-purple-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="actionChoice"
                  checked={actionChoice === 'ESCALATE'}
                  onChange={() => setActionChoice('ESCALATE')}
                />
                <span>Escalate to State / MoSPI</span>
              </label>
            </div>
          </div>

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
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5"
            >
              <FileCheck size={14} />
              Submit Official Finding
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
