import { Skeleton } from '@/components/ui/skeleton';

export default function KnowledgeLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Skeleton className="h-8 w-64" />
      {/* Content skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
