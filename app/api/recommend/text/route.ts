import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTextEmbedding } from "@/lib/embedding";

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse text input
  const body = await request.json().catch(() => null);
  const text = body?.text?.trim();
  const cameraModel = (body?.cameraModel as string | undefined)?.trim() || null;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "No text provided" },
      { status: 400 },
    );
  }

  if (text.length > 500) {
    return NextResponse.json(
      { error: "Text too long. Maximum 500 characters." },
      { status: 400 },
    );
  }

  // 3. Generate CLIP text embedding
  const embedding = await getTextEmbedding(text);

  if (!embedding) {
    return NextResponse.json(
      { error: "Failed to generate text embedding. Please try again." },
      { status: 502 },
    );
  }

  // 4. Resolve sensor generation from camera model (if provided)
  let sensorGeneration: string | null = null;
  if (cameraModel) {
    const { data: cam } = await supabase
      .from("camera_models")
      .select("sensor_generation")
      .eq("name", cameraModel)
      .single();
    sensorGeneration = cam?.sensor_generation ?? null;
  }

  // 5. Query pgvector for similar recipes (CLIP-only, no color histogram)
  const matchCountParam = request.nextUrl.searchParams.get("count");
  const matchCount = Math.min(
    Math.max(parseInt(matchCountParam ?? "10", 10) || 10, 1),
    50,
  );

  const { data: matches, error: matchError } = await supabase.rpc(
    "match_recipes_by_image",
    {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      query_histogram: null,
      filter_sensor_generation: sensorGeneration,
    },
  );

  if (matchError) {
    console.error("Vector search error:", matchError);
    return NextResponse.json(
      { error: "Failed to search for similar recipes" },
      { status: 500 },
    );
  }

  const matchedIds = (matches ?? []).map((m: { id: number }) => m.id);
  const similarityMap = new Map(
    (matches ?? []).map((m: { id: number; similarity: number }) => [
      m.id,
      m.similarity,
    ]),
  );

  // 5. Fetch full recipe data for matched IDs
  let recipes: (Record<string, unknown> & { id: number })[] = [];
  if (matchedIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .in("id", matchedIds);
    recipes = (data ?? []) as (Record<string, unknown> & { id: number })[];
  }

  // Sort by similarity (highest first) and attach scores
  const rankedRecipes = recipes
    .map((r) => ({
      ...r,
      similarity: similarityMap.get(r.id as number) ?? 0,
    }))
    .sort((a, b) => (b.similarity as number) - (a.similarity as number));

  // 6. Save recommendation to DB
  const { data: recommendation, error: recError } = await supabase
    .from("recommendations")
    .insert({
      user_id: user.id,
      query_text: text,
    })
    .select("id")
    .single();

  if (recError || !recommendation) {
    console.error("Failed to save recommendation:", recError);
  } else {
    const resultRows = rankedRecipes.map((r, i) => ({
      recommendation_id: recommendation.id,
      recipe_id: r.id as number,
      similarity: r.similarity,
      rank: i + 1,
    }));

    if (resultRows.length > 0) {
      await supabase.from("recommendation_results").insert(resultRows);
    }
  }

  // 7. Return results
  return NextResponse.json({
    recommendationId: recommendation?.id ?? null,
    queryText: text,
    recipes: rankedRecipes,
  });
}
