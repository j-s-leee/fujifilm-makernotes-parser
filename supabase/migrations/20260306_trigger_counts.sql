-- ============================================================
-- Migration: Replace subquery-based counts with trigger-maintained counters
-- ============================================================

-- 1) Add counter columns to recipes
ALTER TABLE public.recipes
  ADD COLUMN bookmark_count integer NOT NULL DEFAULT 0,
  ADD COLUMN like_count integer NOT NULL DEFAULT 0;

-- 2) Index for popularity sorting
CREATE INDEX recipes_like_count_idx ON public.recipes (like_count DESC);

-- 3) Backfill existing counts
UPDATE public.recipes r
SET bookmark_count = (SELECT COUNT(*) FROM public.bookmarks b WHERE b.recipe_id = r.id);

UPDATE public.recipes r
SET like_count = (SELECT COUNT(*) FROM public.likes l WHERE l.recipe_id = r.id);

-- 4) Trigger functions
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

-- 5) Attach triggers
CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_bookmark_count();

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_like_count();

-- 6) Replace lenses INSERT policy with SECURITY DEFINER function
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

-- 7) Recreate view — subqueries removed, counts come from r.*
DROP VIEW IF EXISTS public.recipes_with_stats;
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.*,
  s.slug AS simulation,
  cm.name AS camera_model,
  cm.sensor_generation,
  l.name AS lens_model,
  w.slug AS wb_type
FROM public.recipes r
LEFT JOIN public.simulations s ON s.id = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
LEFT JOIN public.wb_types w ON w.id = r.wb_type_id;
