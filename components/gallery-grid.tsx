"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { SENSOR_GENERATIONS, type SensorGeneration } from "@/fujifilm/cameras";
import { GalleryCard, type GalleryRecipe } from "@/components/gallery-card";

const PAGE_SIZE = 24;

interface GalleryGridProps {
  initialRecipes: GalleryRecipe[];
  simulation?: string;
  sort?: string;
  sensor?: string;
  camera?: string;
  userId?: string;
  recipeIds?: number[];
}

export function GalleryGrid({
  initialRecipes,
  simulation,
  sort,
  sensor,
  camera,
  userId,
  recipeIds,
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
  const { mergeLikeCounts } = useUserInteractions();

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
    let query = supabase.from("recipes_with_stats").select("*");

    if (simulation) {
      query = query.eq("simulation", simulation);
    }

    if (sensor && SENSOR_GENERATIONS.includes(sensor as SensorGeneration)) {
      query = query.eq("sensor_generation", sensor);
    }

    if (camera) {
      query = query.eq("camera_model", camera);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (recipeIds) {
      query = query.in("id", recipeIds);
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
  }, [
    loading,
    hasMore,
    simulation,
    sort,
    sensor,
    camera,
    userId,
    recipeIds,
    mergeLikeCounts,
  ]);

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
      <div className="flex flex-col gap-4 sm:block sm:columns-2 sm:gap-4 lg:columns-3 [&>*]:sm:mb-4 [&>*]:sm:break-inside-avoid">
        {recipes.map((recipe) => (
          <GalleryCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
