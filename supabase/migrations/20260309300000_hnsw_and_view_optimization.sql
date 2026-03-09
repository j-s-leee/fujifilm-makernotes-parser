-- ============================================================
-- 1. Drop dependent function and view
-- ============================================================
DROP FUNCTION IF EXISTS public.get_trending_recipes(int);
DROP VIEW IF EXISTS public.recipes_with_stats;

-- ============================================================
-- 2. Recreate view WITHOUT heavy columns (image_embedding,
--    color_histogram) and redundant FK IDs
-- ============================================================
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.id,
  r.user_id,
  r.grain_roughness,
  r.grain_size,
  r.color_chrome,
  r.color_chrome_fx_blue,
  r.dynamic_range_setting,
  r.wb_color_temperature,
  r.wb_red,
  r.wb_blue,
  r.dynamic_range_development,
  r.highlight,
  r.shadow,
  r.color,
  r.sharpness,
  r.noise_reduction,
  r.clarity,
  r.bw_adjustment,
  r.bw_magenta_green,
  r.thumbnail_path,
  r.blur_data_url,
  r.recipe_hash,
  r.thumbnail_width,
  r.thumbnail_height,
  r.bookmark_count,
  r.like_count,
  r.created_at,
  s.slug        AS simulation,
  cm.name       AS camera_model,
  cm.sensor_generation,
  l.name        AS lens_model,
  w.slug        AS wb_type,
  p.display_name AS user_display_name,
  p.username     AS user_username,
  p.avatar_path  AS user_avatar_path
FROM public.recipes r
LEFT JOIN public.simulations s   ON s.id  = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l         ON l.id  = r.lens_id
LEFT JOIN public.wb_types w       ON w.id  = r.wb_type_id
LEFT JOIN public.profiles p       ON p.id  = r.user_id;

-- ============================================================
-- 3. Recreate get_trending_recipes without heavy columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_trending_recipes(p_limit int DEFAULT 24)
RETURNS SETOF public.recipes_with_stats
LANGUAGE sql STABLE
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

-- ============================================================
-- 4. Replace IVFFlat index with HNSW
-- ============================================================
DROP INDEX IF EXISTS public.recipes_image_embedding_idx;

CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING hnsw (image_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 100);

-- ============================================================
-- 5. Rewrite match_recipes_by_image with 2-phase search
--    Phase 1: ANN candidates via HNSW (index-accelerated)
--    Phase 2: Re-rank with histogram + sensor filter
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_recipes_by_image(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  query_histogram vector(48) DEFAULT NULL,
  filter_sensor_generation text DEFAULT NULL
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql STABLE
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
