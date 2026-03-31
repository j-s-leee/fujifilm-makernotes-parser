import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateOnRecipeChanged } from "@/lib/actions/revalidate";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const recipeId = Number(id);

  if (Number.isNaN(recipeId)) {
    return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recipes")
    .update({ deleted_at: null })
    .eq("id", recipeId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to restore recipe" },
      { status: 500 },
    );
  }

  // Fetch recipe metadata after restore for revalidation
  const { data: recipe } = await supabase
    .from("recipes_with_stats")
    .select("user_id, slug, simulation, camera_model, user_username")
    .eq("id", recipeId)
    .single();

  if (recipe) {
    revalidateOnRecipeChanged({
      recipeSlug: recipe.slug,
      recipeId,
      userId: recipe.user_id,
      userIdentifier: recipe.user_username ?? recipe.user_id,
      simulationSlug: recipe.simulation ?? null,
      cameraModel: recipe.camera_model ?? null,
      lensModel: null,
    });
  }

  return NextResponse.json({ success: true });
}
