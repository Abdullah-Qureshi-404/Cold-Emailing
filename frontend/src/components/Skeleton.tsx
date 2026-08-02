import React from 'react'

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />
)

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2 p-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
)

export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-20 w-full rounded-2xl" />
    ))}
  </div>
)
