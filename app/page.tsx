import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingGrid } from "@/components/trending-grid";

export const revalidate = 3600;

export default async function Home() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .rpc("get_trending_recipes", { p_limit: 24 });

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Trending Recipes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Most engaging recipes from the community
          </p>
        </div>

        {recipes && recipes.length > 0 ? (
          <>
            <TrendingGrid recipes={recipes} />
            <div className="flex justify-center pt-4">
              <Link
                href="/recipes?sort=popular"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all recipes &rarr;
              </Link>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes yet. Be the first to share a film recipe!
          </p>
        )}
      </div>
    </div>
  );
}
