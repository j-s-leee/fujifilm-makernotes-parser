import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getImageEmbedding } from "@/lib/embedding";

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate file
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

  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Generate blur placeholder
  const blurBuffer = await sharp(buffer)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  const metadata = await sharp(buffer).metadata();

  // 4. Upload to R2 at recommend/{userId}/{timestamp}.webp
  const key = `recommend/${user.id}/${Date.now()}.webp`;

  // Convert to WebP for consistent storage (image is already compressed on client)
  const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=604800", // 7 days (temporary)
    })
  );

  // 5. Generate CLIP embedding
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
  const imageUrl = `${r2PublicUrl}/${key}`;
  const embedding = await getImageEmbedding(imageUrl);

  if (!embedding) {
    return NextResponse.json(
      { error: "Failed to generate image embedding. Please try again." },
      { status: 502 }
    );
  }

  // 6. Query pgvector for similar recipes
  const matchCountParam = request.nextUrl.searchParams.get("count");
  const matchCount = Math.min(
    Math.max(parseInt(matchCountParam ?? "10", 10) || 10, 1),
    50
  );

  const { data: matches, error: matchError } = await supabase.rpc(
    "match_recipes_by_image",
    {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
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

  // 7. Fetch full recipe data for matched IDs
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

  // 8. Save recommendation + results to DB
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
    // Still return results even if history save fails
  } else {
    // Save individual results
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

  // 9. Return results
  return NextResponse.json({
    recommendationId: recommendation?.id ?? null,
    imagePath: key,
    blurDataUrl,
    imageWidth: metadata.width ?? null,
    imageHeight: metadata.height ?? null,
    recipes: rankedRecipes,
  });
}
