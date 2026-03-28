# Multi-Photo Upload & Swipe Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable uploading up to 5 photos per recipe with an Instagram-style swipe gallery on the detail page and photo count badges in the gallery grid.

**Architecture:** New `recipe_photos` table stores additional photos (2nd–5th) while the existing `recipes` table keeps the primary photo. The upload modal gets multi-file selection with primary photo picking. A new `PhotoCarousel` component handles swipe/arrow navigation on the recipe detail page.

**Tech Stack:** Next.js 15, Supabase (Postgres + RLS), Cloudflare R2, motion/react (Framer Motion), react-dropzone, exifr, sharp

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260328000000_recipe_photos.sql` | New table + RLS + view update |
| Create | `components/photo-carousel.tsx` | Swipe/arrow carousel for recipe detail |
| Modify | `components/image-dropzone.tsx` | Multi-file support |
| Modify | `components/upload-recipe-modal.tsx` | Multi-photo preview grid, primary selection |
| Modify | `lib/share-recipe.ts` | Upload multiple photos, insert into recipe_photos |
| Modify | `lib/queries.ts` | Add photo_count to GALLERY_SELECT |
| Modify | `components/gallery-card.tsx` | Photo count badge |
| Modify | `components/recipe-hero.tsx` | Use PhotoCarousel when multiple photos |
| Modify | `app/[locale]/recipes/[id]/page.tsx` | Fetch recipe_photos, pass to RecipeHero |

---

### Task 1: Database Migration — `recipe_photos` Table & View Update

**Files:**
- Create: `supabase/migrations/20260328000000_recipe_photos.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- RECIPE_PHOTOS: Additional photos for multi-photo recipes
-- ============================================================
CREATE TABLE public.recipe_photos (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recipe_id       bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  blur_data_url   text,
  width           smallint,
  height          smallint,
  position        smallint NOT NULL,
  image_embedding vector(768),
  color_histogram vector(48),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX recipe_photos_recipe_id_idx ON public.recipe_photos (recipe_id);
CREATE INDEX recipe_photos_position_idx ON public.recipe_photos (recipe_id, position);

ALTER TABLE public.recipe_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
CREATE POLICY "Anyone can view recipe photos"
  ON public.recipe_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert photos for own recipes"
  ON public.recipe_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete photos from own recipes"
  ON public.recipe_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- UPDATE recipes_with_stats VIEW: Add photo_count column
-- ============================================================
CREATE OR REPLACE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.id,
  r.user_id,
  r.grain_roughness,
  r.grain_size,
  r.color_chrome,
  r.color_chrome_fx_blue,
  r.dynamic_range_setting,
  r.wb_color_temperature,
  r.wb_red,
  r.wb_blue,
  r.dynamic_range_development,
  r.highlight,
  r.shadow,
  r.color,
  r.sharpness,
  r.noise_reduction,
  r.clarity,
  r.bw_adjustment,
  r.bw_magenta_green,
  r.thumbnail_path,
  r.blur_data_url,
  r.recipe_hash,
  r.thumbnail_width,
  r.thumbnail_height,
  r.bookmark_count,
  r.like_count,
  r.created_at,
  s.slug        AS simulation,
  cm.name       AS camera_model,
  cm.sensor_generation,
  l.name        AS lens_model,
  w.slug        AS wb_type,
  p.display_name AS user_display_name,
  p.username     AS user_username,
  p.avatar_path  AS user_avatar_path,
  1 + (SELECT count(*) FROM public.recipe_photos rp WHERE rp.recipe_id = r.id)::int AS photo_count
FROM public.recipes r
LEFT JOIN public.simulations s   ON s.id  = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l         ON l.id  = r.lens_id
LEFT JOIN public.wb_types w       ON w.id  = r.wb_type_id
LEFT JOIN public.profiles p       ON p.id  = r.user_id;
```

- [ ] **Step 2: Apply migration to dev database**

Run: `npx supabase db push --linked`
Expected: Migration applied successfully.

- [ ] **Step 3: Verify the table and view**

Run in Supabase SQL editor or via `psql`:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'recipe_photos';
SELECT photo_count FROM recipes_with_stats LIMIT 1;
```
Expected: `recipe_photos` columns listed, `photo_count` returns `1` for existing recipes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260328000000_recipe_photos.sql
git commit -m "feat: add recipe_photos table and photo_count to view"
```

---

### Task 2: ImageDropzone — Multi-File Support

**Files:**
- Modify: `components/image-dropzone.tsx`

- [ ] **Step 1: Update the props interface and dropzone config**

Replace the full content of `components/image-dropzone.tsx` with:

```tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageDropzoneProps {
  onFileDrop: (files: File[]) => void;
  hasImage: boolean;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageDropzone({
  onFileDrop,
  hasImage,
  multiple = false,
  maxFiles = 1,
}: ImageDropzoneProps) {
  const t = useTranslations("upload");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileDrop(acceptedFiles);
    },
    [onFileDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/x-fuji-raf": [".raf"],
    },
    multiple,
    maxFiles: multiple ? maxFiles : 1,
  });

  if (hasImage) {
    return (
      <div
        {...getRootProps()}
        className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 cursor-pointer transition-all ${
          isDragActive
            ? "border-foreground bg-muted"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {multiple ? t("addMorePhotos") : t("tryAnother")}
        </p>
      </div>
    );
  }

  return (
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
        {t("dropzoneText")}
      </p>
      <p className="text-xs text-muted-foreground">
        {multiple ? t("dropzoneFormatsMulti") : t("dropzoneFormats")}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add i18n strings for multi-upload**

Find the upload translation files and add these keys. The exact file depends on your locale structure — look for `messages/en.json` or similar:

Add under the `"upload"` namespace:
```json
"addMorePhotos": "Add more photos",
"dropzoneFormatsMulti": "JPEG or RAF · Up to 5 photos",
"maxPhotosReached": "You can upload up to 5 photos",
"notFujifilmExtra": "Only photos from Fujifilm cameras can be added"
```

Korean translations (`messages/ko.json`):
```json
"addMorePhotos": "사진 추가",
"dropzoneFormatsMulti": "JPEG 또는 RAF · 최대 5장",
"maxPhotosReached": "최대 5장까지 업로드할 수 있어요",
"notFujifilmExtra": "후지필름 카메라로 촬영한 사진만 추가할 수 있어요"
```

- [ ] **Step 3: Verify the existing single-file usage still works**

Ensure `UploadRecipeModal` still passes `onFileDrop` correctly. Since we haven't changed the modal yet, the default `multiple=false` keeps old behavior intact.

- [ ] **Step 4: Commit**

```bash
git add components/image-dropzone.tsx messages/
git commit -m "feat: add multi-file support to ImageDropzone"
```

---

### Task 3: Upload Modal — Multi-Photo Preview & Primary Selection

**Files:**
- Modify: `components/upload-recipe-modal.tsx`

This is the largest change. The modal needs to:
1. Accept multiple files
2. Show a thumbnail grid of selected photos
3. Let the user pick a primary photo (whose EXIF becomes the recipe)
4. Validate that all photos are from Fujifilm cameras
5. Pass all photos to `shareRecipe`

- [ ] **Step 1: Add new state variables and types**

At the top of `upload-recipe-modal.tsx`, after the existing imports, add:

```tsx
import { X, Star } from "lucide-react";
```

Add a type for tracking individual photo entries. Place this before the `UploadRecipeModalProps` interface:

```tsx
interface PhotoEntry {
  id: string;         // unique identifier for React keys
  file: File | Blob;  // original or RAF-extracted blob
  previewUrl: string; // object URL for preview
  isPrimary: boolean;
}
```

- [ ] **Step 2: Replace single-image state with multi-photo state**

Replace these state variables:
```tsx
const [image, setImage] = useState<string | null>(null);
const [imageSource, setImageSource] = useState<File | Blob | null>(null);
```

With:
```tsx
const [photos, setPhotos] = useState<PhotoEntry[]>([]);
```

Update `resetState` to clear the new state:
```tsx
const resetState = useCallback(() => {
  photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  setPhotos([]);
  setRecipe(null);
  setSimulation(null);
  setCameraModel(null);
  setLensModel(null);
}, [photos]);
```

- [ ] **Step 3: Rewrite onDrop to handle multiple files**

Replace the `onDrop` callback with:

```tsx
const MAX_PHOTOS = 5;

const onDrop = useCallback(
  async (acceptedFiles: File[]) => {
    const currentCount = photos.length;
    const slotsAvailable = MAX_PHOTOS - currentCount;

    if (slotsAvailable <= 0) {
      toast.error(t("maxPhotosReached"));
      return;
    }

    const filesToProcess = acceptedFiles.slice(0, slotsAvailable);
    if (acceptedFiles.length > slotsAvailable) {
      toast.error(t("maxPhotosReached"));
    }

    const newEntries: PhotoEntry[] = [];

    for (const file of filesToProcess) {
      let parseTarget: File | Blob = file;

      // Handle RAF files
      if (isRafFile(file)) {
        try {
          const jpegBlob = await extractJpegFromRaf(file);
          parseTarget = jpegBlob;
        } catch (error) {
          console.error("RAF parsing error:", error);
          toast.error(
            error instanceof Error ? error.message : t("rafExtractFailed"),
          );
          continue;
        }
      }

      // Validate Fujifilm maker
      try {
        const exifr = await import("exifr");
        const exifrData = await exifr.parse(parseTarget, {
          tiff: true,
          exif: true,
          makerNote: true,
        });

        if (!exifrData?.Make || !exifrData.Make.toUpperCase().includes("FUJIFILM")) {
          toast.error(t("notFujifilmExtra"));
          continue;
        }

        const entry: PhotoEntry = {
          id: crypto.randomUUID(),
          file: parseTarget,
          previewUrl: URL.createObjectURL(parseTarget),
          isPrimary: false,
        };

        newEntries.push(entry);
      } catch {
        toast.error(t("extractFailed"));
        continue;
      }
    }

    if (newEntries.length === 0) return;

    setPhotos((prev) => {
      const updated = [...prev, ...newEntries];
      // If no primary exists yet, set first photo as primary
      if (!updated.some((p) => p.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  },
  [photos.length, t],
);
```

- [ ] **Step 4: Add primary photo EXIF parsing effect**

After the `onDrop` callback, add an effect that parses EXIF from the primary photo whenever it changes:

```tsx
// Parse EXIF from the primary photo to extract recipe settings
const primaryPhoto = photos.find((p) => p.isPrimary);
const primaryPhotoId = primaryPhoto?.id;

useCallback(() => {
  // Intentionally left empty — the effect below handles parsing
}, []);

// Use useEffect to parse EXIF when primary changes
import { useEffect } from "react"; // add to existing imports at top

useEffect(() => {
  if (!primaryPhoto) {
    setRecipe(null);
    setSimulation(null);
    setCameraModel(null);
    setLensModel(null);
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      const exifr = await import("exifr");
      const exifrData = await exifr.parse(primaryPhoto.file, {
        tiff: true,
        exif: true,
        makerNote: true,
      });

      if (cancelled) return;

      if (exifrData.Make && exifrData.Model) {
        setCameraModel(`${exifrData.Make} ${exifrData.Model}`.trim());
      }
      setLensModel(exifrData.LensModel ?? null);

      if (exifrData.makerNote) {
        const { getFujifilmRecipeFromMakerNote } = await import("@/fujifilm/recipe");
        const { getFujifilmSimulationFromMakerNote } = await import("@/fujifilm/simulation");
        const makerNoteBytes = new Uint8Array(Object.values(exifrData.makerNote));

        try {
          setRecipe(getFujifilmRecipeFromMakerNote(makerNoteBytes));
          const parsedSim = getFujifilmSimulationFromMakerNote(makerNoteBytes);
          if (parsedSim) setSimulation(parsedSim);
        } catch (error) {
          console.error("Error parsing Fujifilm MakerNote:", error);
          toast.error(t("makerNoteParseFailed"));
        }
      } else {
        toast.error(t("notFujifilm"));
      }
    } catch (error) {
      if (!cancelled) {
        console.error("Error extracting Fujifilm metadata:", error);
        toast.error(t("extractFailed"));
      }
    }
  })();

  return () => { cancelled = true; };
}, [primaryPhotoId]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Add helper functions for photo management**

Add these after the effect:

```tsx
const setPrimaryPhoto = useCallback((id: string) => {
  setPhotos((prev) =>
    prev.map((p) => ({ ...p, isPrimary: p.id === id })),
  );
}, []);

const removePhoto = useCallback((id: string) => {
  setPhotos((prev) => {
    const photo = prev.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    const updated = prev.filter((p) => p.id !== id);
    // If removed photo was primary, set first remaining as primary
    if (photo?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    return updated;
  });
}, []);
```

- [ ] **Step 6: Update handleUpload to pass all photos**

Replace the `handleUpload` callback:

```tsx
const handleUpload = useCallback(async () => {
  if (!recipe || photos.length === 0 || !user) return;

  const agreed = await checkTermsAgreement();
  if (!agreed) return;

  setUploading(true);
  try {
    const primary = photos.find((p) => p.isPrimary)!;
    const extras = photos.filter((p) => !p.isPrimary);

    // Compress all photos in parallel
    const [primaryThumbnail, ...extraThumbnails] = await Promise.all(
      [primary, ...extras].map((p) => compressImageToThumbnail(p.file)),
    );

    const result = await shareRecipe(
      recipe,
      simulation,
      primaryThumbnail,
      cameraModel,
      lensModel,
      extraThumbnails.length > 0 ? extraThumbnails : undefined,
    );

    if (result.success) {
      toast.success(t("uploadSuccess"));
      handleOpenChange(false);
      router.push(`/recipes/${result.recipeId}`);
    } else {
      toast.error(result.error ?? t("uploadFailed"));
    }
  } catch (err) {
    console.error(err);
    toast.error(t("uploadFailed"));
  } finally {
    setUploading(false);
  }
}, [recipe, simulation, photos, cameraModel, lensModel, user, handleOpenChange, router, checkTermsAgreement, t]);
```

- [ ] **Step 7: Update the body JSX to show photo grid**

Replace the `body` const with:

```tsx
const hasPhotos = photos.length > 0;

const body = (
  <div className="flex flex-col gap-6">
    <ImageDropzone
      onFileDrop={onDrop}
      hasImage={hasPhotos}
      multiple
      maxFiles={MAX_PHOTOS}
    />

    {hasPhotos && (
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {/* Photo preview grid */}
        <div className="flex flex-col gap-3">
          {/* Primary photo large preview */}
          {primaryPhoto && (
            <img
              src={primaryPhoto.previewUrl}
              alt="Primary photo"
              className="h-auto max-h-[50vh] w-full rounded-lg object-contain shadow-sm animate-in fade-in duration-300"
            />
          )}
          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo) => (
                <div key={photo.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPrimaryPhoto(photo.id)}
                    className={`relative h-16 w-16 overflow-hidden rounded-md border-2 transition-all ${
                      photo.isPrimary
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {photo.isPrimary && (
                      <div className="absolute bottom-0 left-0 right-0 bg-primary/90 py-0.5 text-center">
                        <Star className="mx-auto h-3 w-3 fill-primary-foreground text-primary-foreground" />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recipe settings preview */}
        {settingsRecipe && (
          <div className="w-full rounded-lg border border-border">
            <RecipeSettings recipe={settingsRecipe} />
            <div className="px-6 pb-6 flex flex-col gap-3">
              {user && agreedToTerms === false && (
                <div className="rounded-md border border-border bg-muted/50 p-3 flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {t("termsAgreement")}{" "}
                    <Link href="/terms" target="_blank" className="underline text-foreground hover:text-foreground/80">
                      {t("termsOfService")}
                    </Link>
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms-agreement"
                      checked={termsChecked}
                      onCheckedChange={(checked) => setTermsChecked(checked === true)}
                    />
                    <label htmlFor="terms-agreement" className="text-sm cursor-pointer select-none">
                      {t("agreeToTerms")}
                    </label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAgreeToTerms}
                    disabled={!termsChecked || agreeingToTerms}
                  >
                    {agreeingToTerms ? t("savingAgreement") : t("agreeAndContinue")}
                  </Button>
                </div>
              )}
              {(!user || agreedToTerms !== false) && (
                <Button
                  className="w-full"
                  onClick={() => user ? handleUpload() : setLoginPromptOpen(true)}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? t("uploading") : t("upload")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
```

- [ ] **Step 8: Verify the modal renders correctly**

Run: `npm run dev`
Open the upload modal, drop multiple JPEG files, verify:
- Thumbnail strip appears
- Clicking a thumbnail sets it as primary (star badge)
- X button removes individual photos
- Recipe settings update when primary changes
- "Add more photos" link appears when photos exist

- [ ] **Step 9: Commit**

```bash
git add components/upload-recipe-modal.tsx
git commit -m "feat: multi-photo preview grid with primary selection in upload modal"
```

---

### Task 4: Server Action — Upload Multiple Photos

**Files:**
- Modify: `lib/share-recipe.ts`

- [ ] **Step 1: Update the shareRecipe function signature**

Add the `extraThumbnails` parameter to the function signature:

```tsx
export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnail: { blob: Blob; contentType: string; extension: string },
  cameraModel?: string | null,
  lensModel?: string | null,
  extraThumbnails?: { blob: Blob; contentType: string; extension: string }[],
): Promise<{ success: true; recipeId: number } | { success: false; error: string }> {
```

- [ ] **Step 2: Add helper function for uploading a single file**

Add this helper inside the function, right after the auth check:

```tsx
  async function uploadFile(
    file: { blob: Blob; contentType: string; extension: string },
  ): Promise<{ key: string; blurDataUrl: string; width: number | null; height: number | null; embedding: number[] | null; colorHistogram: number[] | null }> {
    const formData = new FormData();
    const f = new File([file.blob], `upload.${file.extension}`, {
      type: file.contentType,
    });
    formData.append("file", f);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file");
    }

    return uploadRes.json();
  }
```

- [ ] **Step 3: Skip rate limit for extra photos**

In `app/api/upload/route.ts`, add a query parameter check to skip rate limiting when uploading additional photos for the same recipe. Add this right after `const rl = await rateLimits.upload(user.id);`:

```tsx
  // Allow skipping rate limit for batch uploads (extra photos in multi-photo recipe)
  const skipRateLimit = request.nextUrl.searchParams.get("batch") === "1";

  if (!skipRateLimit) {
    const rl = await rateLimits.upload(user.id);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }
```

Remove the existing rate limit block (the `const rl = ...` and `if (rl.limited)` block) and replace with the above.

Then update the `uploadFile` helper (from Step 2) to accept a `batch` flag:

```tsx
  async function uploadFile(
    file: { blob: Blob; contentType: string; extension: string },
    batch = false,
  ): Promise<...> {
    const formData = new FormData();
    const f = new File([file.blob], `upload.${file.extension}`, {
      type: file.contentType,
    });
    formData.append("file", f);

    const url = batch ? "/api/upload?batch=1" : "/api/upload";
    const uploadRes = await fetch(url, {
      method: "POST",
      body: formData,
    });
    ...
  }
```

And update the parallel upload call to pass `batch: true` for extra photos:

```tsx
  const uploads = await Promise.all([
    uploadFile(thumbnail),
    ...(extraThumbnails ?? []).map((t) => uploadFile(t, true)),
  ]);
```

This way only the primary photo consumes a rate limit, matching the spec requirement of "레시피 단위로 카운트."

- [ ] **Step 4: Upload all photos in parallel**

Replace the existing single-upload block (from `const formData = new FormData()` through `const { key: fileName, ... } = await uploadRes.json()`) with:

```tsx
  // Upload all photos in parallel (primary + extras)
  let primaryUpload: Awaited<ReturnType<typeof uploadFile>>;
  let extraUploads: Awaited<ReturnType<typeof uploadFile>>[] = [];

  try {
    const uploads = await Promise.all([
      uploadFile(thumbnail),
      ...(extraThumbnails ?? []).map((t) => uploadFile(t, true)),
    ]);
    primaryUpload = uploads[0];
    extraUploads = uploads.slice(1);
  } catch {
    return { success: false, error: "Failed to upload photos" };
  }

  const { key: fileName, blurDataUrl, width, height, embedding, colorHistogram } = primaryUpload;
```

- [ ] **Step 5: Insert extra photos after recipe insert**

After the existing recipe insert block (after the `if (insertError || !inserted)` check), add:

```tsx
  // Insert additional photos into recipe_photos
  if (extraUploads.length > 0) {
    const photoRows = extraUploads.map((upload, index) => ({
      recipe_id: inserted.id,
      storage_path: upload.key,
      blur_data_url: upload.blurDataUrl ?? null,
      width: upload.width ?? null,
      height: upload.height ?? null,
      position: index + 1,
      image_embedding: upload.embedding ?? null,
      color_histogram: upload.colorHistogram ?? null,
    }));

    const { error: photosError } = await supabase
      .from("recipe_photos")
      .insert(photoRows);

    if (photosError) {
      // Clean up: delete the recipe if photo insert fails (transaction safety)
      await supabase.from("recipes").delete().eq("id", inserted.id);
      return { success: false, error: "Failed to save additional photos" };
    }
  }
```

- [ ] **Step 6: Verify by uploading a recipe with 3 photos**

Run: `npm run dev`
Upload a recipe with 3 photos. Check Supabase dashboard:
- `recipes` table has 1 new row
- `recipe_photos` table has 2 new rows with correct `recipe_id`
- R2 has all 3 photos + their variants

- [ ] **Step 7: Commit**

```bash
git add lib/share-recipe.ts app/api/upload/route.ts
git commit -m "feat: upload multiple photos in shareRecipe action"
```

---

### Task 5: Gallery Card — Photo Count Badge

**Files:**
- Modify: `lib/queries.ts`
- Modify: `components/gallery-card.tsx`

- [ ] **Step 1: Add photo_count to GALLERY_SELECT**

In `lib/queries.ts`, add `photo_count` to the `GALLERY_SELECT` string:

```tsx
export const GALLERY_SELECT =
  "id, user_id, simulation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, bookmark_count, like_count, camera_model, created_at, user_display_name, user_username, user_avatar_path, slug, photo_count";
```

- [ ] **Step 2: Add photo_count to GalleryRecipe interface**

In `components/gallery-card.tsx`, add to the `GalleryRecipe` interface:

```tsx
  photo_count: number;
```

- [ ] **Step 3: Add the badge to the gallery card image area**

In `components/gallery-card.tsx`, add the `Images` icon import:

```tsx
import { Bookmark, FolderPlus, Heart, Images } from "lucide-react";
```

Add the badge inside the `{/* Image */}` section's `<div className="relative">`, right after the `<Image>` (or the no-image fallback) and before the invisible link. Place it so it shows on top of the image:

```tsx
        {/* Multi-photo badge */}
        {recipe.photo_count > 1 && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Images className="h-3 w-3" />
            <span>{recipe.photo_count}</span>
          </div>
        )}
```

- [ ] **Step 4: Verify the badge appears**

Run: `npm run dev`
Check the gallery grid — recipes with multiple photos should show the badge in the top-right corner. Recipes with 1 photo should show no badge.

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts components/gallery-card.tsx
git commit -m "feat: show photo count badge on gallery cards"
```

---

### Task 6: Photo Carousel Component

**Files:**
- Create: `components/photo-carousel.tsx`

- [ ] **Step 1: Create the carousel component**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";

export interface CarouselPhoto {
  src: string;
  blurDataUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
}

interface PhotoCarouselProps {
  photos: CarouselPhoto[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const dragX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setActiveIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return 0;
        if (next >= photos.length) return photos.length - 1;
        return next;
      });
    },
    [photos.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
    },
    [paginate],
  );

  const currentPhoto = photos[activeIndex];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl shadow-lg"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label="Recipe photos"
      >
        {/* Image area */}
        <div
          className="relative touch-pan-y"
          onPointerDown={() => { dragX.current = 0; }}
          onPointerMove={(e) => {
            if (e.buttons > 0) dragX.current += e.movementX;
          }}
          onPointerUp={() => {
            if (dragX.current > 60) paginate(-1);
            else if (dragX.current < -60) paginate(1);
            dragX.current = 0;
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <m.div
              key={activeIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Image
                src={currentPhoto.src}
                alt={currentPhoto.alt}
                width={currentPhoto.width ?? 600}
                height={currentPhoto.height ?? 600}
                className="w-full object-cover"
                sizes="(max-width: 600px) 100vw, 50vw"
                priority={activeIndex === 0}
                placeholder={currentPhoto.blurDataUrl ? "blur" : "empty"}
                blurDataURL={currentPhoto.blurDataUrl ?? undefined}
              />
            </m.div>
          </AnimatePresence>
        </div>

        {/* Left arrow */}
        {activeIndex > 0 && (
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {activeIndex < photos.length - 1 && (
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > activeIndex ? 1 : -1);
                setActiveIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Verify the carousel renders with test data**

Temporarily render the carousel somewhere with mock data to confirm swipe, arrows, and dots work correctly.

- [ ] **Step 3: Commit**

```bash
git add components/photo-carousel.tsx
git commit -m "feat: add PhotoCarousel component with swipe and arrow navigation"
```

---

### Task 7: Recipe Detail Page — Integrate Carousel

**Files:**
- Modify: `app/[locale]/recipes/[id]/page.tsx`
- Modify: `components/recipe-hero.tsx`

- [ ] **Step 1: Fetch recipe_photos in the detail page**

In `app/[locale]/recipes/[id]/page.tsx`, add a new cached function after `getRecipe`:

```tsx
const getRecipePhotos = cache(async (recipeId: number) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipe_photos")
    .select("storage_path, blur_data_url, width, height, position")
    .eq("recipe_id", recipeId)
    .order("position", { ascending: true });
  return data ?? [];
});
```

- [ ] **Step 2: Fetch photos in the page component and pass to RecipeHero**

In the `RecipePage` component, after `const recipe = await getRecipe(recipeId);` and the null/soft-delete checks, fetch the photos:

```tsx
  const recipePhotos = await getRecipePhotos(recipeId);
```

Build the photos array for the carousel. Add this after the `r2PublicUrl` line:

```tsx
  const allPhotos = [
    // Primary photo from recipes table
    ...(recipe.thumbnail_path
      ? [{
          src: recipe.thumbnail_width
            ? recipe.thumbnail_path
            : getThumbnailUrl(recipe.thumbnail_path),
          blurDataUrl: recipe.blur_data_url as string | null,
          width: recipe.thumbnail_width as number | null,
          height: recipe.thumbnail_height as number | null,
          alt: recipe.simulation ?? "Recipe photo",
        }]
      : []),
    // Additional photos from recipe_photos table
    ...recipePhotos.map((photo) => ({
      src: photo.storage_path,
      blurDataUrl: photo.blur_data_url,
      width: photo.width,
      height: photo.height,
      alt: recipe.simulation ?? "Recipe photo",
    })),
  ];
```

Add the import at the top of the file:

```tsx
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
```

Update the `RecipeHero` usage to pass the photos:

```tsx
<RecipeHero recipe={recipe} settings={settings} sharer={sharer} photos={allPhotos} />
```

- [ ] **Step 3: Update RecipeHero to accept and display photos**

In `components/recipe-hero.tsx`, add the import:

```tsx
import { PhotoCarousel } from "@/components/photo-carousel";
import type { CarouselPhoto } from "@/components/photo-carousel";
```

Add `photos` to the `RecipeHeroProps` interface:

```tsx
interface RecipeHeroProps {
  recipe: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    blur_data_url: string | null;
    thumbnail_width: number | null;
    camera_model: string | null;
    lens_model: string | null;
    bookmark_count: number;
    like_count: number;
    slug: string;
  };
  settings: RecipeSettingsRecipe;
  sharer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  photos?: CarouselPhoto[];
}
```

Update the function signature:

```tsx
export function RecipeHero({ recipe, settings, sharer, photos }: RecipeHeroProps) {
```

Replace the `{/* Photo */}` section in the JSX. Find the block that starts with `{thumbnailUrl ? (` and ends before `{/* Metadata & Author card */}`. Replace it with:

```tsx
      {/* Photo(s) */}
      {photos && photos.length > 1 ? (
        <PhotoCarousel photos={photos} />
      ) : thumbnailUrl ? (
        <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
          <Image
            src={thumbnailUrl}
            alt={recipe.simulation ?? "Recipe photo"}
            width={600}
            height={600}
            className="w-full object-cover"
            sizes="(max-width: 600px) 100vw, 50vw"
            priority
            placeholder={recipe.blur_data_url ? "blur" : "empty"}
            blurDataURL={recipe.blur_data_url ?? undefined}
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          {tCommon("noImage")}
        </div>
      )}
```

- [ ] **Step 4: Verify end-to-end**

Run: `npm run dev`
1. Navigate to a recipe with multiple photos → carousel should appear with swipe + arrows + dots
2. Navigate to a recipe with 1 photo → should look identical to before (no carousel)
3. Test keyboard navigation (left/right arrow keys)
4. Test mobile swipe gesture

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/recipes/[id]/page.tsx components/recipe-hero.tsx
git commit -m "feat: integrate photo carousel in recipe detail page"
```

---

### Task 8: Final Verification & Cleanup

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run linter**

Run: `npx next lint`
Expected: No lint errors.

- [ ] **Step 3: Run the dev server and test full flow**

Run: `npm run dev`

Test checklist:
1. Upload 1 photo → works exactly as before (no regression)
2. Upload 3 photos → thumbnail grid appears, primary selection works
3. Upload 5 photos → all accepted
4. Upload 6+ photos → error toast "최대 5장까지 업로드할 수 있어요"
5. Upload non-Fujifilm photo → rejected with error
6. Gallery grid → multi-photo recipes show count badge
7. Recipe detail → carousel with swipe/arrows/dots
8. Recipe detail for 1-photo recipe → no carousel, same as before

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: address remaining issues from multi-photo feature"
```
