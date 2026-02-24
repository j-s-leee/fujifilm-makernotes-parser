import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";

interface GalleryPageProps {
  searchParams: Promise<{ simulation?: string; sort?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recipes_with_stats")
    .select("*")
    .limit(100);

  if (params.simulation) {
    query = query.eq("simulation", params.simulation);
  }

  if (params.sort === "popular") {
    query = query.order("favorite_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: recipes } = await query;

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

  // Get unique simulations for filter
  const { data: allRecipes } = await supabase.from("recipes").select("simulation");
  const simulations = [...new Set(allRecipes?.map((r) => r.simulation).filter(Boolean) as string[])].sort();

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Community-shared film recipes
            </p>
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <a
            href="/gallery"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !params.simulation ? "bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </a>
          {simulations.map((sim) => (
            <a
              key={sim}
              href={`/gallery?simulation=${sim}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                params.simulation === sim ? "bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {sim}
            </a>
          ))}
        </div>
        {/* Sort toggle */}
        <div className="flex gap-2">
          <a
            href={`/gallery${params.simulation ? `?simulation=${params.simulation}` : ""}`}
            className={`text-xs font-medium ${params.sort !== "popular" ? "text-foreground underline" : "text-muted-foreground"}`}
          >
            Newest
          </a>
          <a
            href={`/gallery?sort=popular${params.simulation ? `&simulation=${params.simulation}` : ""}`}
            className={`text-xs font-medium ${params.sort === "popular" ? "text-foreground underline" : "text-muted-foreground"}`}
          >
            Popular
          </a>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid
            recipes={recipes}
            userFavorites={userFavorites}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found. Try a different filter or be the first to share!
          </p>
        )}
      </div>
    </div>
  );
}
