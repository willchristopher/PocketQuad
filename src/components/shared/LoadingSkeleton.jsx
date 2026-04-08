'use client';
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { cn } from '@/lib/utils';
// Re-export standard skeleton for direct usage
export { Skeleton };
const skeletonTone = {
    baseColor: "hsl(var(--muted))",
    highlightColor: "hsl(var(--muted) / 0.55)",
};
export const SkeletonCard = ({ className, ...props }) => (<div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)} {...props}>
    <Skeleton className="mb-4 h-[120px] w-full rounded-lg" {...skeletonTone}/>
    <Skeleton className="mb-2 h-5 w-3/4 rounded-md" {...skeletonTone}/>
    <Skeleton className="mb-2 h-4 w-1/2 rounded-md" {...skeletonTone}/>
    <Skeleton className="h-4 w-1/3 rounded-md" {...skeletonTone}/>
  </div>);
export const SkeletonList = ({ count = 5, className }) => (<div className={cn("space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
    {Array(count).fill(0).map((_, i) => (<div key={i} className="flex items-center gap-4">
        <Skeleton circle width={40} height={40} {...skeletonTone}/>
        <div className="flex-1 space-y-2">
           <Skeleton width="40%" height={20} className="rounded-md" {...skeletonTone}/>
           <Skeleton width="80%" height={16} className="rounded-md" {...skeletonTone}/>
        </div>
      </div>))}
  </div>);
export const SkeletonText = ({ lines = 3, className }) => (<div className={cn("space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <Skeleton count={lines} className="rounded-md" {...skeletonTone}/>
  </div>);
