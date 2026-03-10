import { Suspense } from "react";
import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RecipeHero } from "@/components/recipe-hero";
import { BackButton } from "@/components/back-button";
import { SimilarRecipes } from "@/components/similar-recipes";
import { SimilarRecipesSkeleton } from "@/components/skeletons";
import { RECIPE_DETAIL_SELECT, GALLERY_SELECT } from "@/lib/queries";

export const revalidate = 60;

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

async function SimilarRecipesSection({
  recipeId,
  recipeHash,
}: {
  recipeId: number;
  recipeHash: string | null;
}) {
  if (!recipeHash) {
    return (
      <p className="text-center text-sm text-muted-foreground py-20">
        No similar recipes found.
      </p>
    );
  }

  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipes_with_stats")
    .select(GALLERY_SELECT)
    .eq("recipe_hash", recipeHash)
    .neq("id", recipeId)
    .order("created_at", { ascending: false })
    .limit(12);

  const similarRecipes = data ?? [];

  if (similarRecipes.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-20">
        No similar recipes found.
      </p>
    );
  }

  return <SimilarRecipes recipes={similarRecipes} />;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) notFound();

  const supabase = createStaticClient();

  // Fetch recipe with stats (view already JOINs profiles)
  const { data: recipe } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_DETAIL_SELECT)
    .eq("id", recipeId)
    .single();

  if (!recipe) {
    // Check if recipe exists but is soft-deleted
    const { data: deleted } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .not("deleted_at", "is", null)
      .single();

    if (deleted) {
      return (
        <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
          <div className="flex w-full max-w-6xl flex-col items-center gap-4 py-20">
            <p className="text-lg font-medium">이 레시피는 삭제되었습니다</p>
            <p className="text-sm text-muted-foreground">
              해당 레시피는 소유자에 의해 삭제되었거나 신고로 인해 숨김 처리되었습니다.
            </p>
            <BackButton label="Back to Recipes" fallbackHref="/recipes" />
          </div>
        </div>
      );
    }

    notFound();
  }

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const sharer = recipe.user_display_name
    ? {
        userId: recipe.user_id as string,
        displayName: (recipe.user_display_name as string) ?? "Anonymous",
        username: recipe.user_username as string | null,
        avatarUrl: recipe.user_avatar_path
          ? `${r2PublicUrl}/${recipe.user_avatar_path}`
          : null,
      }
    : null;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        {/* Back link */}
        <BackButton label="Back to Recipes" fallbackHref="/recipes" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column: Hero (sticky on desktop) */}
          <div className="md:sticky md:top-24 md:self-start">
            <RecipeHero recipe={recipe} settingsRecipe={recipe} sharer={sharer} />
          </div>

          {/* Right column: Similar Recipes */}
          <div>
            <Suspense fallback={<SimilarRecipesSkeleton />}>
              <SimilarRecipesSection
                recipeId={recipeId}
                recipeHash={recipe.recipe_hash}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
