/**
 * Backfill _w64.webp thumbnails for existing recipes.
 *
 * Downloads originals from R2, resizes to 64px wide, uploads as _w64.webp.
 * Skips recipes that already have a _w64 variant or have no thumbnail.
 *
 * Usage: npx tsx scripts/backfill-w64.ts
 *
 * Requires:
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: checks for existing _w64 before uploading.
 */

import { config } from "dotenv";
config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME!;

const BATCH_SIZE = 5;
const CONCURRENCY = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exists(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function processRecipe(recipe: {
  id: number;
  thumbnail_path: string;
  thumbnail_width: number;
}): Promise<"skipped" | "ok" | "failed"> {
  const path = recipe.thumbnail_path;
  if (path.startsWith("http")) return "skipped"; // legacy Supabase image

  const baseName = path.replace(/\.[^.]+$/, "");
  const w240Key = `${baseName}_w64.webp`;

  // Skip if already exists
  if (await exists(w240Key)) return "skipped";

  // Skip if original is ≤ 240px
  if (recipe.thumbnail_width && recipe.thumbnail_width <= 64) return "skipped";

  try {
    // Download original from R2 public URL
    const res = await fetch(`${R2_PUBLIC_URL}/${path}`);
    if (!res.ok) {
      console.error(`  Failed to download: ${res.status}`);
      return "failed";
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const resized = await sharp(buffer)
      .resize(64, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: w240Key,
        Body: resized,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return "ok";
  } catch (err) {
    console.error(`  Error:`, err);
    return "failed";
  }
}

async function main() {
  console.log("Fetching recipes with thumbnails...");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, thumbnail_path, thumbnail_width")
    .not("thumbnail_path", "is", null)
    .not("thumbnail_width", "is", null) // only R2 images (have width)
    .is("deleted_at", null)
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to fetch recipes:", error);
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to check.\n`);

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE);

    // Process batch with limited concurrency
    for (let j = 0; j < batch.length; j += CONCURRENCY) {
      const chunk = batch.slice(j, j + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (recipe) => {
          processed++;
          const label = `[${processed}/${recipes.length}] Recipe #${recipe.id}`;
          const result = await processRecipe(recipe);
          if (result === "ok") console.log(`${label} — created`);
          else if (result === "failed") console.log(`${label} — FAILED`);
          return result;
        }),
      );

      for (const r of results) {
        if (r === "ok") created++;
        else if (r === "skipped") skipped++;
        else failed++;
      }
    }
  }

  console.log(
    `\nDone! Total: ${processed}, Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`,
  );
}

main();
