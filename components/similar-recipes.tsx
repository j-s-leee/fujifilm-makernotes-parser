"use client";

import { useEffect } from "react";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { GalleryCard, type GalleryRecipe } from "@/components/gallery-card";

interface SimilarRecipesProps {
  recipes: GalleryRecipe[];
}

export function SimilarRecipes({ recipes }: SimilarRecipesProps) {
  const { mergeLikeCounts } = useUserInteractions();

  useEffect(() => {
    mergeLikeCounts(recipes);
  }, [recipes, mergeLikeCounts]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Similar Recipes
      </h2>
      <div className="flex flex-col gap-4 sm:block sm:columns-2 sm:gap-4 [&>*]:sm:mb-4 [&>*]:sm:break-inside-avoid">
        {recipes.map((recipe) => (
          <GalleryCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
