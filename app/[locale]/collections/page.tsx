import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import { CollectionCard } from "@/components/collection-card";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { CollectionsPageActions } from "@/components/collections-page-actions";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Collections"
        description="Sign in to create and manage your recipe collections."
      />
    );
  }

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, description, is_public, item_count")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const typedCollections = collections ?? [];

  // Fetch cover images for each collection (up to 4 per collection)
  const collectionCovers: Map<number, string[]> = new Map();

  if (typedCollections.length > 0) {
    const collectionIds = typedCollections.map((c) => c.id);
    const { data: coverItems } = await supabase
      .from("collection_items")
      .select("collection_id, recipe_id")
      .in("collection_id", collectionIds)
      .order("created_at", { ascending: false })
      .limit(collectionIds.length * 4);

    if (coverItems && coverItems.length > 0) {
      const grouped = new Map<number, number[]>();
      for (const item of coverItems) {
        const list = grouped.get(item.collection_id) ?? [];
        if (list.length < 4) list.push(item.recipe_id);
        grouped.set(item.collection_id, list);
      }

      const allRecipeIds = [...new Set(coverItems.map((i) => i.recipe_id))];
      const { data: thumbs } = await supabase
        .from("recipes")
        .select("id, thumbnail_path, thumbnail_width")
        .in("id", allRecipeIds);

      const thumbMap = new Map(
        (thumbs ?? []).map((t) => [
          t.id,
          t.thumbnail_width
            ? t.thumbnail_path
            : getThumbnailUrl(t.thumbnail_path),
        ]),
      );

      for (const [cid, rids] of grouped) {
        collectionCovers.set(
          cid,
          rids.map((rid) => thumbMap.get(rid)).filter(Boolean) as string[],
        );
      }
    }
  }

  // Fetch user profile for display
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize your recipes into collections
            </p>
          </div>
          <CollectionsPageActions />
        </div>

        {typedCollections.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {typedCollections.map((c) => (
              <CollectionCard
                key={c.id}
                collection={{
                  ...c,
                  user_display_name: profile?.display_name ?? null,
                  user_username: profile?.username ?? null,
                }}
                coverImages={collectionCovers.get(c.id) ?? []}
              />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No collections yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
