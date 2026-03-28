import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getImageEmbedding } from "@/lib/embedding";
import { computeColorHistogram } from "@/lib/color-histogram";
import { rateLimits } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip rate limit for batch uploads (extra photos in multi-photo recipe)
  const skipRateLimit = request.nextUrl.searchParams.get("batch") === "1";

  if (!skipRateLimit) {
    const rl = await rateLimits.upload(user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${user.id}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload original
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const metadata = await sharp(buffer).metadata();
  const origWidth = metadata.width ?? 0;
  const baseName = key.replace(/\.[^.]+$/, "");

  // Generate and upload resized variants
  const variants = [
    { width: 64, minOrigWidth: 64 },
    { width: 480, minOrigWidth: 480 },
  ];
  const variantUploads = variants
    .filter((v) => origWidth > v.minOrigWidth)
    .map(async (v) => {
      const resized = await sharp(buffer)
        .resize(v.width, undefined, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: `${baseName}_w${v.width}.webp`,
          Body: resized,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    });
  await Promise.all(variantUploads);

  const blurBuffer = await sharp(buffer)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  // Generate CLIP embedding and color histogram in parallel
  // Skip embedding for batch uploads (extra photos) to avoid Replicate rate limits
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const imageUrl = r2PublicUrl ? `${r2PublicUrl}/${key}` : null;
  const [embedding, colorHistogram] = await Promise.all([
    !skipRateLimit && imageUrl ? getImageEmbedding(imageUrl) : Promise.resolve(null),
    computeColorHistogram(buffer),
  ]);

  return NextResponse.json({
    key,
    blurDataUrl,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    embedding,
    colorHistogram,
  });
}
