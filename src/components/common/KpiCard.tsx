import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?: 'default' | 'critical' | 'high' | 'warning' | 'success' | 'info'
  onClick?: () => void
  className?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
  className = '',
}) => {
  const variantStyles = {
    default: 'border-slate-200/90 bg-white text-slate-900 shadow-2xs',
    critical: 'border-rose-300 bg-rose-50/50 text-rose-950 shadow-2xs',
    high: 'border-amber-300 bg-amber-50/50 text-amber-950 shadow-2xs',
    warning: 'border-yellow-300 bg-yellow-50/50 text-yellow-950 shadow-2xs',
    success: 'border-emerald-200 bg-emerald-50/40 text-emerald-950 shadow-2xs',
    info: 'border-blue-200 bg-blue-50/40 text-blue-950 shadow-2xs',
  }[variant]

  const accentColor = {
    default: 'text-slate-400',
    critical: 'text-rose-600',
    high: 'text-amber-600',
    warning: 'text-yellow-600',
    success: 'text-emerald-600',
    info: 'text-blue-600',
  }[variant]

  const clickableClass = onClick ? 'cursor-pointer hover:border-slate-400 transition-all hover:shadow-xs' : ''

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3.5 sm:p-4 transition-all flex flex-col justify-between ${variantStyles} ${clickableClass} ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-1.5 min-h-[2.5rem]">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono leading-tight">
            {title}
          </span>
          {Icon && <Icon size={16} className={`${accentColor} shrink-0 mt-0.5`} aria-hidden="true" />}
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 leading-tight">
          {value}
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 text-[11px] text-slate-500 font-medium leading-snug line-clamp-1">
          {subtitle}
        </div>
      )}
    </div>
  )
}
