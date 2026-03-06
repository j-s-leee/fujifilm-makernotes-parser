"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { Marquee } from "@/components/ui/marquee";
import Image from "next/image";
import Link from "next/link";

interface TopRecipe {
  id: number;
  thumbnail_path: string | null;
  simulation: string | null;
  like_count: number;
}

export function TopRecipesMarquee() {
  const [recipes, setRecipes] = useState<TopRecipe[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("recipes_with_stats")
        .select("id, thumbnail_path, simulation, like_count")
        .not("thumbnail_path", "is", null)
        .order("like_count", { ascending: false })
        .limit(10);

      if (data) setRecipes(data);
    }
    load();
  }, []);

  if (recipes.length === 0) return null;

  return (
    <Marquee reverse pauseOnHover className="[--duration:20s]">
      {recipes.map((recipe) => {
        const url = getThumbnailUrl(recipe.thumbnail_path);
        if (!url) return null;
        return (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="group relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg sm:h-40 sm:w-40"
          >
            <Image
              src={url}
              alt={recipe.simulation ?? "Recipe"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 160px, (max-width: 1024px) 200px, 250px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <p className="truncate text-xs font-medium text-white">
                {recipe.simulation ?? "Unknown"}
              </p>
            </div>
          </Link>
        );
      })}
    </Marquee>
  );
}
