import { Skeleton } from "@/components/ui/skeleton";

function TimelineCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-44 max-w-full" />
            <Skeleton className="h-3.5 w-60 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full shrink-0" />
      </div>

      <div className="px-5 pb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-gray-50/60 px-5 py-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Loading timeline"
    >
      {Array.from({ length: count }).map((_, index) => (
        <TimelineCardSkeleton key={index} />
      ))}
      <span className="sr-only">Loading timeline…</span>
    </div>
  );
}

export function EncounterPrereqsSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Loading encounter"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="rounded-lg border bg-white p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-52 max-w-full" />
            <Skeleton className="h-3.5 w-full max-w-sm" />
          </div>
        </div>
        <Skeleton className="h-10 w-44 rounded-md shrink-0" />
      </div>

      <TimelineSkeleton count={2} />
      <span className="sr-only">Loading encounter…</span>
    </div>
  );
}
