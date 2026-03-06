-- Add blur_data_url column for image blur placeholders
ALTER TABLE public.recipes ADD COLUMN blur_data_url text;

-- Recreate view to include new column (included via r.*)
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
  COALESCE(b.cnt, 0) AS bookmark_count,
  COALESCE(lk.cnt, 0) AS like_count
FROM public.recipes r
LEFT JOIN public.simulations s ON s.id = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
LEFT JOIN public.wb_types w ON w.id = r.wb_type_id
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS cnt
  FROM public.bookmarks
  GROUP BY recipe_id
) b ON b.recipe_id = r.id
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS cnt
  FROM public.likes
  GROUP BY recipe_id
) lk ON lk.recipe_id = r.id;
