import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";

const PURGE_AFTER_DAYS = 30;

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_AFTER_DAYS);

  // Find recipes soft-deleted more than 30 days ago
  const { data: recipes, error: fetchError } = await supabase
    .from("recipes")
    .select("id, thumbnail_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff.toISOString());

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch recipes", detail: fetchError.message },
      { status: 500 },
    );
  }

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ purged: 0 });
  }

  // Collect R2 keys to delete
  const r2Keys: { Key: string }[] = [];
  for (const recipe of recipes) {
    if (recipe.thumbnail_path) {
      r2Keys.push({ Key: recipe.thumbnail_path });
      // Also delete the _w480 thumbnail variant
      const baseName = recipe.thumbnail_path.replace(/\.[^.]+$/, "");
      r2Keys.push({ Key: `${baseName}_w480.webp` });
    }
  }

  // Delete R2 objects in batch (max 1000 per request)
  if (r2Keys.length > 0) {
    for (let i = 0; i < r2Keys.length; i += 1000) {
      const batch = r2Keys.slice(i, i + 1000);
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: batch, Quiet: true },
        }),
      );
    }
  }

  // Hard delete recipe rows (CASCADE handles bookmarks, likes, reports, recommendation_results)
  const recipeIds = recipes.map((r) => r.id);
  const { error: deleteError } = await supabase
    .from("recipes")
    .delete()
    .in("id", recipeIds);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete recipes", detail: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ purged: recipeIds.length });
}
