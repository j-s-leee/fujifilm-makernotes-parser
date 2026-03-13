-- ============================================================
-- MERGE MULTIPLE PERMISSIVE POLICIES
-- Supabase linter: multiple permissive policies for the same
-- role + action forces Postgres to evaluate each one per query.
-- Combining into a single policy with OR is more efficient.
-- ============================================================

-- 1) collections: SELECT / authenticated
--    "Public collections are readable" (is_public = true)
--  + "Users can read own collections"  (auth.uid() = user_id)
--  → merge into one policy
DROP POLICY IF EXISTS "Public collections are readable" ON public.collections;
DROP POLICY IF EXISTS "Users can read own collections"  ON public.collections;

-- Keep anon policy for public collections only
CREATE POLICY "Public collections are readable"
  ON public.collections FOR SELECT
  TO anon
  USING (is_public = true);

-- Authenticated: can read public OR own (including private)
CREATE POLICY "Authenticated users can read collections"
  ON public.collections FOR SELECT
  TO authenticated
  USING (is_public = true OR (SELECT auth.uid()) = user_id);

-- 2) recipes: UPDATE / authenticated
--    "Users can soft-delete own recipes" (auth.uid() = user_id)
--  + "Admins can update any recipe"     (is_admin check)
--  → merge into one policy
DROP POLICY IF EXISTS "Users can soft-delete own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Admins can update any recipe"      ON public.recipes;

CREATE POLICY "Owner or admin can update recipe"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- 3) reports: SELECT / authenticated
--    "Users can read own reports"  (auth.uid() = user_id)
--  + "Admins can read all reports" (is_admin check)
--  → merge into one policy
DROP POLICY IF EXISTS "Users can read own reports"  ON public.reports;
DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;

CREATE POLICY "Owner or admin can read reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );
