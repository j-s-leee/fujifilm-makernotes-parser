import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getTextEmbedding } from "@/lib/embedding";
import { translateToEnglish } from "@/lib/translate";
import { GALLERY_SELECT } from "@/lib/queries";
import {
  normalizeQueryText,
  lookupTextQueryCache,
  insertTextQueryCache,
} from "@/lib/text-query-cache";
import { rateLimits, hashIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // 1. Auth check (optional — anonymous users allowed with rate limit)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Rate limit check
  if (user) {
    const rl = await rateLimits.textRecommend(user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  } else {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimits.anonTextRecommend(hashIp(ip));
    if (rl.limited) {
      return NextResponse.json(
        { error: "Daily limit reached. Sign in for more searches." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }

  // 3. Parse text input
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

  // 4. Check cache for translation + embedding
  // Use static client for public reads (cache lookup works with anon key)
  const publicClient = createStaticClient();
  const normalized = normalizeQueryText(text);
  const cached = await lookupTextQueryCache(publicClient, normalized);

  let embeddingText: string;
  let embedding: number[];

  if (cached) {
    embeddingText = cached.translated_text;
    embedding = cached.embedding;
  } else {
    embeddingText = await translateToEnglish(text);
    const generatedEmbedding = await getTextEmbedding(embeddingText);

    if (!generatedEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate text embedding. Please try again." },
        { status: 502 },
      );
    }

    embedding = generatedEmbedding;

    // Fire-and-forget cache insert (uses authenticated client if available)
    const cacheClient = user ? supabase : publicClient;
    insertTextQueryCache(cacheClient, normalized, embeddingText, embedding).catch(
      (err) => console.error("Cache insert failed:", err),
    );
  }

  // 5. Resolve sensor generation from camera model (if provided)
  let sensorGeneration: string | null = null;
  if (cameraModel) {
    const { data: cam } = await publicClient
      .from("camera_models")
      .select("sensor_generation")
      .eq("name", cameraModel)
      .single();
    sensorGeneration = cam?.sensor_generation ?? null;
  }

  // 6. Query pgvector for similar recipes
  const matchCountParam = request.nextUrl.searchParams.get("count");
  const matchCount = Math.min(
    Math.max(parseInt(matchCountParam ?? "10", 10) || 10, 1),
    50,
  );

  const { data: matches, error: matchError } = await publicClient.rpc(
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

  // 7. Fetch full recipe data for matched IDs
  let recipes: (Record<string, unknown> & { id: number })[] = [];
  if (matchedIds.length > 0) {
    const { data } = await publicClient
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .in("id", matchedIds);
    recipes = (data ?? []) as (Record<string, unknown> & { id: number })[];
  }

  const rankedRecipes = recipes
    .map((r) => ({
      ...r,
      similarity: similarityMap.get(r.id as number) ?? 0,
    }))
    .sort((a, b) => (b.similarity as number) - (a.similarity as number));

  // 8. Save recommendation to DB (authenticated users only)
  let recommendationId: number | null = null;
  if (user) {
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
      recommendationId = recommendation.id;
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
  }

  return NextResponse.json({
    recommendationId,
    queryText: text,
    recipes: rankedRecipes,
  });
}
