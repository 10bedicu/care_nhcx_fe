import { Skeleton } from "@/components/ui/skeleton";

export function TimelineSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading timeline">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border bg-white p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EncounterPrereqsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading encounter">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <TimelineSkeleton count={2} />
    </div>
  );
}
