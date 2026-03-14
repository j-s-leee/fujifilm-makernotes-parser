import { SupabaseClient } from "@supabase/supabase-js";

/** Trim + lowercase for deterministic cache key */
export function normalizeQueryText(text: string): string {
  return text.trim().toLowerCase();
}

/** Look up cached translation + embedding. Returns null on miss. */
export async function lookupTextQueryCache(
  supabase: SupabaseClient,
  normalizedText: string,
): Promise<{ translated_text: string; embedding: number[] } | null> {
  const { data } = await supabase
    .from("text_query_cache")
    .select("translated_text, embedding")
    .eq("query_text_normalized", normalizedText)
    .single();

  if (!data) return null;

  return {
    translated_text: data.translated_text,
    embedding: data.embedding as unknown as number[],
  };
}

/** Insert cache entry. Ignores duplicate key conflicts (race-safe). */
export async function insertTextQueryCache(
  supabase: SupabaseClient,
  normalizedText: string,
  translatedText: string,
  embedding: number[],
): Promise<void> {
  await supabase.from("text_query_cache").upsert(
    {
      query_text_normalized: normalizedText,
      translated_text: translatedText,
      embedding: JSON.stringify(embedding),
    },
    { onConflict: "query_text_normalized", ignoreDuplicates: true },
  );
}
