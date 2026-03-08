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
