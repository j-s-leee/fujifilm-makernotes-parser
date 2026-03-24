import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-8 md:py-16">
      <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-4 h-10 w-full max-w-md rounded-lg" />
      </div>
    </div>
  );
}
