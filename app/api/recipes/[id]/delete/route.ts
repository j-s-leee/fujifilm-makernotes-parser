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

  const { id } = await params;
  const recipeId = Number(id);

  if (Number.isNaN(recipeId)) {
    return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  // Verify ownership and fetch metadata for revalidation
  const { data: recipe, error: fetchError } = await supabase
    .from("recipes_with_stats")
    .select("user_id, slug, simulation, camera_model, user_username")
    .eq("id", recipeId)
    .single();

  if (fetchError || !recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  if (recipe.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete
  const { error: updateError } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", recipeId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }

  revalidateOnRecipeChanged({
    recipeSlug: recipe.slug,
    recipeId,
    userId: recipe.user_id,
    userIdentifier: recipe.user_username ?? recipe.user_id,
    simulationSlug: recipe.simulation ?? null,
    cameraModel: recipe.camera_model ?? null,
    lensModel: null,
  });

  return NextResponse.json({ success: true });
}
