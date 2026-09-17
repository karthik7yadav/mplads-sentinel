import React from 'react'
import type { RiskLevel } from '../../types'
import { AlertTriangle, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  className?: string
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showScore = false,
  className = '',
}) => {
  const config = {
    critical: {
      label: 'CRITICAL',
      icon: ShieldAlert,
      bg: 'bg-red-50 text-red-800 border-red-200',
      dot: 'bg-red-600',
      iconColor: 'text-red-600',
    },
    high: {
      label: 'HIGH',
      icon: AlertTriangle,
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      dot: 'bg-amber-600',
      iconColor: 'text-amber-600',
    },
    medium: {
      label: 'MEDIUM',
      icon: AlertCircle,
      bg: 'bg-yellow-50 text-yellow-900 border-yellow-300',
      dot: 'bg-yellow-500',
      iconColor: 'text-yellow-600',
    },
    low: {
      label: 'LOW',
      icon: CheckCircle2,
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
      iconColor: 'text-emerald-600',
    },
  }[level] || {
    label: 'UNKNOWN',
    icon: AlertCircle,
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    iconColor: 'text-slate-500',
  }

  const Icon = config.icon

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size]

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size]

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono tracking-wide ${config.bg} ${sizeStyles} ${className}`}
      role="status"
      aria-label={`Risk level: ${config.label}${score !== undefined ? `, score: ${score}` : ''}`}
    >
      <Icon size={iconSizes} className={config.iconColor} aria-hidden="true" />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="font-bold border-l pl-1.5 border-current/20">
          {score}/100
        </span>
      )}
    </span>
  )
}
