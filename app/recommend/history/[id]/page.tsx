import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Search } from "lucide-react";
import Image from "next/image";
import { BackButton } from "@/components/back-button";
import { GalleryGrid } from "@/components/gallery-grid";
import type { GalleryRecipe } from "@/components/gallery-card";
import { GALLERY_SELECT } from "@/lib/queries";

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

  // Fetch recommendation and results in parallel
  const [{ data: recommendation }, { data: results }] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, image_path, image_width, image_height, blur_data_url, query_text")
      .eq("id", recId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("recommendation_results")
      .select("recipe_id, similarity, rank")
      .eq("recommendation_id", recId)
      .order("rank", { ascending: true }),
  ]);

  if (!recommendation) notFound();

  const recipeIds = (results ?? []).map((r) => r.recipe_id);

  let recipes: GalleryRecipe[] = [];
  if (recipeIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .in("id", recipeIds);

    // Preserve similarity ranking order
    const recipeMap = new Map(
      ((data ?? []) as GalleryRecipe[]).map((r) => [r.id, r]),
    );
    recipes = recipeIds
      .map((id) => recipeMap.get(id))
      .filter((r): r is GalleryRecipe => r !== undefined);
  }

  const isTextSearch = !recommendation.image_path && recommendation.query_text;

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <BackButton label="Back to History" fallbackHref="/recommend/history" />

        {/* Query preview */}
        {isTextSearch ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Search
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-foreground">
                &ldquo;{recommendation.query_text}&rdquo;
              </p>
            </div>
          </div>
        ) : recommendation.image_path ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Photo
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <Image
                src={recommendation.image_path}
                alt="Uploaded photo"
                width={recommendation.image_width ?? 300}
                height={recommendation.image_height ?? 300}
                className="max-h-60 w-auto object-contain"
                placeholder={recommendation.blur_data_url ? "blur" : "empty"}
                blurDataURL={recommendation.blur_data_url ?? undefined}
              />
            </div>
          </div>
        ) : null}

        {/* Results grid */}
        {recipes.length > 0 ? (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Matched Recipes ({recipes.length})
            </h2>
            <GalleryGrid initialRecipes={recipes} />
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
