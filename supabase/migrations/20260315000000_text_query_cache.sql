-- ============================================================
-- TEXT QUERY CACHE: Cache translation + CLIP embedding for text queries
-- ============================================================
CREATE TABLE public.text_query_cache (
  id                    bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  query_text_normalized text NOT NULL UNIQUE,
  translated_text       text NOT NULL,
  embedding             vector(768) NOT NULL,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE public.text_query_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read text query cache"
  ON public.text_query_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert text query cache"
  ON public.text_query_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);
