import { createClient } from "@/lib/supabase/server";
import { GroupedRecipeGrid } from "@/components/grouped-recipe-grid";
import { AuthPrompt } from "@/components/auth-prompt";
import type { GalleryRecipe } from "@/lib/group-recipes";

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Bookmarks"
        description="Sign in to view your bookmarked recipes."
      />
    );
  }

  const { data: bmarks } = await supabase
    .from("bookmarks")
    .select("recipe_id")
    .eq("user_id", user.id);
  const bookmarkIds = bmarks?.map((b) => b.recipe_id) ?? [];

  let typedRecipes: GalleryRecipe[] = [];
  if (bookmarkIds.length > 0) {
    const { data: recipes } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .in("id", bookmarkIds)
      .order("created_at", { ascending: false })
      .limit(24);
    typedRecipes = (recipes ?? []) as GalleryRecipe[];
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recipes you&apos;ve saved
          </p>
        </div>
        {typedRecipes.length > 0 ? (
          <GroupedRecipeGrid
            initialRecipes={typedRecipes}
            fetchConfig={{ type: "bookmarks", bookmarkIds }}
            basePath="/recipes"
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No bookmarks yet.
          </p>
        )}
      </div>
    </div>
  );
}
