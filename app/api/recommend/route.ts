import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getImageEmbedding } from "@/lib/embedding";
import { computeColorHistogram } from "@/lib/color-histogram";
import { GALLERY_SELECT } from "@/lib/queries";
import { rateLimits, hashIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // 1. Auth check (optional — anonymous users allowed with rate limit)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Rate limit check
  if (user) {
    const rl = await rateLimits.imageRecommend(user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  } else {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimits.anonImageRecommend(hashIp(ip));
    if (rl.limited) {
      return NextResponse.json(
        { error: "Daily limit reached. Sign in for more searches." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }

  // 3. Validate file
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  const cameraModel = (formData.get("cameraModel") as string | null)?.trim() || null;

  const buffer = Buffer.from(await file.arrayBuffer());

  // 4. Generate blur placeholder
  const blurBuffer = await sharp(buffer)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  const metadata = await sharp(buffer).metadata();

  // 5. Upload to R2
  const uploadId = user?.id ?? "anon";
  const key = `recommend/${uploadId}/${Date.now()}.webp`;

  const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=604800",
    })
  );

  // 6. Generate CLIP embedding and color histogram in parallel
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
  const imageUrl = `${r2PublicUrl}/${key}`;
  const [embedding, colorHistogram] = await Promise.all([
    getImageEmbedding(imageUrl),
    computeColorHistogram(buffer),
  ]);

  if (!embedding) {
    return NextResponse.json(
      { error: "Failed to generate image embedding. Please try again." },
      { status: 502 }
    );
  }

  // 7. Resolve sensor generation from camera model (if provided)
  // Use static client for public reads (works for both auth and anon)
  const publicClient = createStaticClient();
  let sensorGeneration: string | null = null;
  if (cameraModel) {
    const { data: cam } = await publicClient
      .from("camera_models")
      .select("sensor_generation")
      .eq("name", cameraModel)
      .single();
    sensorGeneration = cam?.sensor_generation ?? null;
  }

  // 8. Query pgvector for similar recipes
  const matchCountParam = request.nextUrl.searchParams.get("count");
  const matchCount = Math.min(
    Math.max(parseInt(matchCountParam ?? "10", 10) || 10, 1),
    50
  );

  const { data: matches, error: matchError } = await publicClient.rpc(
    "match_recipes_by_image",
    {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      query_histogram: JSON.stringify(colorHistogram),
      filter_sensor_generation: sensorGeneration,
    }
  );

  if (matchError) {
    console.error("Vector search error:", matchError);
    return NextResponse.json(
      { error: "Failed to search for similar recipes" },
      { status: 500 }
    );
  }

  const matchedIds = (matches ?? []).map((m: { id: number }) => m.id);
  const similarityMap = new Map(
    (matches ?? []).map((m: { id: number; similarity: number }) => [
      m.id,
      m.similarity,
    ])
  );

  // 9. Fetch full recipe data for matched IDs
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

  // 10. Save recommendation to DB (authenticated users only)
  let recommendationId: number | null = null;
  if (user) {
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .insert({
        user_id: user.id,
        image_path: key,
        image_width: (metadata.width ?? null) as number | null,
        image_height: (metadata.height ?? null) as number | null,
        blur_data_url: blurDataUrl,
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
    imagePath: key,
    blurDataUrl,
    imageWidth: metadata.width ?? null,
    imageHeight: metadata.height ?? null,
    recipes: rankedRecipes,
  });
}
