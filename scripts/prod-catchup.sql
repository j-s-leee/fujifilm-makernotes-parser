-- ============================================================
-- PROD DB CATCHUP SCRIPT
-- 현재 상태: normalize(20260306000000) + blur_data_url(20260306000100) 적용 완료
-- 이 스크립트: 20260306000200 ~ 20260311000000 의 변경사항을 한번에 적용
-- ============================================================

-- ============================================================
-- FROM 20260306000200: recipe_hash
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.recipes ADD COLUMN recipe_hash text;
CREATE INDEX recipes_recipe_hash_idx ON public.recipes (recipe_hash);

-- Backfill (원본은 simulation 컬럼 참조 → 정규화된 스키마에 맞게 JOIN 사용)
UPDATE public.recipes r
SET recipe_hash = left(encode(digest(
  concat_ws('|',
    COALESCE(s.slug, ''),
    COALESCE(r.grain_roughness::text, ''),
    COALESCE(r.grain_size::text, ''),
    COALESCE(CAST(r.highlight AS text), ''),
    COALESCE(CAST(r.shadow AS text), ''),
    COALESCE(CAST(r.color AS text), ''),
    COALESCE(CAST(r.sharpness AS text), ''),
    COALESCE(CAST(r.dynamic_range_development AS text), '')
  )::bytea, 'sha256'), 'hex'), 16)
FROM public.simulations s
WHERE s.id = r.simulation_id;

-- ============================================================
-- FROM 20260306000300: trigger counts
-- ============================================================
ALTER TABLE public.recipes
  ADD COLUMN bookmark_count integer NOT NULL DEFAULT 0,
  ADD COLUMN like_count integer NOT NULL DEFAULT 0;

CREATE INDEX recipes_like_count_idx ON public.recipes (like_count DESC);

UPDATE public.recipes r
SET bookmark_count = (SELECT COUNT(*) FROM public.bookmarks b WHERE b.recipe_id = r.id);

UPDATE public.recipes r
SET like_count = (SELECT COUNT(*) FROM public.likes l WHERE l.recipe_id = r.id);

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

DROP POLICY IF EXISTS "Users can add lenses" ON public.lenses;

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

-- ============================================================
-- FROM 20260306000400: indexes and dimensions
-- ============================================================
DROP INDEX IF EXISTS public.recipes_created_at_idx;
DROP INDEX IF EXISTS public.recipes_like_count_idx;
DROP INDEX IF EXISTS public.recipes_user_id_idx;

CREATE INDEX recipes_created_at_id_idx ON public.recipes (created_at DESC, id DESC);
CREATE INDEX recipes_like_count_id_idx ON public.recipes (like_count DESC, id DESC);
CREATE INDEX recipes_user_created_at_id_idx ON public.recipes (user_id, created_at DESC, id DESC);

ALTER TABLE public.recipes
  ADD COLUMN thumbnail_width  smallint,
  ADD COLUMN thumbnail_height smallint;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- FROM 20260307000000: vector recommendation
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.recipes ADD COLUMN image_embedding vector(768);

CREATE TABLE public.recommendations (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path   text,
  image_width  smallint,
  image_height smallint,
  blur_data_url text,
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
-- FROM 20260308000000: color histogram
-- ============================================================
ALTER TABLE public.recipes ADD COLUMN color_histogram vector(48);

-- ============================================================
-- FROM 20260308200000: add username to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;
CREATE INDEX profiles_username_idx ON public.profiles (username);

-- ============================================================
-- FROM 20260308400000: auto-create profile
-- ============================================================
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
-- FROM 20260309100000: recommendations text search
-- ============================================================
ALTER TABLE public.recommendations ADD COLUMN query_text text;

-- ============================================================
-- FROM 20260310000000: soft delete and reports
-- ============================================================
ALTER TABLE public.recipes ADD COLUMN deleted_at timestamptz DEFAULT NULL;

CREATE INDEX recipes_deleted_at_idx
  ON public.recipes (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE POLICY "Users can soft-delete own recipes"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

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

-- ============================================================
-- FROM 20260310100000: auto hide and admin
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;

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
-- FROM 20260311000000: collections
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

-- ============================================================
-- FINAL VIEW + FUNCTIONS (최종 상태: 20260309300000 + 20260310000000 결합)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_trending_recipes(int);
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

-- HNSW index (replaces IVFFlat)
CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING hnsw (image_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 100);

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
-- REGISTER ALL MIGRATIONS IN HISTORY
-- ============================================================
INSERT INTO supabase_migrations.schema_migrations (version, statements)
VALUES
  ('20260306000000', '{}'),
  ('20260306000100', '{}'),
  ('20260306000200', '{}'),
  ('20260306000300', '{}'),
  ('20260306000400', '{}'),
  ('20260307000000', '{}'),
  ('20260308000000', '{}'),
  ('20260308100000', '{}'),
  ('20260308200000', '{}'),
  ('20260308300000', '{}'),
  ('20260308400000', '{}'),
  ('20260309100000', '{}'),
  ('20260309200000', '{}'),
  ('20260309300000', '{}'),
  ('20260310000000', '{}'),
  ('20260310100000', '{}'),
  ('20260311000000', '{}')
ON CONFLICT DO NOTHING;
