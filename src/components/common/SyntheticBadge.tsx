import React from 'react'
import { Info } from 'lucide-react'

interface SyntheticBadgeProps {
  label?: string
  className?: string
}

export const SyntheticBadge: React.FC<SyntheticBadgeProps> = ({
  label = 'Synthetic demonstration data',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-normal tracking-wide text-slate-500 bg-slate-100 border border-slate-200/80 ${className}`}
      title="This record is generated for prototype demonstration purposes and does not represent an actual administrative record."
    >
      <Info size={11} className="text-slate-400" aria-hidden="true" />
      {label}
    </span>
  )
}
