import {
  RecipeHeroSkeleton,
  GalleryGridSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        {/* Back button placeholder */}
        <Skeleton className="h-5 w-32" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column: Hero (sticky) */}
          <div className="md:sticky md:top-24 md:self-start">
            <RecipeHeroSkeleton />
          </div>
          {/* Right column: Similar Recipes */}
          <div>
            <GalleryGridSkeleton count={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
