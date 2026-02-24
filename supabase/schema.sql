-- ============================================================
-- RECIPES TABLE
-- ============================================================
CREATE TABLE public.recipes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation  text,
  grain_roughness text,
  grain_size  text,
  color_chrome text,
  color_chrome_fx_blue text,
  wb_type     text,
  wb_color_temperature integer,
  wb_red      numeric,
  wb_blue     numeric,
  dynamic_range_setting text,
  dynamic_range_development integer,
  highlight   numeric,
  shadow      numeric,
  color       numeric,
  sharpness   numeric,
  noise_reduction numeric,
  clarity     numeric,
  bw_adjustment numeric,
  bw_magenta_green numeric,
  thumbnail_path text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE INDEX recipes_user_id_idx ON public.recipes (user_id);
CREATE INDEX recipes_simulation_idx ON public.recipes (simulation);
CREATE INDEX recipes_created_at_idx ON public.recipes (created_at DESC);

-- Anyone can read all recipes (public gallery)
CREATE POLICY "Recipes are publicly readable"
  ON public.recipes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can create recipes
CREATE POLICY "Users can create recipes"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can delete their own recipes
CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- FAVORITES TABLE
-- ============================================================
CREATE TABLE public.favorites (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX favorites_recipe_id_idx ON public.favorites (recipe_id);

-- Anyone can see favorite counts (for sorting)
CREATE POLICY "Favorites are publicly readable"
  ON public.favorites FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can add favorites
CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- STORAGE BUCKET for thumbnails
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Anyone can read thumbnails (public bucket)
CREATE POLICY "Thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "Users can upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================================
-- VIEW: Recipe with favorite count (for gallery sorting)
-- ============================================================
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
