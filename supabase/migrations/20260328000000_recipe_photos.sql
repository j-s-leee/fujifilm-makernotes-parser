-- ============================================================
-- RECIPE_PHOTOS: Additional photos for multi-photo recipes
-- ============================================================
CREATE TABLE public.recipe_photos (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recipe_id       bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  blur_data_url   text,
  width           smallint,
  height          smallint,
  position        smallint NOT NULL,
  image_embedding vector(768),
  color_histogram vector(48),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX recipe_photos_recipe_id_idx ON public.recipe_photos (recipe_id);
CREATE INDEX recipe_photos_position_idx ON public.recipe_photos (recipe_id, position);

ALTER TABLE public.recipe_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
CREATE POLICY "Anyone can view recipe photos"
  ON public.recipe_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert photos for own recipes"
  ON public.recipe_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete photos from own recipes"
  ON public.recipe_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- UPDATE recipes_with_stats VIEW: Add photo_count column
-- ============================================================
CREATE OR REPLACE VIEW public.recipes_with_stats
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
  p.avatar_path  AS user_avatar_path,
  1 + (SELECT count(*) FROM public.recipe_photos rp WHERE rp.recipe_id = r.id)::int AS photo_count
FROM public.recipes r
LEFT JOIN public.simulations s   ON s.id  = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l         ON l.id  = r.lens_id
LEFT JOIN public.wb_types w       ON w.id  = r.wb_type_id
LEFT JOIN public.profiles p       ON p.id  = r.user_id
WHERE r.deleted_at IS NULL;
