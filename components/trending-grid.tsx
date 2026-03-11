"use client";

import { useEffect } from "react";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { GalleryCard, type GalleryRecipe } from "@/components/gallery-card";

interface TrendingGridProps {
  recipes: GalleryRecipe[];
}

export function TrendingGrid({ recipes }: TrendingGridProps) {
  const { mergeLikeCounts } = useUserInteractions();

  useEffect(() => {
    mergeLikeCounts(recipes);
  }, [recipes, mergeLikeCounts]);

  return (
    <div className="flex flex-col gap-4 sm:block sm:columns-2 sm:gap-4 lg:columns-3 [&>*]:sm:mb-4 [&>*]:sm:break-inside-avoid">
      {recipes.map((recipe) => (
        <GalleryCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
