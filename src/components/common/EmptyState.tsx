import React from 'react'
import { CheckCircle, FolderSearch, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  variant?: 'neutral' | 'success' | 'info'
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: CustomIcon,
  actionLabel,
  onAction,
  variant = 'neutral',
  className = '',
}) => {
  const Icon = CustomIcon || (variant === 'success' ? CheckCircle : FolderSearch)

  const iconColor = {
    neutral: 'text-slate-400 bg-slate-100 border-slate-200',
    success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  }[variant]

  return (
    <div
      className={`rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center flex flex-col items-center justify-center min-h-[220px] ${className}`}
    >
      <div className={`p-3 rounded-full border mb-3 ${iconColor}`}>
        <Icon size={24} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 max-w-md leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
