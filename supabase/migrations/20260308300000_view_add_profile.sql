-- Drop dependent function first
DROP FUNCTION IF EXISTS get_trending_recipes(int);

-- Recreate view with profile info
DROP VIEW IF EXISTS public.recipes_with_stats;
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.*,
  s.slug AS simulation,
  cm.name AS camera_model,
  cm.sensor_generation,
  l.name AS lens_model,
  w.slug AS wb_type,
  p.display_name AS user_display_name,
  p.username AS user_username,
  p.avatar_path AS user_avatar_path
FROM public.recipes r
LEFT JOIN public.simulations s ON s.id = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
LEFT JOIN public.wb_types w ON w.id = r.wb_type_id
LEFT JOIN public.profiles p ON p.id = r.user_id;

-- Recreate trending function with updated view
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
