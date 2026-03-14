import { Skeleton } from "@/components/ui/skeleton";
import {
  RecipeFiltersSkeleton,
  GalleryGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-28" />
        <RecipeFiltersSkeleton />
        <GalleryGridSkeleton />
      </div>
    </div>
  );
}
