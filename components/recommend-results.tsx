"use client";

import Image from "next/image";
import { GalleryGrid } from "@/components/gallery-grid";
import type { GalleryRecipe } from "@/components/gallery-card";

interface RecommendResultsProps {
  recipes: GalleryRecipe[];
  uploadedImageUrl: string | null;
  queryText?: string;
}

export function RecommendResults({
  recipes,
  uploadedImageUrl,
  queryText,
}: RecommendResultsProps) {
  if (recipes.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No similar recipes found. Try uploading a different photo or changing
        your search text.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Query preview */}
      {uploadedImageUrl ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Photo
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src={uploadedImageUrl}
              alt="Uploaded photo"
              width={300}
              height={300}
              className="max-h-60 w-auto object-contain"
              unoptimized
            />
          </div>
        </div>
      ) : queryText ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Search
          </p>
          <p className="text-sm text-foreground rounded-lg border border-border bg-muted/50 px-4 py-2">
            &ldquo;{queryText}&rdquo;
          </p>
        </div>
      ) : null}

      {/* Results grid */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Similar Recipes ({recipes.length})
        </h2>
        <GalleryGrid initialRecipes={recipes} />
      </div>
    </div>
  );
}
