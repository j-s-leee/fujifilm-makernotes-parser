import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserProfileHeader } from "@/components/user-profile-header";
import { GalleryGrid } from "@/components/gallery-grid";

export const revalidate = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface UserProfilePageProps {
  params: Promise<{ identifier: string }>;
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

  // Fetch stats: recipe count + total likes
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  const { data: likeAgg } = await supabase
    .from("recipes")
    .select("like_count")
    .eq("user_id", profile.id);

  const totalLikes = (likeAgg ?? []).reduce((sum, r) => sum + (r.like_count ?? 0), 0);

  // Resolve avatar URL
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const avatarUrl = profile.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : null;

  // Fetch user's recipes
  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(24);

  const typedRecipes = (recipes ?? []) as Parameters<typeof GalleryGrid>[0]["initialRecipes"];

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
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
            joinedAt: profile.created_at,
          }}
        />

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
