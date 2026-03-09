import { Skeleton } from "@/components/ui/skeleton";

/* ─── GalleryCard ─── */
export function GalleryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md">
      {/* Mobile top bar */}
      <div className="flex items-center gap-2 p-2 sm:hidden">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      {/* Image placeholder */}
      <Skeleton className="aspect-[4/5] w-full rounded-none sm:rounded-md" />
      {/* Mobile bottom bar */}
      <div className="flex items-center gap-3 p-2 sm:hidden">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 w-6" />
        <Skeleton className="ml-auto h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}

/* ─── GalleryGrid ─── */
export function GalleryGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:block sm:columns-2 sm:gap-4 lg:columns-3 [&>*]:sm:mb-4 [&>*]:sm:break-inside-avoid">
      {Array.from({ length: count }).map((_, i) => (
        <GalleryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ─── RecipeHero ─── */
export function RecipeHeroSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Image */}
      <Skeleton className="aspect-square w-full rounded-xl" />
      {/* Metadata card */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        {/* Camera tags */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── UserProfileHeader ─── */
export function UserProfileHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
      <div className="flex flex-col gap-2 pt-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-48" />
      </div>
    </div>
  );
}

/* ─── RecipeFilters ─── */
export function RecipeFiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-20 rounded-md" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* ─── HistoryGrid ─── */
export function HistoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={i % 3 === 0 ? "aspect-square rounded-lg" : "aspect-[3/4] rounded-lg"}
        />
      ))}
    </div>
  );
}

/* ─── SimilarRecipes ─── */
export function SimilarRecipesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-4 sm:block sm:columns-2 sm:gap-4 [&>*]:sm:mb-4 [&>*]:sm:break-inside-avoid">
        {Array.from({ length: 4 }).map((_, i) => (
          <GalleryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
