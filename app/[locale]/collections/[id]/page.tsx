import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CollectionHeader } from "@/components/collection-header";
import { GalleryGrid } from "@/components/gallery-grid";
import { GALLERY_SELECT } from "@/lib/queries";
import type { GalleryRecipe } from "@/components/gallery-card";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const collectionId = parseInt(id, 10);
  if (isNaN(collectionId)) return {};

  const supabase = createStaticClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("name, description, item_count")
    .eq("id", collectionId)
    .single();

  if (!collection) return {};

  const title = collection.name;
  const description =
    collection.description || `${collection.item_count ?? 0} recipes`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const collectionId = parseInt(id, 10);
  if (isNaN(collectionId)) notFound();

  const supabase = await createClient();

  // Fetch collection with owner profile info
  const { data: collection } = await supabase
    .from("collections")
    .select(`
      id, user_id, name, description, is_public, item_count, created_at, updated_at
    `)
    .eq("id", collectionId)
    .single();

  if (!collection) notFound();

  // Fetch owner profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", collection.user_id)
    .single();

  // Fetch collection items → recipe IDs, then fetch recipes
  const { data: items } = await supabase
    .from("collection_items")
    .select("recipe_id")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .limit(24);

  const recipeIds = (items ?? []).map((i) => i.recipe_id);

  let recipes: GalleryRecipe[] = [];
  if (recipeIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .in("id", recipeIds);
    // Sort by the order from collection_items (newest added first)
    const recipeMap = new Map((data ?? []).map((r) => [r.id, r]));
    recipes = recipeIds
      .map((id) => recipeMap.get(id))
      .filter(Boolean) as GalleryRecipe[];
  }

  const collectionWithProfile = {
    ...collection,
    user_display_name: profile?.display_name ?? null,
    user_username: profile?.username ?? null,
  };

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        <CollectionHeader collection={collectionWithProfile} />

        {recipes.length > 0 ? (
          <GalleryGrid
            initialRecipes={recipes}
            recipeIds={recipeIds}
          />
        ) : (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No recipes in this collection yet.
          </p>
        )}
      </div>
    </div>
  );
}
