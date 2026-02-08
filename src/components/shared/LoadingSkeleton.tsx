'use client'

import React from 'react'
import Skeleton, { SkeletonProps } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { cn } from '@/lib/utils'

// Re-export standard skeleton for direct usage
export { Skeleton }

export const SkeletonCard = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)} {...props}>
    <Skeleton className="mb-4 h-[120px] w-full rounded-lg" />
    <Skeleton className="mb-2 h-5 w-3/4" />
    <Skeleton className="mb-2 h-4 w-1/2" />
    <Skeleton className="h-4 w-1/3" />
  </div>
)

export const SkeletonList = ({ count = 5, className }: { count?: number, className?: string }) => (
  <div className={cn("space-y-4", className)}>
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton circle width={40} height={40} />
        <div className="flex-1 space-y-1">
           <Skeleton width="40%" height={20} />
           <Skeleton width="80%" height={16} />
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonText = ({ lines = 3, className }: { lines?: number, className?: string }) => (
  <div className={cn("space-y-2", className)}>
      <Skeleton count={lines} />
  </div>
)
