"use client";

import Image from "next/image";
import Link from "next/link";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import type { RecommendedRecipe } from "@/components/recommend-uploader";

interface RecommendResultsProps {
  recipes: RecommendedRecipe[];
  uploadedImageUrl: string;
}

export function RecommendResults({
  recipes,
  uploadedImageUrl,
}: RecommendResultsProps) {
  if (recipes.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No similar recipes found. Try uploading a different photo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Uploaded photo preview */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Photo
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <Image
            src={uploadedImageUrl}
            alt="Uploaded photo"
            width={300}
            height={300}
            className="max-h-60 w-auto object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Results grid */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Similar Recipes ({recipes.length})
        </h2>
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {recipes.map((recipe) => {
            const src = recipe.thumbnail_width
              ? recipe.thumbnail_path
              : getThumbnailUrl(recipe.thumbnail_path);
            const similarityPercent = Math.round(recipe.similarity * 100);

            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group relative block overflow-hidden rounded-lg bg-muted"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={recipe.simulation ?? "Recipe"}
                    width={recipe.thumbnail_width ?? 300}
                    height={recipe.thumbnail_height ?? 300}
                    className="w-full object-cover rounded-lg"
                    style={
                      recipe.thumbnail_width && recipe.thumbnail_height
                        ? {
                            aspectRatio: `${recipe.thumbnail_width}/${recipe.thumbnail_height}`,
                          }
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
                {/* Bottom badges */}
                <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                  <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {similarityPercent}% match
                  </span>
                  <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {recipe.simulation ?? "Unknown"}
                    {recipe.camera_model && (
                      <>
                        <span className="opacity-50"> · </span>
                        <span className="opacity-80">{recipe.camera_model}</span>
                      </>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
