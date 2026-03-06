import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RecipeHero } from "@/components/recipe-hero";
import { BackButton } from "@/components/back-button";
import { RecipeSettings } from "@/components/recipe-settings";
import { SimilarRecipes } from "@/components/similar-recipes";

export const revalidate = 60;

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) notFound();

  const supabase = createStaticClient();

  // Fetch recipe with stats
  const { data: recipe } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (!recipe) notFound();

  // Fetch sharer info - try email from user_id
  const sharerName: string | null = null;

  // Fetch similar recipes (same core settings via recipe_hash)
  let similarRecipes: typeof recipe[] = [];
  if (recipe.recipe_hash) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .eq("recipe_hash", recipe.recipe_hash)
      .neq("id", recipeId)
      .order("created_at", { ascending: false })
      .limit(12);
    similarRecipes = data ?? [];
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        {/* Back link */}
        <BackButton label="Back to Recipes" fallbackHref="/recipes" />

        {/* Hero: Photo + Meta on left, Settings on right */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <RecipeHero
            recipe={recipe}
            sharerName={sharerName}
          />
          <RecipeSettings recipe={recipe} />
        </div>

        {/* Similar recipes */}
        {similarRecipes.length > 0 && (
          <SimilarRecipes recipes={similarRecipes} />
        )}
      </div>
    </div>
  );
}
