-- Add color histogram column to recipes
ALTER TABLE public.recipes ADD COLUMN color_histogram vector(48);

-- Recreate match function with histogram support
-- Weighted average: 0.4 × CLIP cosine + 0.6 × histogram cosine
-- Falls back to CLIP-only when query_histogram is NULL or recipe lacks histogram
CREATE OR REPLACE FUNCTION match_recipes_by_image(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  query_histogram vector(48) DEFAULT NULL
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    CASE
      WHEN query_histogram IS NOT NULL AND r.color_histogram IS NOT NULL THEN
        0.4 * (1 - (r.image_embedding <=> query_embedding))
        + 0.6 * (1 - (r.color_histogram <=> query_histogram))
      ELSE
        1 - (r.image_embedding <=> query_embedding)
    END AS similarity
  FROM recipes r
  WHERE r.image_embedding IS NOT NULL
  ORDER BY
    CASE
      WHEN query_histogram IS NOT NULL AND r.color_histogram IS NOT NULL THEN
        0.4 * (r.image_embedding <=> query_embedding)
        + 0.6 * (r.color_histogram <=> query_histogram)
      ELSE
        r.image_embedding <=> query_embedding
    END
  LIMIT match_count;
$$;
