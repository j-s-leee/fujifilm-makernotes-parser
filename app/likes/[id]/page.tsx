import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (!recipe) notFound();

  const sharerName: string | null = null;

  let similarRecipes: typeof recipe[] = [];
  {
    let query = supabase
      .from("recipes_with_stats")
      .select("*")
      .neq("id", recipeId);

    if (recipe.simulation !== null) {
      query = query.eq("simulation", recipe.simulation);
    } else {
      query = query.is("simulation", null);
    }
    if (recipe.grain_roughness !== null) {
      query = query.eq("grain_roughness", recipe.grain_roughness);
    } else {
      query = query.is("grain_roughness", null);
    }
    if (recipe.grain_size !== null) {
      query = query.eq("grain_size", recipe.grain_size);
    } else {
      query = query.is("grain_size", null);
    }
    if (recipe.highlight !== null) {
      query = query.eq("highlight", recipe.highlight);
    } else {
      query = query.is("highlight", null);
    }
    if (recipe.shadow !== null) {
      query = query.eq("shadow", recipe.shadow);
    } else {
      query = query.is("shadow", null);
    }
    if (recipe.color !== null) {
      query = query.eq("color", recipe.color);
    } else {
      query = query.is("color", null);
    }
    if (recipe.sharpness !== null) {
      query = query.eq("sharpness", recipe.sharpness);
    } else {
      query = query.is("sharpness", null);
    }
    if (recipe.dynamic_range_development !== null) {
      query = query.eq("dynamic_range_development", recipe.dynamic_range_development);
    } else {
      query = query.is("dynamic_range_development", null);
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(12);
    similarRecipes = data ?? [];
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <BackButton label="Back to Likes" fallbackHref="/likes" />

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <RecipeHero
            recipe={recipe}
            sharerName={sharerName}
          />
          <RecipeSettings recipe={recipe} />
        </div>

        {similarRecipes.length > 0 && (
          <SimilarRecipes recipes={similarRecipes} />
        )}
      </div>
    </div>
  );
}
