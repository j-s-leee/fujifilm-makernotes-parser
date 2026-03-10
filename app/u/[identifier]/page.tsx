import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserProfileHeader } from "@/components/user-profile-header";
import { GalleryGrid } from "@/components/gallery-grid";
import { CollectionCard } from "@/components/collection-card";
import { GALLERY_SELECT } from "@/lib/queries";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

export const revalidate = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface UserProfilePageProps {
  params: Promise<{ identifier: string }>;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { identifier } = await params;
  const supabase = createStaticClient();
  const isUuid = UUID_REGEX.test(identifier);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_path")
    .eq(isUuid ? "id" : "username", identifier)
    .single();

  if (!profile) return {};

  const displayName = profile.display_name ?? profile.username ?? "User";
  const title = profile.username
    ? `${displayName} (@${profile.username})`
    : displayName;

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const image = profile.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : undefined;

  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  const description = `${count ?? 0} recipes shared on film-simulation.site`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { identifier } = await params;
  const supabase = createStaticClient();

  // UUID → lookup by id, otherwise → lookup by username
  const isUuid = UUID_REGEX.test(identifier);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_path, created_at")
    .eq(isUuid ? "id" : "username", identifier)
    .single();

  if (!profile) notFound();

  // Fetch stats, recipes, and public collections in parallel
  const [{ count: recipeCount }, { data: statsAgg }, { data: recipes }, { data: collections }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      supabase
        .from("recipes")
        .select("like_count, bookmark_count")
        .eq("user_id", profile.id),
      supabase
        .from("recipes_with_stats")
        .select(GALLERY_SELECT)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(24),
      supabase
        .from("collections")
        .select("id, name, description, is_public, item_count")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

  const totalLikes = (statsAgg ?? []).reduce(
    (sum, r) => sum + (r.like_count ?? 0),
    0,
  );
  const totalBookmarks = (statsAgg ?? []).reduce(
    (sum, r) => sum + (r.bookmark_count ?? 0),
    0,
  );

  // Resolve avatar URL
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const avatarUrl = profile.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : null;

  const typedRecipes = (recipes ?? []) as Parameters<typeof GalleryGrid>[0]["initialRecipes"];

  // Fetch cover images for collections (up to 4 per collection)
  const typedCollections = collections ?? [];
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
      // Group by collection, max 4 per collection
      const grouped = new Map<number, number[]>();
      for (const item of coverItems) {
        const list = grouped.get(item.collection_id) ?? [];
        if (list.length < 4) list.push(item.recipe_id);
        grouped.set(item.collection_id, list);
      }

      // Fetch thumbnail_path for those recipe IDs
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

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        <UserProfileHeader
          profile={{
            id: profile.id,
            displayName: profile.display_name,
            username: profile.username,
            avatarUrl,
          }}
          stats={{
            recipeCount: recipeCount ?? 0,
            totalLikes,
            totalBookmarks,
            joinedAt: profile.created_at,
          }}
        />

        {/* Collections */}
        {typedCollections.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Collections</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {typedCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={{
                    ...c,
                    user_display_name: profile.display_name,
                    user_username: profile.username,
                  }}
                  coverImages={collectionCovers.get(c.id) ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recipes */}
        {typedRecipes.length > 0 ? (
          <GalleryGrid
            initialRecipes={typedRecipes}
            userId={profile.id}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes shared yet.
          </p>
        )}
      </div>
    </div>
  );
}
