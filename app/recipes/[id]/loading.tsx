import {
  RecipeHeroSkeleton,
  RecipeSettingsSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        {/* Back button placeholder */}
        <Skeleton className="h-5 w-32" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-8">
            <RecipeHeroSkeleton />
          </div>
          {/* Right column */}
          <div>
            <RecipeSettingsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
