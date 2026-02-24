import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userFavorites: number[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", user.id);
    userFavorites = favs?.map((f) => f.recipe_id) ?? [];
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Community-shared film recipes
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid
            recipes={recipes}
            userFavorites={userFavorites}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes shared yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
