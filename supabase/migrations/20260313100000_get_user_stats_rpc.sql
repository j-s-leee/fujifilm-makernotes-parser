-- ============================================================
-- RPC: get_user_stats
-- Returns recipe_count, total_likes, total_bookmarks in 1 row
-- instead of fetching all recipe rows and summing in JS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(recipe_count bigint, total_likes bigint, total_bookmarks bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COALESCE(SUM(like_count), 0),
    COALESCE(SUM(bookmark_count), 0)
  FROM public.recipes
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;
$$;
