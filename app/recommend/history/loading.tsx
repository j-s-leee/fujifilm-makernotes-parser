import { Skeleton } from "@/components/ui/skeleton";
import { HistoryGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <HistoryGridSkeleton />
      </div>
    </div>
  );
}
