-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to recipes
ALTER TABLE public.recipes ADD COLUMN image_embedding vector(512);

-- ivfflat index for cosine similarity search
CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING ivfflat (image_embedding vector_cosine_ops)
  WITH (lists = 100);

-- RECOMMENDATIONS TABLE
CREATE TABLE public.recommendations (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path   text NOT NULL,
  image_width  smallint,
  image_height smallint,
  blur_data_url text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE INDEX recommendations_user_created_idx
  ON public.recommendations (user_id, created_at DESC);

CREATE POLICY "Users can read own recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON public.recommendations FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- RECOMMENDATION_RESULTS TABLE
CREATE TABLE public.recommendation_results (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recommendation_id bigint NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  recipe_id         bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  similarity        float NOT NULL,
  rank              smallint NOT NULL
);

ALTER TABLE public.recommendation_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX recommendation_results_rec_idx
  ON public.recommendation_results (recommendation_id);

CREATE POLICY "Recommendation results follow parent access"
  ON public.recommendation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.id = recommendation_id
      AND r.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create recommendation results"
  ON public.recommendation_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.id = recommendation_id
      AND r.user_id = (SELECT auth.uid())
    )
  );

-- SIMILARITY SEARCH FUNCTION
CREATE OR REPLACE FUNCTION match_recipes_by_image(
  query_embedding vector(512),
  match_count int DEFAULT 10
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, 1 - (image_embedding <=> query_embedding) AS similarity
  FROM recipes
  WHERE image_embedding IS NOT NULL
  ORDER BY image_embedding <=> query_embedding
  LIMIT match_count;
$$;
