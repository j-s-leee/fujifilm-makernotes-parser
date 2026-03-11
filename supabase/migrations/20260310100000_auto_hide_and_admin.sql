-- ============================================================
-- ADMIN SUPPORT: Add is_admin to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;

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
-- ADMIN RLS POLICIES
-- ============================================================

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
