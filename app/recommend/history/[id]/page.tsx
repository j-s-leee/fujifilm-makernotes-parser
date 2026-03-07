import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { id } = await params;
  const recId = parseInt(id, 10);
  if (isNaN(recId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch recommendation
  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recId)
    .eq("user_id", user.id)
    .single();

  if (!recommendation) notFound();

  // Fetch results with recipe data
  const { data: results } = await supabase
    .from("recommendation_results")
    .select("recipe_id, similarity, rank")
    .eq("recommendation_id", recId)
    .order("rank", { ascending: true });

  const recipeIds = (results ?? []).map((r) => r.recipe_id);
  const similarityMap = new Map(
    (results ?? []).map((r) => [r.recipe_id, r.similarity])
  );

  let recipes: Record<string, unknown>[] = [];
  if (recipeIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .in("id", recipeIds);
    recipes = data ?? [];
  }

  // Sort by similarity (highest first) and attach scores
  const rankedRecipes = recipes
    .map((r) => ({
      ...(r as Record<string, unknown>),
      similarity: similarityMap.get(r.id as number) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity) as (Record<string, unknown> & { similarity: number })[];

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const uploadedImageSrc = r2Url
    ? `${r2Url}/${recommendation.image_path}`
    : recommendation.image_path;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <BackButton label="Back to History" fallbackHref="/recommend/history" />

        {/* Uploaded photo */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Photo
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src={uploadedImageSrc}
              alt="Uploaded photo"
              width={recommendation.image_width ?? 300}
              height={recommendation.image_height ?? 300}
              className="max-h-60 w-auto object-contain"
              placeholder={recommendation.blur_data_url ? "blur" : "empty"}
              blurDataURL={recommendation.blur_data_url ?? undefined}
            />
          </div>
        </div>

        {/* Results grid */}
        {rankedRecipes.length > 0 ? (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Matched Recipes ({rankedRecipes.length})
            </h2>
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {rankedRecipes.map((recipe) => {
                const src = (recipe.thumbnail_width as number | null)
                  ? (recipe.thumbnail_path as string | null)
                  : getThumbnailUrl(recipe.thumbnail_path as string | null);
                const similarityPercent = Math.round(recipe.similarity * 100);

                return (
                  <Link
                    key={recipe.id as number}
                    href={`/recipes/${recipe.id}`}
                    className="group relative block overflow-hidden rounded-lg bg-muted"
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={(recipe.simulation as string) ?? "Recipe"}
                        width={(recipe.thumbnail_width as number) ?? 300}
                        height={(recipe.thumbnail_height as number) ?? 300}
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
                        blurDataURL={
                          (recipe.blur_data_url as string) ?? undefined
                        }
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                        No image
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        {similarityPercent}% match
                      </span>
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        {(recipe.simulation as string) ?? "Unknown"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-10">
            No results found for this recommendation.
          </p>
        )}
      </div>
    </div>
  );
}
