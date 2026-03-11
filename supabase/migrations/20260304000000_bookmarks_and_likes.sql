-- ============================================================
-- RENAME favorites → bookmarks
-- ============================================================
ALTER TABLE public.favorites RENAME TO bookmarks;
ALTER INDEX favorites_user_id_idx RENAME TO bookmarks_user_id_idx;
ALTER INDEX favorites_recipe_id_idx RENAME TO bookmarks_recipe_id_idx;

-- Rename RLS policies
ALTER POLICY "Favorites are publicly readable" ON public.bookmarks RENAME TO "Bookmarks are publicly readable";
ALTER POLICY "Users can add favorites" ON public.bookmarks RENAME TO "Users can add bookmarks";
ALTER POLICY "Users can remove their own favorites" ON public.bookmarks RENAME TO "Users can remove their own bookmarks";

-- ============================================================
-- CREATE likes TABLE
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

CREATE POLICY "Likes are publicly readable"
  ON public.likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can add likes"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove their own likes"
  ON public.likes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- RECREATE VIEW: recipes_with_stats
-- DROP required because CREATE OR REPLACE cannot change column names/count
-- (old view had favorite_count, new view has bookmark_count + like_count)
-- ============================================================
DROP VIEW IF EXISTS public.recipes_with_stats;
CREATE VIEW public.recipes_with_stats AS
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
