import { Skeleton } from "@/components/ui/skeleton";
import { HistoryGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        {/* Back button placeholder */}
        <Skeleton className="h-5 w-32" />

        {/* Query preview placeholder */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-60 rounded-lg" />
        </div>

        {/* Results grid */}
        <div>
          <Skeleton className="mb-4 h-3.5 w-36" />
          <HistoryGridSkeleton />
        </div>
      </div>
    </div>
  );
}
