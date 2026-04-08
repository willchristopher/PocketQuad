import { SkeletonCard, SkeletonList } from '@/components/shared/LoadingSkeleton';
export default function Loading() {
    return (<div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList count={4}/>
    </div>);
}
