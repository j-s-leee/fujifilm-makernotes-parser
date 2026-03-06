import Image from "next/image";
import Link from "next/link";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

interface SimilarRecipesProps {
  recipes: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    blur_data_url: string | null;
  }[];
}

export function SimilarRecipes({ recipes }: SimilarRecipesProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Similar Recipes
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {recipes.map((recipe) => {
          const url = getThumbnailUrl(recipe.thumbnail_path);
          return (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group relative overflow-hidden rounded-lg bg-muted"
            >
              {url ? (
                <Image
                  src={url}
                  alt={recipe.simulation ?? "Recipe"}
                  width={200}
                  height={200}
                  className="aspect-square w-full object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                  placeholder={recipe.blur_data_url ? "blur" : "empty"}
                  blurDataURL={recipe.blur_data_url ?? undefined}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
