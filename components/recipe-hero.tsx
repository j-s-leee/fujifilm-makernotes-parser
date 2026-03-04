"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Bookmark } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

interface RecipeHeroProps {
  recipe: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    camera_model: string | null;
    lens_model: string | null;
    bookmark_count: number;
    like_count: number;
  };
  isBookmarked: boolean;
  isLiked: boolean;
  sharerName: string | null;
}

export function RecipeHero({
  recipe,
  isBookmarked: initialBookmarked,
  isLiked: initialLiked,
  sharerName,
}: RecipeHeroProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(recipe.like_count);
  const { user } = useUser();
  const { toast } = useToast();

  const thumbnailUrl = getThumbnailUrl(recipe.thumbnail_path);

  const toggleBookmark = async () => {
    if (!user) {
      toast({ description: "Sign in to bookmark recipes" });
      return;
    }

    const supabase = createClient();

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .match({ user_id: user.id, recipe_id: recipe.id });
      setIsBookmarked(false);
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, recipe_id: recipe.id });
      setIsBookmarked(true);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({ description: "Sign in to like recipes" });
      return;
    }

    const supabase = createClient();

    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .match({ user_id: user.id, recipe_id: recipe.id });
      setIsLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      await supabase
        .from("likes")
        .insert({ user_id: user.id, recipe_id: recipe.id });
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

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
          priority
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
            onClick={toggleLike}
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
            onClick={toggleBookmark}
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
