"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Heart, Bookmark } from "lucide-react";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

interface RecipeHeroProps {
  recipe: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    blur_data_url: string | null;
    camera_model: string | null;
    lens_model: string | null;
    bookmark_count: number;
    like_count: number;
  };
  sharerName: string | null;
}

export function RecipeHero({
  recipe,
  sharerName,
}: RecipeHeroProps) {
  const { bookmarks, likes, likeCounts, toggleBookmark, toggleLike, mergeLikeCounts } =
    useUserInteractions();

  useEffect(() => {
    mergeLikeCounts([recipe]);
  }, [recipe, mergeLikeCounts]);

  const thumbnailUrl = getThumbnailUrl(recipe.thumbnail_path);
  const isBookmarked = bookmarks.has(recipe.id);
  const isLiked = likes.has(recipe.id);
  const likeCount = likeCounts.get(recipe.id) ?? recipe.like_count;

  return (
    <div className="flex flex-col gap-4">
      {/* Photo */}
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={recipe.simulation ?? "Recipe photo"}
          width={600}
          height={600}
          className="w-full rounded-lg object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={90}
          priority
          placeholder={recipe.blur_data_url ? "blur" : "empty"}
          blurDataURL={recipe.blur_data_url ?? undefined}
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          No image
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {recipe.simulation ?? "Unknown Simulation"}
          </h1>
          {sharerName && (
            <p className="text-sm text-muted-foreground">by {sharerName}</p>
          )}
          {(recipe.camera_model || recipe.lens_model) && (
            <p className="text-xs text-muted-foreground">
              {[recipe.camera_model, recipe.lens_model]
                .filter(Boolean)
                .join(" \u2022 ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleLike(recipe.id)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Heart
              className={`h-4 w-4 ${
                isLiked
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              }`}
            />
            <span className="text-muted-foreground">{likeCount}</span>
          </button>
          <button
            onClick={() => toggleBookmark(recipe.id)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Bookmark
              className={`h-4 w-4 ${
                isBookmarked
                  ? "fill-foreground text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
