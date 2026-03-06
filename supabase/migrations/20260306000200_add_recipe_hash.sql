-- pgcrypto 활성화 (digest 함수 사용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.recipes ADD COLUMN recipe_hash text;
CREATE INDEX recipes_recipe_hash_idx ON public.recipes (recipe_hash);

-- Backfill: JS와 동일한 로직 (concat_ws + sha256 + hex + left 16)
UPDATE public.recipes
SET recipe_hash = left(encode(digest(
  concat_ws('|',
    COALESCE(simulation, ''),
    COALESCE(grain_roughness, ''),
    COALESCE(grain_size, ''),
    COALESCE(CAST(highlight AS text), ''),
    COALESCE(CAST(shadow AS text), ''),
    COALESCE(CAST(color AS text), ''),
    COALESCE(CAST(sharpness AS text), ''),
    COALESCE(CAST(dynamic_range_development AS text), '')
  )::bytea, 'sha256'), 'hex'), 16);

-- Recreate view (r.* 이므로 recipe_hash 자동 포함)
DROP VIEW IF EXISTS public.recipes_with_stats;
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.*,
  COALESCE(b.cnt, 0) AS bookmark_count,
  COALESCE(l.cnt, 0) AS like_count
FROM public.recipes r
LEFT JOIN (SELECT recipe_id, COUNT(*) AS cnt FROM public.bookmarks GROUP BY recipe_id) b ON b.recipe_id = r.id
LEFT JOIN (SELECT recipe_id, COUNT(*) AS cnt FROM public.likes GROUP BY recipe_id) l ON l.recipe_id = r.id;
