import React, { useState } from 'react'
import type { Project } from '../../types'
import { useProjectData } from '../../context/ProjectDataContext'
import { X, Calendar, UserCheck, Send } from 'lucide-react'

interface AssignVerificationModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
}

export const AssignVerificationModal: React.FC<AssignVerificationModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const { assignVerification } = useProjectData()

  const [officerName, setOfficerName] = useState('Shri P. Ramakrishna, Assistant Executive Engineer')
  const [scheduledDate, setScheduledDate] = useState('2026-09-15')
  const [reason, setReason] = useState(
    'Verify financial expenditure against on-site physical measurement book (MB) entries.',
  )

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
    assignVerification(project.id, officerName, scheduledDate, reason)
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              District Verification Order
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">Assign Field Verification</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-xs">
              {project.name} ({project.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Designated Inspection Officer
            </label>
            <div className="relative">
              <UserCheck size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600 font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Scheduled Verification Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Specific Scope & Directive
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={13} />
              Issue Verification Directive
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
