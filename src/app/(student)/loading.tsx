import { SkeletonCard, SkeletonList } from '@/components/shared/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList count={4} />
    </div>
  )
}
