# Vector-Based Recipe Recommendation System

**Date**: 2026-03-07
**Branch**: `feature/recipe-recommend-with-vector`
**Status**: Design approved

## Problem

Users frequently ask "what Fujifilm recipe achieves this look?" but the current platform only supports exact hash-matching of recipe settings. There's no way to upload a reference photo and find visually similar recipes. Other photography communities handle this through Q&A posts, which is slow and inefficient.

## Solution

A recommendation page where authenticated users upload any photo (not just Fujifilm), and the system returns visually similar Fujifilm recipes using CLIP image embeddings and pgvector similarity search.

## Architecture

### Approach: Server-Side API Route

Single Next.js API route handles the full pipeline. Client-side compression before upload (matching existing pattern). No queue/job infrastructure needed.

### Pipeline

```
Client                          Server (API Route)                   External
──────                          ──────────────────                   ────────
1. User drops photo
2. compressImageToThumbnail()
3. POST /api/recommend ────────> 4. Auth check
                                 5. Validate file type/size
                                 6. Upload to R2 (recommend/ prefix)
                                 7. Call HF CLIP API ──────────────> HuggingFace
                                 8. Query pgvector (cosine sim)
                                 9. Fetch full recipe data
                                 10. Save to recommendations table
                                 11. Return results ──────────────> Display in grid
```

## Database Schema

### Prerequisites

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Changes to `recipes` table

```sql
ALTER TABLE public.recipes ADD COLUMN image_embedding vector(512);

CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING ivfflat (image_embedding vector_cosine_ops)
  WITH (lists = 100);
```

### New `recommendations` table

Stores recommendation search history so users can revisit past results.

```sql
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
```

### New `recommendation_results` table

Junction table linking a recommendation to matched recipes with scores.

```sql
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
```

### Similarity search function

```sql
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
```

## API Routes

### `POST /api/recommend`

**Auth**: Required
**Input**: `multipart/form-data` with `file` field (pre-compressed on client)
**Output**: JSON with recommendation ID and matched recipes

Steps:
1. Verify user authentication
2. Validate file (JPEG, PNG, WebP; max ~10MB)
3. Generate blur placeholder with Sharp
4. Upload to R2 at `recommend/{userId}/{timestamp}.webp`
5. Send image buffer to HF CLIP API for embedding
6. Query `match_recipes_by_image()` via Supabase RPC
7. Save recommendation + results to DB
8. Return matched recipes with full data (joined from `recipes_with_stats`)

### `POST /api/upload` (modified)

After existing upload logic, add:
- Call HF CLIP API with the uploaded image buffer
- Return embedding in response
- `share-recipe.ts` stores it in `image_embedding` column on recipe insert
- Embedding failure is non-blocking (recipe saves without it, backfill later)

## Frontend

### New page: `/recommend`

- **Auth gate**: Redirect unauthenticated users to login
- **Upload zone**: Reuse dropzone pattern with recommendation-specific copy
- **Loading state**: Spinner/skeleton during pipeline (~3-5s)
- **Results display**: Matched recipes in gallery grid with similarity score badges
- **Uploaded photo**: Stays visible at top for context

### New page: `/recommend/history` (or section within `/recommend`)

- List of past recommendation searches
- Shows uploaded photo thumbnails with "View results" link
- Pulls from `recommendations` table

### Navigation

- Add "Recommend" link to header nav

### New components

- `RecommendUploader` - client component: dropzone + compress + API call + loading state
- `RecommendResults` - displays matched recipes with similarity scores
- Reuse: `RecipeCard`, `GalleryGrid` from existing components

## Embedding Model

**Model**: `openai/clip-vit-base-patch32` via HuggingFace Inference API
**Vector dimensions**: 512
**API endpoint**: `https://api-inference.huggingface.co/pipeline/feature-extraction/openai/clip-vit-base-patch32`

### Environment variable

```
HUGGINGFACE_API_KEY=hf_...
```

## Backfill Strategy

### Script: `scripts/backfill-embeddings.ts`

1. Fetch recipes where `image_embedding IS NULL` and `thumbnail_path IS NOT NULL`
2. For each batch (10 at a time, 100ms delay between requests):
   - Fetch thumbnail from R2 public URL
   - Send to HF CLIP API
   - Update `image_embedding` in Supabase
3. Idempotent: safe to re-run (skips already-embedded recipes)
4. Logs progress, handles individual failures gracefully

### Rate limiting

- HF free tier: ~30 req/min
- Batch with delays to stay within limits
- For large recipe counts: run overnight or use HF Pro

## Storage

### R2 path separation

| Content | R2 prefix | Retention |
|---------|-----------|-----------|
| Recipe thumbnails | `{userId}/{timestamp}.ext` | Permanent |
| Recommendation uploads | `recommend/{userId}/{timestamp}.webp` | Temporary (periodic cleanup) |
| Avatars | via Supabase Storage | Permanent |

### Cleanup

Periodic cleanup of `recommend/` prefix in R2. Can be done via:
- Manual script
- Cron job (future)
- R2 lifecycle rules (if supported)

## Configuration

- Result count: configurable, default 10
- Similarity threshold: optional minimum similarity cutoff (future)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| HF API rate limits | Batch backfill with delays; embedding failure doesn't block upload |
| HF API downtime | Graceful degradation: recommendation page shows error, recipe upload still works |
| Large vector index | ivfflat with 100 lists handles up to ~100K recipes well |
| Slow API response (~3-5s) | Loading spinner, client-side compression reduces upload time |
