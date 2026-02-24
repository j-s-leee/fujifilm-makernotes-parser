"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GalleryRecipe {
  id: number;
  simulation: string | null;
  grain_roughness: string | null;
  grain_size: string | null;
  color_chrome: string | null;
  color_chrome_fx_blue: string | null;
  wb_type: string | null;
  wb_color_temperature: number | null;
  wb_red: number | null;
  wb_blue: number | null;
  dynamic_range_development: number | null;
  highlight: number | null;
  shadow: number | null;
  color: number | null;
  sharpness: number | null;
  noise_reduction: number | null;
  clarity: number | null;
  bw_adjustment: number | null;
  bw_magenta_green: number | null;
  thumbnail_path: string | null;
  favorite_count: number;
  created_at: string;
}

interface GalleryGridProps {
  recipes: GalleryRecipe[];
  userFavorites: number[];
  supabaseUrl: string;
}

export function GalleryGrid({ recipes, userFavorites, supabaseUrl }: GalleryGridProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<GalleryRecipe | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set(userFavorites));
  const { user } = useUser();
  const { toast } = useToast();

  const getThumbnailUrl = (path: string | null) => {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/thumbnails/${path}`;
  };

  const toggleFavorite = async (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ description: "Sign in to save favorites" });
      return;
    }

    const supabase = createClient();
    const isFav = favorites.has(recipeId);

    if (isFav) {
      await supabase.from("favorites").delete().match({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => { const next = new Set(prev); next.delete(recipeId); return next; });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => new Set(prev).add(recipeId));
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {recipes.map((recipe) => {
          const url = getThumbnailUrl(recipe.thumbnail_path);
          return (
            <div
              key={recipe.id}
              className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted"
              onClick={() => setSelectedRecipe(recipe)}
            >
              {url ? (
                <img
                  src={url}
                  alt={recipe.simulation ?? "Recipe"}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-sm font-semibold">{recipe.simulation ?? "Unknown"}</p>
              </div>
              <button
                onClick={(e) => toggleFavorite(recipe.id, e)}
                className="absolute right-2 top-2 rounded-full bg-black/30 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Heart
                  className={`h-4 w-4 ${favorites.has(recipe.id) ? "fill-white text-white" : "text-white"}`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        thumbnailUrl={selectedRecipe ? getThumbnailUrl(selectedRecipe.thumbnail_path) : null}
      />
    </>
  );
}
