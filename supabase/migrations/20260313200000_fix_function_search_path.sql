-- ============================================================
-- FIX: Set search_path on functions flagged by Supabase linter
-- Prevents search_path injection (security best practice)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trending_recipes(p_limit int DEFAULT 24)
RETURNS SETOF public.recipes_with_stats
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.recipes_with_stats
  WHERE thumbnail_path IS NOT NULL
  ORDER BY
    (like_count + bookmark_count * 2)
    / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.5)
    DESC,
    created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.match_recipes_by_image(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  query_histogram vector(48) DEFAULT NULL,
  filter_sensor_generation text DEFAULT NULL
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      r.id,
      r.image_embedding,
      r.color_histogram,
      r.camera_model_id
    FROM public.recipes r
    WHERE r.image_embedding IS NOT NULL
    ORDER BY r.image_embedding <=> query_embedding
    LIMIT match_count * 5
  )
  SELECT
    c.id,
    CASE
      WHEN query_histogram IS NOT NULL AND c.color_histogram IS NOT NULL THEN
        0.4 * (1 - (c.image_embedding <=> query_embedding))
        + 0.6 * (1 - (c.color_histogram <=> query_histogram))
      ELSE
        1 - (c.image_embedding <=> query_embedding)
    END::float AS similarity
  FROM candidates c
  LEFT JOIN public.camera_models cm ON cm.id = c.camera_model_id
  WHERE filter_sensor_generation IS NULL
     OR cm.sensor_generation = filter_sensor_generation
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
