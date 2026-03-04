-- Add camera_model and lens_model columns to recipes table
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS camera_model text;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS lens_model text;

-- Index for camera_model filtering
CREATE INDEX IF NOT EXISTS recipes_camera_model_idx ON public.recipes (camera_model);

-- Recreate view to include new columns (r.* already includes them, but refresh)
CREATE OR REPLACE VIEW public.recipes_with_stats AS
SELECT
  r.*,
  COALESCE(f.fav_count, 0) AS favorite_count
FROM public.recipes r
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS fav_count
  FROM public.favorites
  GROUP BY recipe_id
) f ON f.recipe_id = r.id;
