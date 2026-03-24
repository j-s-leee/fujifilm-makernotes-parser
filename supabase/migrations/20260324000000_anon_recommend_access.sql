-- ============================================================
-- Allow anonymous users to use recommendation features
-- ============================================================

-- Allow anon to read text query cache (for cached translation/embedding lookup)
CREATE POLICY "Anyone can read text query cache"
  ON public.text_query_cache FOR SELECT
  TO anon
  USING (true);

-- Allow anon to insert text query cache (for caching new translations)
CREATE POLICY "Anyone can insert text query cache"
  ON public.text_query_cache FOR INSERT
  TO anon
  WITH CHECK (true);
