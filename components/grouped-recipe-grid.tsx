"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Bookmark, Heart, Layers, ChevronUp, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { groupRecipes } from "@/lib/group-recipes";
import type { GalleryRecipe } from "@/lib/group-recipes";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

const PAGE_SIZE = 24;

export type FetchConfig =
  | { type: "user"; userId: string }
  | { type: "bookmarks"; bookmarkIds: number[] }
  | { type: "likes"; likeIds: number[] };

interface GroupedRecipeGridProps {
  initialRecipes: GalleryRecipe[];
  fetchConfig: FetchConfig;
  basePath?: string;
}

export function GroupedRecipeGrid({
  initialRecipes,
  fetchConfig,
  basePath = "/recipes",
}: GroupedRecipeGridProps) {
  const [recipes, setRecipes] = useState<GalleryRecipe[]>(initialRecipes);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialRecipes.length >= PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { bookmarks, likes, likeCounts, toggleBookmark, toggleLike, mergeLikeCounts } =
    useUserInteractions();

  const groups = useMemo(() => groupRecipes(recipes), [recipes]);

  useEffect(() => {
    mergeLikeCounts(initialRecipes);
  }, [initialRecipes, mergeLikeCounts]);

  const toggleGroup = (groupIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIndex)) {
        next.delete(groupIndex);
      } else {
        next.add(groupIndex);
      }
      return next;
    });
  };

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const supabase = createClient();

    let query = supabase
      .from("recipes_with_stats")
      .select("*")
      .order("created_at", { ascending: false })
      .range(recipes.length, recipes.length + PAGE_SIZE - 1);

    if (fetchConfig.type === "user") {
      query = query.eq("user_id", fetchConfig.userId);
    } else if (fetchConfig.type === "bookmarks") {
      query = query.in("id", fetchConfig.bookmarkIds);
    } else {
      query = query.in("id", fetchConfig.likeIds);
    }

    const { data } = await query;
    const newRecipes = (data ?? []) as GalleryRecipe[];

    if (newRecipes.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setRecipes((prev) => [...prev, ...newRecipes]);
    mergeLikeCounts(newRecipes);
    setLoading(false);
  }, [loading, hasMore, recipes.length, fetchConfig, mergeLikeCounts]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  const renderCard = (
    recipe: GalleryRecipe,
    options?: {
      stackCount?: number;
      groupIndex?: number;
      showCollapse?: boolean;
      animated?: boolean;
      animationDelay?: number;
    },
  ) => {
    const url = getThumbnailUrl(recipe.thumbnail_path);
    return (
      <Link
        key={recipe.id}
        href={`${basePath}/${recipe.id}`}
        className={`group relative overflow-hidden rounded-lg bg-muted ${
          options?.animated
            ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300 fill-mode-both"
            : ""
        }`}
        style={
          options?.animated && options.animationDelay
            ? { animationDelay: `${options.animationDelay}ms` }
            : undefined
        }
      >
        {url ? (
          <Image
            src={url}
            alt={recipe.simulation ?? "Recipe"}
            width={300}
            height={300}
            className="aspect-square w-full object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        {/* Bottom left: like button + simulation badge */}
        <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
          <button
            onClick={(e) => toggleLike(recipe.id, e)}
            className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <Heart
              className={`h-3 w-3 ${
                likes.has(recipe.id)
                  ? "fill-red-500 text-red-500"
                  : "text-white"
              }`}
            />
            <span>{likeCounts.get(recipe.id) ?? recipe.like_count}</span>
          </button>
          <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {recipe.simulation ?? "Unknown"}
            {recipe.camera_model && (
              <>
                <span className="opacity-50">&middot;</span>
                <span className="opacity-80">{recipe.camera_model.replace(/^FUJIFILM\s*/i, "")}</span>
              </>
            )}
          </span>
        </div>
        {/* Top right: bookmark button */}
        <button
          onClick={(e) => toggleBookmark(recipe.id, e)}
          className="absolute right-2 top-2 rounded-md bg-black/30 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/50"
        >
          <Bookmark
            className={`h-4 w-4 ${
              bookmarks.has(recipe.id) ? "fill-white text-white" : "text-white"
            }`}
          />
        </button>
        {options?.stackCount && options.stackCount > 1 && (
          <button
            onClick={(e) => toggleGroup(options.groupIndex!, e)}
            className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <Layers className="h-3 w-3" />
            {options.stackCount}
          </button>
        )}
        {options?.showCollapse && (
          <button
            onClick={(e) => toggleGroup(options.groupIndex!, e)}
            className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <ChevronUp className="h-3 w-3" />
            Collapse
          </button>
        )}
      </Link>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {groups.map((group, groupIndex) => {
          const isExpanded = expandedGroups.has(groupIndex);

          if (!isExpanded) {
            return renderCard(group.primary, {
              stackCount: group.count,
              groupIndex,
            });
          }

          return group.recipes.map((recipe, recipeIndex) =>
            renderCard(recipe, {
              groupIndex,
              showCollapse: recipeIndex === 0,
              animated: true,
              animationDelay: recipeIndex * 50,
            }),
          );
        })}
      </div>
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
