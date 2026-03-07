/**
 * Backfill CLIP image embeddings for existing recipes.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or a service role key)
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *   HUGGINGFACE_API_KEY
 *
 * Idempotent: only processes recipes where image_embedding IS NULL.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY!;
const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/openai/clip-vit-base-patch32";

const BATCH_SIZE = 10;
const DELAY_MS = 2000; // 2s between batches to respect rate limits

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getEmbedding(imageUrl: string): Promise<number[] | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`  Failed to fetch image: ${imgRes.status}`);
      return null;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const res = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    if (!res.ok) {
      console.error(`  HF API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;

    if (embedding.length !== 512) {
      console.error(`  Unexpected dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (err) {
    console.error(`  Error:`, err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fetching recipes without embeddings...");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, thumbnail_path, thumbnail_width")
    .is("image_embedding", null)
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

    for (const recipe of batch) {
      processed++;
      const path = recipe.thumbnail_path;

      // Build image URL
      let imageUrl: string;
      if (path.startsWith("http")) {
        imageUrl = path;
      } else {
        imageUrl = `${R2_PUBLIC_URL}/${path}`;
      }

      console.log(`[${processed}/${recipes.length}] Recipe #${recipe.id}`);

      const embedding = await getEmbedding(imageUrl);
      if (!embedding) {
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("recipes")
        .update({ image_embedding: JSON.stringify(embedding) })
        .eq("id", recipe.id);

      if (updateError) {
        console.error(`  DB update failed:`, updateError);
        failed++;
      } else {
        succeeded++;
        console.log(`  OK`);
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < recipes.length) {
      console.log(`  Waiting ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `\nDone! Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`
  );
}

main();
