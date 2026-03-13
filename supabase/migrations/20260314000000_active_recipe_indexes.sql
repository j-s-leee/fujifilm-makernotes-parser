-- ============================================================
-- PARTIAL INDEXES: Filter out soft-deleted recipes at index level
-- ============================================================
-- The recipes_with_stats VIEW filters WHERE r.deleted_at IS NULL,
-- but existing indexes scan all rows including deleted ones.
-- These partial indexes let Postgres skip deleted rows entirely.
-- ============================================================

-- Primary lookup by ID (recipe detail page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_active_id
  ON public.recipes (id)
  WHERE deleted_at IS NULL;

-- Gallery listing ordered by created_at (home page, user profiles)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_active_created
  ON public.recipes (created_at DESC)
  WHERE deleted_at IS NULL;

-- Similar recipes lookup by recipe_hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_active_hash
  ON public.recipes (recipe_hash, created_at DESC)
  WHERE deleted_at IS NULL;

-- User's recipes lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_active_user
  ON public.recipes (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
