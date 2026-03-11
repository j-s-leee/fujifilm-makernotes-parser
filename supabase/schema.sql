-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE public.weak_strong AS ENUM ('off', 'weak', 'strong');
CREATE TYPE public.grain_size_enum AS ENUM ('off', 'small', 'large');
CREATE TYPE public.dr_setting AS ENUM (
  'auto', 'manual', 'standard', 'wide-1', 'wide-2', 'film-simulation'
);

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username     text UNIQUE,
  avatar_path  text,
  is_admin     boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX profiles_username_idx ON public.profiles (username);

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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_path)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- REFERENCE TABLES
-- ============================================================

-- Simulations (film simulation modes)
CREATE TABLE public.simulations (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug text NOT NULL UNIQUE
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulations are public"
  ON public.simulations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Camera models with sensor generation
CREATE TABLE public.camera_models (
  id                smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name              text NOT NULL UNIQUE,
  sensor_generation text NOT NULL
);

ALTER TABLE public.camera_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "camera_models are public"
  ON public.camera_models FOR SELECT
  TO anon, authenticated
  USING (true);

-- Lenses (open-ended, insert-on-share)
CREATE TABLE public.lenses (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL UNIQUE
);

ALTER TABLE public.lenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lenses are public"
  ON public.lenses FOR SELECT
  TO anon, authenticated
  USING (true);

-- Lens upsert handled via resolve_lens_id() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.resolve_lens_id(lens_name text)
RETURNS smallint
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id smallint;
BEGIN
  SELECT id INTO result_id FROM lenses WHERE name = lens_name;
  IF NOT FOUND THEN
    INSERT INTO lenses (name) VALUES (lens_name)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
      SELECT id INTO result_id FROM lenses WHERE name = lens_name;
    END IF;
  END IF;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- White balance types
CREATE TABLE public.wb_types (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug text NOT NULL UNIQUE
);

ALTER TABLE public.wb_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wb_types are public"
  ON public.wb_types FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- RECIPES TABLE
-- ============================================================
CREATE TABLE public.recipes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id   smallint REFERENCES public.simulations(id),
  camera_model_id smallint REFERENCES public.camera_models(id),
  lens_id         smallint REFERENCES public.lenses(id),
  wb_type_id      smallint REFERENCES public.wb_types(id),
  grain_roughness public.weak_strong,
  grain_size  public.grain_size_enum,
  color_chrome public.weak_strong,
  color_chrome_fx_blue public.weak_strong,
  dynamic_range_setting public.dr_setting,
  wb_color_temperature integer,
  wb_red      numeric,
  wb_blue     numeric,
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
  blur_data_url text,
  recipe_hash text,
  thumbnail_width  smallint,
  thumbnail_height smallint,
  bookmark_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz DEFAULT NULL
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE INDEX recipes_simulation_id_idx ON public.recipes (simulation_id);
CREATE INDEX recipes_camera_model_id_idx ON public.recipes (camera_model_id);
CREATE INDEX recipes_lens_id_idx ON public.recipes (lens_id);
CREATE INDEX recipes_wb_type_id_idx ON public.recipes (wb_type_id);
CREATE INDEX recipes_recipe_hash_idx ON public.recipes (recipe_hash);
CREATE INDEX recipes_created_at_id_idx ON public.recipes (created_at DESC, id DESC);
CREATE INDEX recipes_like_count_id_idx ON public.recipes (like_count DESC, id DESC);
CREATE INDEX recipes_user_created_at_id_idx ON public.recipes (user_id, created_at DESC, id DESC);

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

-- Users can soft-delete their own recipes (UPDATE deleted_at)
CREATE POLICY "Users can soft-delete own recipes"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

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
-- TRIGGER FUNCTIONS: Maintain bookmark/like counters
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_bookmark_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes SET bookmark_count = bookmark_count + 1 WHERE id = NEW.recipe_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes SET bookmark_count = bookmark_count - 1 WHERE id = OLD.recipe_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes SET like_count = like_count + 1 WHERE id = NEW.recipe_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes SET like_count = like_count - 1 WHERE id = OLD.recipe_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_bookmark_count();

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_like_count();

-- ============================================================
-- VIEW: Recipe with stats and joined text values
-- ============================================================
DROP VIEW IF EXISTS public.recipes_with_stats;
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

-- ============================================================
-- PGVECTOR EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding and color histogram columns to recipes
ALTER TABLE public.recipes ADD COLUMN image_embedding vector(768);
ALTER TABLE public.recipes ADD COLUMN color_histogram vector(48);

-- HNSW index for cosine similarity search
CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING hnsw (image_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 100);

-- ============================================================
-- RECOMMENDATIONS TABLE
-- ============================================================
CREATE TABLE public.recommendations (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path   text,
  image_width  smallint,
  image_height smallint,
  blur_data_url text,
  query_text   text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE INDEX recommendations_user_created_idx
  ON public.recommendations (user_id, created_at DESC);

CREATE POLICY "Users can read own recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON public.recommendations FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- RECOMMENDATION_RESULTS TABLE
-- ============================================================
CREATE TABLE public.recommendation_results (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recommendation_id bigint NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  recipe_id         bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  similarity        float NOT NULL,
  rank              smallint NOT NULL
);

ALTER TABLE public.recommendation_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX recommendation_results_rec_idx
  ON public.recommendation_results (recommendation_id);

CREATE POLICY "Recommendation results follow parent access"
  ON public.recommendation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.id = recommendation_id
      AND r.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create recommendation results"
  ON public.recommendation_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.id = recommendation_id
      AND r.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================================
-- Two-phase search: HNSW ANN candidates → re-rank with histogram + sensor filter
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
-- TRENDING RECIPES FUNCTION
-- ============================================================
-- Time-decayed score: (likes + bookmarks×2) / (age_hours + 2)^1.5
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

CREATE POLICY "Users can read own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admins can read ALL reports
CREATE POLICY "Admins can read all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND is_admin = true
    )
  );

-- Admins can delete (dismiss) any report
CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND is_admin = true
    )
  );

-- Admins can update any recipe (restore soft-deleted)
CREATE POLICY "Admins can update any recipe"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND is_admin = true
    )
  );

-- ============================================================
-- AUTO-HIDE TRIGGER: soft-delete recipe after 3+ reports
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_hide_reported_recipe()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count int;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.reports
  WHERE recipe_id = NEW.recipe_id;

  IF report_count >= 3 THEN
    UPDATE public.recipes
    SET deleted_at = now()
    WHERE id = NEW.recipe_id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_hide_reported_recipe
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_recipe();

-- ============================================================
-- COLLECTIONS TABLE
-- ============================================================
CREATE TABLE public.collections (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT true,
  item_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX collections_user_id_idx ON public.collections (user_id);
CREATE INDEX collections_public_created_idx ON public.collections (created_at DESC) WHERE is_public = true;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public collections are readable"
  ON public.collections FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Users can read own collections"
  ON public.collections FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- COLLECTION_ITEMS TABLE
-- ============================================================
CREATE TABLE public.collection_items (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  collection_id bigint NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  recipe_id     bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (collection_id, recipe_id)
);

CREATE INDEX collection_items_collection_id_idx ON public.collection_items (collection_id);
CREATE INDEX collection_items_recipe_id_idx ON public.collection_items (recipe_id);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection items are readable for accessible collections"
  ON public.collection_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (c.is_public = true OR c.user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Collection owners can add items"
  ON public.collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Collection owners can remove items"
  ON public.collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- Trigger: Maintain collection item_count + updated_at
CREATE OR REPLACE FUNCTION public.update_collection_item_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections
    SET item_count = item_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections
    SET item_count = item_count - 1, updated_at = now()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_item_count
  AFTER INSERT OR DELETE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_collection_item_count();
