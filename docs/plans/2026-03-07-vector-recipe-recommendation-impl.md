# Vector-Based Recipe Recommendation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image-based recipe recommendation using CLIP embeddings and pgvector similarity search.

**Architecture:** Server-side API route handles the full pipeline. Client compresses images before upload (matching existing pattern). CLIP embeddings stored in `recipes.image_embedding` column. New `/recommend` page with dropzone, results grid, and recommendation history.

**Tech Stack:** Next.js 15 (App Router), Supabase (pgvector), HuggingFace Inference API (CLIP), Sharp, Cloudflare R2, Tailwind CSS, shadcn/ui.

---

### Task 1: Database Migration — pgvector + image_embedding column

**Files:**
- Create: `supabase/migrations/20260307000000_vector_recommendation.sql`
- Modify: `supabase/schema.sql` (append new tables and column)

**Step 1: Create the migration file**

```sql
-- supabase/migrations/20260307000000_vector_recommendation.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to recipes
ALTER TABLE public.recipes ADD COLUMN image_embedding vector(512);

-- ivfflat index for cosine similarity search
-- NOTE: This index requires at least 100 rows to build. If the table has fewer,
-- the index will be created but won't be effective until more data is added.
-- For tables with < 100 rows, consider using HNSW instead or omit the index initially.
CREATE INDEX recipes_image_embedding_idx
  ON public.recipes USING ivfflat (image_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- RECOMMENDATIONS TABLE
-- ============================================================
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

-- ============================================================
-- RECOMMENDATION_RESULTS TABLE
-- ============================================================
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

-- ============================================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================================
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

**Step 2: Apply the migration**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor)
Expected: Migration applies successfully, pgvector extension enabled.

**Step 3: Update schema.sql to reflect new state**

Append the new tables, column, and function to `supabase/schema.sql` for documentation purposes. Add after the existing triggers section:
- `ALTER TABLE public.recipes ADD COLUMN image_embedding vector(512);`
- The full `recommendations` table definition
- The full `recommendation_results` table definition
- The `match_recipes_by_image` function

**Step 4: Commit**

```bash
git add supabase/migrations/20260307000000_vector_recommendation.sql supabase/schema.sql
git commit -m "feat: add pgvector extension, embedding column, and recommendation tables"
```

---

### Task 2: HuggingFace CLIP Embedding Utility

**Files:**
- Create: `lib/embedding.ts`

**Step 1: Add HUGGINGFACE_API_KEY to .env.local**

Add to `.env.local`:
```
HUGGINGFACE_API_KEY=hf_YOUR_KEY_HERE
```

**Step 2: Create the embedding utility**

```typescript
// lib/embedding.ts

const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/openai/clip-vit-base-patch32";

/**
 * Generate a CLIP image embedding via HuggingFace Inference API.
 * Sends raw image bytes and returns a 512-dimensional float array.
 *
 * Returns null if the API call fails (non-blocking for callers).
 */
export async function getImageEmbedding(
  imageBuffer: Buffer
): Promise<number[] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("HUGGINGFACE_API_KEY not set, skipping embedding");
    return null;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      console.error(
        `HF embedding API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    // HF feature-extraction returns a nested array: [[...512 floats]]
    const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;

    if (embedding.length !== 512) {
      console.error(`Unexpected embedding dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `lib/embedding.ts`.

**Step 4: Commit**

```bash
git add lib/embedding.ts
git commit -m "feat: add CLIP image embedding utility via HuggingFace API"
```

---

### Task 3: Integrate Embedding into Recipe Upload Flow

**Files:**
- Modify: `app/api/upload/route.ts` (add embedding call, return embedding in response)
- Modify: `lib/share-recipe.ts` (store embedding in recipe insert)

**Step 1: Modify the upload API route**

In `app/api/upload/route.ts`, after the existing blur placeholder generation (line ~65), add:

```typescript
import { getImageEmbedding } from "@/lib/embedding";
```

After the `blurDataUrl` computation, add embedding generation:

```typescript
// Generate CLIP embedding (non-blocking — null on failure)
const embedding = await getImageEmbedding(buffer);
```

Update the return statement to include the embedding:

```typescript
return NextResponse.json({
  key,
  blurDataUrl,
  width: metadata.width ?? null,
  height: metadata.height ?? null,
  embedding,
});
```

**Step 2: Modify share-recipe.ts to store embedding**

In `lib/share-recipe.ts`:

Update the `shareRecipe` function to accept and pass the embedding.

After the upload response parsing (line ~39), extract embedding:

```typescript
const { key: fileName, blurDataUrl, width, height, embedding } = await uploadRes.json();
```

In the `supabase.from("recipes").insert({...})` call (line ~86), add:

```typescript
image_embedding: embedding ?? null,
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Test manually**

Upload a Fujifilm image via the home page. Check in Supabase dashboard that the new recipe row has a non-null `image_embedding` value (a 512-element array).

**Step 5: Commit**

```bash
git add app/api/upload/route.ts lib/share-recipe.ts
git commit -m "feat: generate and store CLIP embedding on recipe upload"
```

---

### Task 4: Recommendation API Route

**Files:**
- Create: `app/api/recommend/route.ts`

**Step 1: Create the recommendation API route**

```typescript
// app/api/recommend/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getImageEmbedding } from "@/lib/embedding";

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate file
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Generate blur placeholder
  const blurBuffer = await sharp(buffer)
    .resize(10, 10, { fit: "cover" })
    .jpeg({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  const metadata = await sharp(buffer).metadata();

  // 4. Upload to R2 at recommend/{userId}/{timestamp}.webp
  const key = `recommend/${user.id}/${Date.now()}.webp`;

  // Convert to WebP for consistent storage (image is already compressed on client)
  const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=604800", // 7 days (temporary)
    })
  );

  // 5. Generate CLIP embedding
  const embedding = await getImageEmbedding(buffer);

  if (!embedding) {
    return NextResponse.json(
      { error: "Failed to generate image embedding. Please try again." },
      { status: 502 }
    );
  }

  // 6. Query pgvector for similar recipes
  const matchCountParam = request.nextUrl.searchParams.get("count");
  const matchCount = Math.min(
    Math.max(parseInt(matchCountParam ?? "10", 10) || 10, 1),
    50
  );

  const { data: matches, error: matchError } = await supabase.rpc(
    "match_recipes_by_image",
    {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
    }
  );

  if (matchError) {
    console.error("Vector search error:", matchError);
    return NextResponse.json(
      { error: "Failed to search for similar recipes" },
      { status: 500 }
    );
  }

  const matchedIds = (matches ?? []).map((m: { id: number }) => m.id);
  const similarityMap = new Map(
    (matches ?? []).map((m: { id: number; similarity: number }) => [
      m.id,
      m.similarity,
    ])
  );

  // 7. Fetch full recipe data for matched IDs
  let recipes: Record<string, unknown>[] = [];
  if (matchedIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .in("id", matchedIds);
    recipes = data ?? [];
  }

  // Sort by similarity (highest first) and attach scores
  const rankedRecipes = recipes
    .map((r) => ({
      ...r,
      similarity: similarityMap.get(r.id as number) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);

  // 8. Save recommendation + results to DB
  const { data: recommendation, error: recError } = await supabase
    .from("recommendations")
    .insert({
      user_id: user.id,
      image_path: key,
      image_width: (metadata.width ?? null) as number | null,
      image_height: (metadata.height ?? null) as number | null,
      blur_data_url: blurDataUrl,
    })
    .select("id")
    .single();

  if (recError || !recommendation) {
    console.error("Failed to save recommendation:", recError);
    // Still return results even if history save fails
  } else {
    // Save individual results
    const resultRows = rankedRecipes.map((r, i) => ({
      recommendation_id: recommendation.id,
      recipe_id: r.id as number,
      similarity: r.similarity,
      rank: i + 1,
    }));

    if (resultRows.length > 0) {
      await supabase.from("recommendation_results").insert(resultRows);
    }
  }

  // 9. Return results
  return NextResponse.json({
    recommendationId: recommendation?.id ?? null,
    imagePath: key,
    blurDataUrl,
    imageWidth: metadata.width ?? null,
    imageHeight: metadata.height ?? null,
    recipes: rankedRecipes,
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add app/api/recommend/route.ts
git commit -m "feat: add recommendation API route with CLIP + pgvector pipeline"
```

---

### Task 5: Recommend Page — Upload & Results UI

**Files:**
- Create: `app/recommend/page.tsx`
- Create: `components/recommend-uploader.tsx`
- Create: `components/recommend-results.tsx`

**Step 1: Create the RecommendUploader component**

```typescript
// components/recommend-uploader.tsx
"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import Image from "next/image";
import { compressImageToThumbnail } from "@/lib/compress-image";

interface RecommendedRecipe {
  id: number;
  simulation: string | null;
  thumbnail_path: string | null;
  blur_data_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  bookmark_count: number;
  like_count: number;
  camera_model: string | null;
  similarity: number;
}

interface RecommendResult {
  recommendationId: number | null;
  imagePath: string;
  blurDataUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  recipes: RecommendedRecipe[];
}

interface RecommendUploaderProps {
  onResult: (result: RecommendResult, previewUrl: string) => void;
}

export function RecommendUploader({ onResult }: RecommendUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Create preview URL for display
      const previewUrl = URL.createObjectURL(file);

      // Compress on client side (matching existing pattern)
      const compressed = await compressImageToThumbnail(file);

      // Send to API
      const formData = new FormData();
      const compressedFile = new File(
        [compressed.blob],
        `recommend.${compressed.extension}`,
        { type: compressed.contentType }
      );
      formData.append("file", compressedFile);

      const res = await fetch("/api/recommend", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to get recommendations");
      }

      const result: RecommendResult = await res.json();
      onResult(result, previewUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
    disabled: loading,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12">
        <Loader2 className="h-10 w-10 mb-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-foreground mb-1">
          Finding similar recipes...
        </p>
        <p className="text-xs text-muted-foreground">
          This may take a few seconds
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer transition-all ${
          isDragActive
            ? "border-foreground bg-muted scale-[1.01]"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
        <p className="text-sm text-foreground mb-1">
          Upload any photo to find matching Fujifilm recipes
        </p>
        <p className="text-xs text-muted-foreground">
          Supports JPG, PNG, and WebP
        </p>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export type { RecommendResult, RecommendedRecipe };
```

**Step 2: Create the RecommendResults component**

```typescript
// components/recommend-results.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import type { RecommendedRecipe } from "@/components/recommend-uploader";

interface RecommendResultsProps {
  recipes: RecommendedRecipe[];
  uploadedImageUrl: string;
}

export function RecommendResults({
  recipes,
  uploadedImageUrl,
}: RecommendResultsProps) {
  if (recipes.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No similar recipes found. Try uploading a different photo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Uploaded photo preview */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Photo
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <Image
            src={uploadedImageUrl}
            alt="Uploaded photo"
            width={300}
            height={300}
            className="max-h-60 w-auto object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Results grid */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Similar Recipes ({recipes.length})
        </h2>
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {recipes.map((recipe) => {
            const src = recipe.thumbnail_width
              ? recipe.thumbnail_path
              : getThumbnailUrl(recipe.thumbnail_path);
            const similarityPercent = Math.round(recipe.similarity * 100);

            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group relative block overflow-hidden rounded-lg bg-muted"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={recipe.simulation ?? "Recipe"}
                    width={recipe.thumbnail_width ?? 300}
                    height={recipe.thumbnail_height ?? 300}
                    className="w-full object-cover rounded-lg"
                    style={
                      recipe.thumbnail_width && recipe.thumbnail_height
                        ? {
                            aspectRatio: `${recipe.thumbnail_width}/${recipe.thumbnail_height}`,
                          }
                        : { aspectRatio: "1/1" }
                    }
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder={recipe.blur_data_url ? "blur" : "empty"}
                    blurDataURL={recipe.blur_data_url ?? undefined}
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
                {/* Bottom badges */}
                <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                  <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {similarityPercent}% match
                  </span>
                  <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {recipe.simulation ?? "Unknown"}
                    {recipe.camera_model && (
                      <>
                        <span className="opacity-50"> · </span>
                        <span className="opacity-80">{recipe.camera_model}</span>
                      </>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create the recommend page**

```typescript
// app/recommend/page.tsx
import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import { RecommendPageClient } from "@/components/recommend-page-client";

export default async function RecommendPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Recipe Recommendations"
        description="Sign in to get personalized recipe recommendations from your photos."
      />
    );
  }

  return <RecommendPageClient />;
}
```

**Step 4: Create the client wrapper component**

```typescript
// components/recommend-page-client.tsx
"use client";

import { useState } from "react";
import { RecommendUploader } from "@/components/recommend-uploader";
import { RecommendResults } from "@/components/recommend-results";
import type { RecommendResult } from "@/components/recommend-uploader";

export function RecommendPageClient() {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleResult = (newResult: RecommendResult, newPreviewUrl: string) => {
    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setResult(newResult);
    setPreviewUrl(newPreviewUrl);
  };

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recipe Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload any photo to find Fujifilm recipes with a similar look
          </p>
        </div>

        <RecommendUploader onResult={handleResult} />

        {result && previewUrl && (
          <RecommendResults
            recipes={result.recipes}
            uploadedImageUrl={previewUrl}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add app/recommend/page.tsx components/recommend-uploader.tsx components/recommend-results.tsx components/recommend-page-client.tsx
git commit -m "feat: add recommend page with upload and results UI"
```

---

### Task 6: Add Navigation Link

**Files:**
- Modify: `components/header.tsx:104-124` (desktop nav, inside `{user && (<>...</>)}`)
- Modify: `components/header.tsx:196-219` (mobile nav, inside `{user && (<>...</>)}`)

**Step 1: Add "Recommend" link to desktop nav**

In `components/header.tsx`, inside the `{user && (<>...</>)}` block in the desktop nav (around line 104), add a new Link **before** the "My Recipes" link:

```tsx
<Link
  href="/recommend"
  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
>
  Recommend
</Link>
```

**Step 2: Add "Recommend" link to mobile nav**

In the mobile nav section (around line 196), inside the `{user && (<>...</>)}` block, add:

```tsx
<Link
  href="/recommend"
  onClick={() => setMobileMenuOpen(false)}
  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
>
  Recommend
</Link>
```

**Step 3: Verify the nav renders correctly**

Run: `npm run dev`
Expected: "Recommend" link appears in header nav for logged-in users, on both desktop and mobile.

**Step 4: Commit**

```bash
git add components/header.tsx
git commit -m "feat: add Recommend link to header navigation"
```

---

### Task 7: Recommendation History Page

**Files:**
- Create: `app/recommend/history/page.tsx`

**Step 1: Create the history page**

```typescript
// app/recommend/history/page.tsx
import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import Image from "next/image";
import Link from "next/link";

export default async function RecommendHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Recommendation History"
        description="Sign in to view your past recipe recommendations."
      />
    );
  }

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, image_path, image_width, image_height, blur_data_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = recommendations ?? [];
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recommendation History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your past recipe recommendation searches
          </p>
        </div>

        {items.length > 0 ? (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {items.map((item) => {
              const src = r2Url
                ? `${r2Url}/${item.image_path}`
                : item.image_path;
              const date = item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "";

              return (
                <Link
                  key={item.id}
                  href={`/recommend/history/${item.id}`}
                  className="group relative block overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={src}
                    alt="Recommendation search"
                    width={item.image_width ?? 300}
                    height={item.image_height ?? 300}
                    className="w-full object-cover rounded-lg"
                    style={
                      item.image_width && item.image_height
                        ? { aspectRatio: `${item.image_width}/${item.image_height}` }
                        : { aspectRatio: "1/1" }
                    }
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder={item.blur_data_url ? "blur" : "empty"}
                    blurDataURL={item.blur_data_url ?? undefined}
                  />
                  <div className="absolute bottom-2 left-2">
                    <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                      {date}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recommendation history yet.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create the history detail page**

```typescript
// app/recommend/history/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";

interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { id } = await params;
  const recId = parseInt(id, 10);
  if (isNaN(recId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch recommendation
  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recId)
    .eq("user_id", user.id)
    .single();

  if (!recommendation) notFound();

  // Fetch results with recipe data
  const { data: results } = await supabase
    .from("recommendation_results")
    .select("recipe_id, similarity, rank")
    .eq("recommendation_id", recId)
    .order("rank", { ascending: true });

  const recipeIds = (results ?? []).map((r) => r.recipe_id);
  const similarityMap = new Map(
    (results ?? []).map((r) => [r.recipe_id, r.similarity])
  );

  let recipes: Record<string, unknown>[] = [];
  if (recipeIds.length > 0) {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .in("id", recipeIds);
    recipes = data ?? [];
  }

  // Sort by rank
  const rankedRecipes = recipes
    .map((r) => ({
      ...r,
      similarity: similarityMap.get(r.id as number) ?? 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const uploadedImageSrc = r2Url
    ? `${r2Url}/${recommendation.image_path}`
    : recommendation.image_path;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <BackButton label="Back to History" fallbackHref="/recommend/history" />

        {/* Uploaded photo */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Photo
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src={uploadedImageSrc}
              alt="Uploaded photo"
              width={recommendation.image_width ?? 300}
              height={recommendation.image_height ?? 300}
              className="max-h-60 w-auto object-contain"
              placeholder={recommendation.blur_data_url ? "blur" : "empty"}
              blurDataURL={recommendation.blur_data_url ?? undefined}
            />
          </div>
        </div>

        {/* Results grid */}
        {rankedRecipes.length > 0 ? (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Matched Recipes ({rankedRecipes.length})
            </h2>
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {rankedRecipes.map((recipe) => {
                const src = (recipe.thumbnail_width as number | null)
                  ? (recipe.thumbnail_path as string | null)
                  : getThumbnailUrl(recipe.thumbnail_path as string | null);
                const similarityPercent = Math.round(recipe.similarity * 100);

                return (
                  <Link
                    key={recipe.id as number}
                    href={`/recipes/${recipe.id}`}
                    className="group relative block overflow-hidden rounded-lg bg-muted"
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={(recipe.simulation as string) ?? "Recipe"}
                        width={(recipe.thumbnail_width as number) ?? 300}
                        height={(recipe.thumbnail_height as number) ?? 300}
                        className="w-full object-cover rounded-lg"
                        style={
                          recipe.thumbnail_width && recipe.thumbnail_height
                            ? {
                                aspectRatio: `${recipe.thumbnail_width}/${recipe.thumbnail_height}`,
                              }
                            : { aspectRatio: "1/1" }
                        }
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        placeholder={recipe.blur_data_url ? "blur" : "empty"}
                        blurDataURL={
                          (recipe.blur_data_url as string) ?? undefined
                        }
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                        No image
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        {similarityPercent}% match
                      </span>
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        {(recipe.simulation as string) ?? "Unknown"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-10">
            No results found for this recommendation.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/recommend/history/page.tsx app/recommend/history/\[id\]/page.tsx
git commit -m "feat: add recommendation history page and detail view"
```

---

### Task 8: Backfill Script for Existing Recipes

**Files:**
- Create: `scripts/backfill-embeddings.ts`

**Step 1: Create the backfill script**

```typescript
// scripts/backfill-embeddings.ts

/**
 * Backfill CLIP image embeddings for existing recipes.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or a service role key)
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *   HUGGINGFACE_API_KEY
 *
 * Idempotent: only processes recipes where image_embedding IS NULL.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY!;
const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/openai/clip-vit-base-patch32";

const BATCH_SIZE = 10;
const DELAY_MS = 2000; // 2s between batches to respect rate limits

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getEmbedding(imageUrl: string): Promise<number[] | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`  Failed to fetch image: ${imgRes.status}`);
      return null;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const res = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    if (!res.ok) {
      console.error(`  HF API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;

    if (embedding.length !== 512) {
      console.error(`  Unexpected dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (err) {
    console.error(`  Error:`, err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fetching recipes without embeddings...");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, thumbnail_path, thumbnail_width")
    .is("image_embedding", null)
    .not("thumbnail_path", "is", null)
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to fetch recipes:", error);
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to process.`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE);

    for (const recipe of batch) {
      processed++;
      const path = recipe.thumbnail_path;

      // Build image URL
      let imageUrl: string;
      if (path.startsWith("http")) {
        imageUrl = path;
      } else if (recipe.thumbnail_width) {
        // New format: use the path directly with R2 URL
        imageUrl = `${R2_PUBLIC_URL}/${path}`;
      } else {
        // Legacy format
        imageUrl = `${R2_PUBLIC_URL}/${path}`;
      }

      console.log(`[${processed}/${recipes.length}] Recipe #${recipe.id}`);

      const embedding = await getEmbedding(imageUrl);
      if (!embedding) {
        failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("recipes")
        .update({ image_embedding: JSON.stringify(embedding) })
        .eq("id", recipe.id);

      if (updateError) {
        console.error(`  DB update failed:`, updateError);
        failed++;
      } else {
        succeeded++;
        console.log(`  OK`);
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < recipes.length) {
      console.log(`  Waiting ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone! Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`);
}

main();
```

**Step 2: Install dotenv (if not already present)**

Run: `npm ls dotenv`
If not installed: `npm install --save-dev dotenv`

**Step 3: Test the script on a small batch**

Run: `npx tsx scripts/backfill-embeddings.ts`
Expected: Script processes recipes one by one, logging progress. Verify in Supabase that `image_embedding` is populated for processed recipes.

**Step 4: Commit**

```bash
git add scripts/backfill-embeddings.ts
git commit -m "feat: add backfill script for CLIP image embeddings"
```

---

### Task 9: End-to-End Verification

**Files:** None (manual testing)

**Step 1: Verify the full recommendation flow**

1. Start dev server: `npm run dev`
2. Sign in
3. Navigate to `/recommend`
4. Upload any photo (not necessarily Fujifilm)
5. Wait for results (~3-5s)
6. Verify: results grid shows with similarity percentages
7. Click a result to navigate to recipe detail page

**Step 2: Verify recommendation history**

1. Navigate to `/recommend/history`
2. Verify the photo you uploaded appears
3. Click it to see the saved results

**Step 3: Verify auto-embed on new recipe upload**

1. Upload a Fujifilm image on the home page
2. Share the recipe
3. Check Supabase: the new recipe should have `image_embedding` populated

**Step 4: Verify navigation**

1. Check header nav shows "Recommend" when logged in
2. Check mobile menu shows "Recommend" when logged in
3. Verify "Recommend" is hidden when logged out

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | DB migration (pgvector, tables, function) | `supabase/migrations/20260307000000_vector_recommendation.sql` |
| 2 | HF CLIP embedding utility | `lib/embedding.ts` |
| 3 | Integrate embedding into upload flow | `app/api/upload/route.ts`, `lib/share-recipe.ts` |
| 4 | Recommendation API route | `app/api/recommend/route.ts` |
| 5 | Recommend page UI (upload + results) | `app/recommend/page.tsx`, `components/recommend-*.tsx` |
| 6 | Header navigation link | `components/header.tsx` |
| 7 | Recommendation history pages | `app/recommend/history/page.tsx`, `app/recommend/history/[id]/page.tsx` |
| 8 | Backfill script | `scripts/backfill-embeddings.ts` |
| 9 | End-to-end verification | Manual testing |
