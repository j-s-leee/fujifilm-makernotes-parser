-- ============================================================
-- RECIPE SLUGS: Add slug column for SEO-friendly URLs
-- Pattern: /recipes/{slug}-{id} e.g. /recipes/classic-chrome-x-t5-xf35mmf1-4-r-123
-- ============================================================

-- 1. Add slug column (nullable first for safe backfill)
ALTER TABLE public.recipes ADD COLUMN slug text;

-- 2. Backfill slugs from joined reference tables
UPDATE public.recipes r
SET slug = LOWER(TRIM(BOTH '-' FROM
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      CONCAT_WS('-',
        COALESCE(s.slug, ''),
        COALESCE(REGEXP_REPLACE(cm.name, '[^a-zA-Z0-9]+', '-', 'g'), ''),
        COALESCE(REGEXP_REPLACE(l.name, '[^a-zA-Z0-9]+', '-', 'g'), '')
      ),
      '-{2,}', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
))
FROM public.simulations s
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
WHERE s.id = r.simulation_id;

-- 3. Handle recipes with no simulation (fallback slug)
UPDATE public.recipes
SET slug = 'recipe'
WHERE slug IS NULL OR slug = '';

-- 4. Add NOT NULL constraint and default after backfill
ALTER TABLE public.recipes ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN slug SET DEFAULT 'recipe';

-- 5. Recreate recipes_with_stats view with slug column
-- NOTE: DROP CASCADE required because inserting r.slug in the middle of
-- the column list changes column order, which CREATE OR REPLACE disallows.
-- CASCADE drops the dependent get_trending_recipes function, recreated below.
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
  r.slug,
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

-- 6. Recreate get_trending_recipes (dropped by CASCADE above)
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
