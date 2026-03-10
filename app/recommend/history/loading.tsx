import { Skeleton } from "@/components/ui/skeleton";
import { HistoryGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <HistoryGridSkeleton />
      </div>
    </div>
  );
}
