-- ============================================================
-- SOFT DELETE: Add deleted_at column to recipes
-- ============================================================
ALTER TABLE public.recipes ADD COLUMN deleted_at timestamptz DEFAULT NULL;

CREATE INDEX recipes_deleted_at_idx
  ON public.recipes (deleted_at) WHERE deleted_at IS NOT NULL;

-- UPDATE policy so owners can soft-delete their own recipes
CREATE POLICY "Users can soft-delete own recipes"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================
-- Recreate recipes_with_stats VIEW with deleted_at filter
-- ============================================================
DROP VIEW IF EXISTS public.recipes_with_stats CASCADE;
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
LEFT JOIN public.profiles p       ON p.id  = r.user_id
WHERE r.deleted_at IS NULL;

-- Recreate get_trending_recipes (depends on the view)
CREATE OR REPLACE FUNCTION get_trending_recipes(p_limit int DEFAULT 24)
RETURNS SETOF recipes_with_stats
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM recipes_with_stats
  WHERE thumbnail_path IS NOT NULL
  ORDER BY
    (like_count + bookmark_count * 2)
    / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.5)
    DESC,
    created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- Update match_recipes_by_image to exclude soft-deleted recipes
-- ============================================================
CREATE OR REPLACE FUNCTION match_recipes_by_image(
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
      AND r.deleted_at IS NULL
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

-- ============================================================
-- REPORTS TABLE
-- ============================================================
CREATE TABLE public.reports (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  detail     text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX reports_recipe_id_idx ON public.reports (recipe_id);

-- Users can only read their own reports
CREATE POLICY "Users can read own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Authenticated users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
