import React from 'react'
import type { ProjectStatus, InspectionStatus } from '../../types'

interface StatusBadgeProps {
  status: ProjectStatus | InspectionStatus
  type?: 'project' | 'inspection'
  size?: 'sm' | 'md'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getStyles = () => {
    switch (status) {
      case 'flagged':
      case 'inspection_required':
        return 'bg-rose-50 text-rose-800 border-rose-200'
      case 'escalated':
        return 'bg-purple-50 text-purple-800 border-purple-200'
      case 'in_progress':
      case 'assigned':
      case 'scheduled':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'verified':
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'approved':
      case 'funded':
        return 'bg-teal-50 text-teal-800 border-teal-200'
      case 'recommended':
      case 'under_review':
      case 'requested':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const formatLabel = (val: string) => {
    return val
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs font-medium px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide uppercase font-mono ${getStyles()} ${sizeClass} ${className}`}
    >
      {formatLabel(status)}
    </span>
  )
}
