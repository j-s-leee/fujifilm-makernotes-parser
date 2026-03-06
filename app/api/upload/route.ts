import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Generate and upload 480w thumbnail (original serves larger sizes)
  if (origWidth > 480) {
    const resized = await sharp(buffer)
      .resize(480, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${baseName}_w480.webp`,
        Body: resized,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  const blurBuffer = await sharp(buffer)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  return NextResponse.json({
    key,
    blurDataUrl,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  });
}
