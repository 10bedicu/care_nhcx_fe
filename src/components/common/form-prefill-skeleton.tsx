import { Skeleton } from "@/components/ui/skeleton";

export function FormPrefillSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading form data">
      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-24" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}
