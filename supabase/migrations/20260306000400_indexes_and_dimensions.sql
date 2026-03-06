-- ============================================================
-- Replace single-column sort indexes with composite indexes
-- (include id for stable cursor-based pagination)
-- ============================================================
DROP INDEX IF EXISTS public.recipes_created_at_idx;
DROP INDEX IF EXISTS public.recipes_like_count_idx;
DROP INDEX IF EXISTS public.recipes_user_id_idx;

CREATE INDEX recipes_created_at_id_idx ON public.recipes (created_at DESC, id DESC);
CREATE INDEX recipes_like_count_id_idx ON public.recipes (like_count DESC, id DESC);
CREATE INDEX recipes_user_created_at_id_idx ON public.recipes (user_id, created_at DESC, id DESC);

-- ============================================================
-- Add thumbnail dimension columns for masonry layout
-- ============================================================
ALTER TABLE public.recipes
  ADD COLUMN thumbnail_width  smallint,
  ADD COLUMN thumbnail_height smallint;

-- Notify PostgREST to reload schema cache so new columns are visible via API
NOTIFY pgrst, 'reload schema';
