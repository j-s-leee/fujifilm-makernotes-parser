/**
 * Backfill color histograms for existing recipes.
 *
 * Usage: npx tsx scripts/backfill-histograms.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (required for UPDATE — bypasses RLS)
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *
 * Idempotent: only processes recipes where color_histogram IS NULL.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const BATCH_SIZE = 20;
const BINS = 16;
const CHANNELS = 3;
const RESIZE = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function computeHistogram(imageBuffer: Buffer): Promise<number[]> {
  const { data } = await sharp(imageBuffer)
    .resize(RESIZE, RESIZE, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const histogram = new Float64Array(BINS * CHANNELS);
  const totalPixels = RESIZE * RESIZE;

  for (let i = 0; i < data.length; i += CHANNELS) {
    const rBin = (data[i] >> 4) & 0x0f;
    const gBin = (data[i + 1] >> 4) & 0x0f;
    const bBin = (data[i + 2] >> 4) & 0x0f;

    histogram[rBin]++;
    histogram[BINS + gBin]++;
    histogram[BINS * 2 + bBin]++;
  }

  for (let c = 0; c < CHANNELS; c++) {
    const offset = c * BINS;
    for (let b = 0; b < BINS; b++) {
      histogram[offset + b] /= totalPixels;
    }
  }

  return Array.from(histogram);
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  HTTP ${res.status} for ${url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`  Download error:`, err);
    return null;
  }
}

async function main() {
  console.log("Fetching recipes without color histograms...");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, thumbnail_path")
    .is("color_histogram", null)
    .not("thumbnail_path", "is", null)
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to fetch recipes:", error);
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to process.`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (recipe) => {
        const path = recipe.thumbnail_path;
        const imageUrl = path.startsWith("http")
          ? path
          : `${R2_PUBLIC_URL}/${path}`;

        const imageBuffer = await downloadImage(imageUrl);
        if (!imageBuffer) throw new Error("Download failed");

        const histogram = await computeHistogram(imageBuffer);

        const { error: updateError } = await supabase
          .from("recipes")
          .update({ color_histogram: JSON.stringify(histogram) })
          .eq("id", recipe.id);

        if (updateError) throw updateError;
        return recipe.id;
      })
    );

    for (let j = 0; j < results.length; j++) {
      processed++;
      const result = results[j];
      const recipeId = batch[j].id;

      if (result.status === "fulfilled") {
        succeeded++;
        console.log(`[${processed}/${recipes.length}] Recipe #${recipeId} OK`);
      } else {
        failed++;
        console.error(
          `[${processed}/${recipes.length}] Recipe #${recipeId} FAILED:`,
          result.reason
        );
      }
    }
  }

  console.log(
    `\nDone! Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`
  );
}

main();
