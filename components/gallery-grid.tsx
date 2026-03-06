"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bookmark, Heart, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import {
  SENSOR_GENERATIONS,
  type SensorGeneration,
} from "@/fujifilm/cameras";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

const PAGE_SIZE = 24;

interface GalleryRecipe {
  id: number;
  simulation: string | null;
  thumbnail_path: string | null;
  blur_data_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  bookmark_count: number;
  like_count: number;
  camera_model: string | null;
  created_at: string | null;
}

interface GalleryGridProps {
  initialRecipes: GalleryRecipe[];
  simulation?: string;
  sort?: string;
  sensor?: string;
}

export function GalleryGrid({
  initialRecipes,
  simulation,
  sort,
  sensor,
}: GalleryGridProps) {
  const [recipes, setRecipes] = useState<GalleryRecipe[]>(initialRecipes);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialRecipes.length >= PAGE_SIZE);
  const cursorRef = useRef<GalleryRecipe | null>(
    initialRecipes.length > 0
      ? initialRecipes[initialRecipes.length - 1]
      : null,
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { bookmarks, likes, likeCounts, toggleBookmark, toggleLike, mergeLikeCounts } =
    useUserInteractions();

  // Reset when filters change
  useEffect(() => {
    setRecipes(initialRecipes);
    setHasMore(initialRecipes.length >= PAGE_SIZE);
    cursorRef.current =
      initialRecipes.length > 0
        ? initialRecipes[initialRecipes.length - 1]
        : null;
    mergeLikeCounts(initialRecipes);
  }, [initialRecipes, mergeLikeCounts]);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const cursor = cursorRef.current;
    if (!cursor) return;
    setLoading(true);

    const supabase = createClient();
    let query = supabase
      .from("recipes_with_stats")
      .select("*");

    if (simulation) {
      query = query.eq("simulation", simulation);
    }

    if (sensor && SENSOR_GENERATIONS.includes(sensor as SensorGeneration)) {
      query = query.eq("sensor_generation", sensor);
    }

    // Cursor-based pagination
    if (sort === "popular") {
      query = query
        .or(
          `like_count.lt.${cursor.like_count},and(like_count.eq.${cursor.like_count},id.lt.${cursor.id})`,
        )
        .order("like_count", { ascending: false })
        .order("id", { ascending: false });
    } else {
      query = query
        .or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    }

    query = query.limit(PAGE_SIZE);

    const { data } = await query;
    const newRecipes = (data ?? []) as GalleryRecipe[];

    if (newRecipes.length < PAGE_SIZE) {
      setHasMore(false);
    }

    if (newRecipes.length > 0) {
      cursorRef.current = newRecipes[newRecipes.length - 1];
    }

    setRecipes((prev) => [...prev, ...newRecipes]);
    mergeLikeCounts(newRecipes);
    setLoading(false);
  }, [loading, hasMore, simulation, sort, sensor, mergeLikeCounts]);

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

  return (
    <div>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {recipes.map((recipe) => {
          const url = getThumbnailUrl(recipe.thumbnail_path);
          return (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group relative block overflow-hidden rounded-lg bg-muted"
            >
              {url ? (
                <Image
                  src={url}
                  alt={recipe.simulation ?? "Recipe"}
                  width={recipe.thumbnail_width ?? 300}
                  height={recipe.thumbnail_height ?? 300}
                  className="w-full object-cover rounded-lg"
                  style={
                    recipe.thumbnail_width && recipe.thumbnail_height
                      ? { aspectRatio: `${recipe.thumbnail_width}/${recipe.thumbnail_height}` }
                      : { aspectRatio: "1/1" }
                  }
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  placeholder={recipe.blur_data_url ? "blur" : "empty"}
                  blurDataURL={recipe.blur_data_url ?? undefined}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}
              {/* Bottom left: simulation badge + like count */}
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
                      <span className="opacity-80">{recipe.camera_model}</span>
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
                    bookmarks.has(recipe.id)
                      ? "fill-white text-white"
                      : "text-white"
                  }`}
                />
              </button>
            </Link>
          );
        })}
      </div>
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
