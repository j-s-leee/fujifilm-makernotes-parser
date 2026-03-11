/**
 * Backfill CLIP image embeddings for existing recipes.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (required for UPDATE — bypasses RLS)
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *   REPLICATE_API_TOKEN
 *
 * Idempotent: only processes recipes where image_embedding IS NULL.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!;

const REPLICATE_MODEL =
  "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a" as const;

const BATCH_SIZE = 10;
const DELAY_MS = 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const replicate = new Replicate({ auth: REPLICATE_TOKEN });

async function getEmbedding(imageUrl: string): Promise<number[] | null> {
  try {
    const output = await replicate.run(REPLICATE_MODEL, {
      input: { inputs: imageUrl },
    });

    const results = output as { embedding: number[] }[];

    if (!results || results.length === 0 || !results[0].embedding) {
      console.error("  Unexpected Replicate output format");
      return null;
    }

    const embedding = results[0].embedding;

    if (embedding.length !== 768) {
      console.error(`  Unexpected dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (err) {
    console.error("  Error:", err);
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
        console.error("  DB update failed:", updateError);
        failed++;
      } else {
        succeeded++;
        console.log("  OK");
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < recipes.length) {
      console.log(`  Waiting ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `\nDone! Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`,
  );
}

main();
