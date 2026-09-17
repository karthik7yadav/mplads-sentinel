import React from 'react'

interface SkeletonProps {
  className?: string
  lines?: number
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({ className = 'h-24 w-full', lines = 1 }) => {
  if (lines > 1) {
    return (
      <div className="space-y-2.5 animate-pulse" role="status" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`bg-slate-200/80 rounded ${i === lines - 1 ? 'w-3/4 h-3' : 'w-full h-3'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`bg-slate-200/70 animate-pulse rounded-md ${className}`}
      role="status"
      aria-label="Loading content"
    />
  )
}
