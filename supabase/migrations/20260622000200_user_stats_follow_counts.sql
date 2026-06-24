-- ============================================================
-- get_user_stats: add follower_count, following_count
-- RETURNS TABLE 컬럼 목록이 바뀌므로 CREATE OR REPLACE 불가 → DROP 후 재생성
-- (이 동작은 Postgres의 제약이며, 데이터 손실이나 다운타임 없음)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_user_stats(uuid);

CREATE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(
  recipe_count     bigint,
  total_likes      bigint,
  total_bookmarks  bigint,
  follower_count   bigint,
  following_count  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(like_count), 0) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(bookmark_count), 0) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id),
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = p_user_id);
$$;
