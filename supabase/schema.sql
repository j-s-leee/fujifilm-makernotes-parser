-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_path  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

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
  camera_model text,
  lens_model text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE INDEX recipes_user_id_idx ON public.recipes (user_id);
CREATE INDEX recipes_simulation_idx ON public.recipes (simulation);
CREATE INDEX recipes_created_at_idx ON public.recipes (created_at DESC);
CREATE INDEX recipes_camera_model_idx ON public.recipes (camera_model);

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
-- BOOKMARKS TABLE
-- ============================================================
CREATE TABLE public.bookmarks (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX bookmarks_user_id_idx ON public.bookmarks (user_id);
CREATE INDEX bookmarks_recipe_id_idx ON public.bookmarks (recipe_id);

-- Anyone can see bookmark counts (for sorting)
CREATE POLICY "Bookmarks are publicly readable"
  ON public.bookmarks FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can add bookmarks
CREATE POLICY "Users can add bookmarks"
  ON public.bookmarks FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can remove their own bookmarks
CREATE POLICY "Users can remove their own bookmarks"
  ON public.bookmarks FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- LIKES TABLE
-- ============================================================
CREATE TABLE public.likes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX likes_user_id_idx ON public.likes (user_id);
CREATE INDEX likes_recipe_id_idx ON public.likes (recipe_id);

-- Anyone can see like counts
CREATE POLICY "Likes are publicly readable"
  ON public.likes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can add likes
CREATE POLICY "Users can add likes"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can remove their own likes"
  ON public.likes FOR DELETE
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
-- VIEW: Recipe with bookmark and like counts
-- ============================================================
DROP VIEW IF EXISTS public.recipes_with_stats;
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.*,
  COALESCE(b.cnt, 0) AS bookmark_count,
  COALESCE(l.cnt, 0) AS like_count
FROM public.recipes r
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS cnt
  FROM public.bookmarks
  GROUP BY recipe_id
) b ON b.recipe_id = r.id
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS cnt
  FROM public.likes
  GROUP BY recipe_id
) l ON l.recipe_id = r.id;
