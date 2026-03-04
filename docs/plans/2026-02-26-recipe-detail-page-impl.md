# Recipe Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the gallery recipe detail dialog with a dedicated `/gallery/[id]` page showing photo + settings side-by-side, sharer info, camera/lens info, and similar recipe photos.

**Architecture:** Server Component page at `app/gallery/[id]/page.tsx` fetching recipe data, user profile, and similar recipes from Supabase. Client Components only for interactive elements (favorite button). Gallery grid cards become `<Link>` instead of dialog triggers.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (PostgreSQL + Storage), Tailwind CSS, Radix UI, lucide-react

---

### Task 1: Add camera_model and lens_model columns to DB

**Context:** The `recipes` table currently stores recipe settings but not camera/lens info. We need two new TEXT columns. This is a Supabase schema change done via the dashboard SQL editor or migration.

**Files:**
- No local files to modify (Supabase dashboard SQL)

**Step 1: Run SQL migration in Supabase dashboard**

Open the Supabase SQL Editor and run:

```sql
ALTER TABLE recipes ADD COLUMN camera_model TEXT;
ALTER TABLE recipes ADD COLUMN lens_model TEXT;
```

**Step 2: Update the `recipes_with_stats` view**

The existing view needs to expose these new columns. Run in Supabase SQL Editor:

```sql
CREATE OR REPLACE VIEW recipes_with_stats AS
SELECT
  r.*,
  COALESCE(f.favorite_count, 0) AS favorite_count
FROM recipes r
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS favorite_count
  FROM favorites
  GROUP BY recipe_id
) f ON r.id = f.recipe_id;
```

> **Note:** Check the existing view definition first with `SELECT pg_get_viewdef('recipes_with_stats', true);` and make sure the replacement matches. The `r.*` wildcard automatically includes the new columns.

**Step 3: Verify columns exist**

Run: `SELECT camera_model, lens_model FROM recipes LIMIT 1;`
Expected: Empty result (no data yet), no error.

---

### Task 2: Update share-recipe to save camera_model and lens_model

**Context:** When users share a recipe, the `shareRecipe` function in `lib/share-recipe.ts` inserts into the `recipes` table. It needs to accept and store camera/lens info. The caller (RecipeCard in `app/page.tsx`) already has access to the full EXIF data through `exifr`, so we need to pass camera/lens info through the chain.

**Files:**
- Modify: `lib/share-recipe.ts`
- Modify: `components/recipe-card.tsx`
- Modify: `app/page.tsx`

**Step 1: Update `shareRecipe` function signature**

In `lib/share-recipe.ts`, add `cameraModel` and `lensModel` parameters:

```typescript
export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnailBlob: Blob,
  cameraModel?: string | null,
  lensModel?: string | null
): Promise<{ success: boolean; error?: string }> {
```

**Step 2: Add columns to the insert call**

In the same file, add to the `.insert({...})` object (after `thumbnail_path: fileName,`):

```typescript
    camera_model: cameraModel ?? null,
    lens_model: lensModel ?? null,
```

**Step 3: Update RecipeCard to accept and pass camera/lens info**

In `components/recipe-card.tsx`, update the props type:

```typescript
export function RecipeCard({
  simulation,
  imageSource,
  cameraModel,
  lensModel,
  ...recipe
}: FujifilmRecipe & {
  simulation: FujifilmSimulation | null;
  imageSource?: File | Blob | null;
  cameraModel?: string | null;
  lensModel?: string | null;
}) {
```

Update the `handleShare` call:

```typescript
const result = await shareRecipe(recipe, simulation, thumbnailBlob, cameraModel, lensModel);
```

**Step 4: Extract camera/lens info from EXIF in app/page.tsx**

In `app/page.tsx`, add state for camera info:

```typescript
const [cameraModel, setCameraModel] = useState<string | null>(null);
const [lensModel, setLensModel] = useState<string | null>(null);
```

In the `onDrop` callback, after `const exifrData = await exifr.parse(...)`, extract the EXIF fields:

```typescript
if (exifrData.Make && exifrData.Model) {
  setCameraModel(`${exifrData.Make} ${exifrData.Model}`.trim());
} else {
  setCameraModel(null);
}
setLensModel(exifrData.LensModel ?? null);
```

Reset them at the top of `onDrop`:

```typescript
setCameraModel(null);
setLensModel(null);
```

Pass to RecipeCard:

```tsx
<RecipeCard {...recipe} simulation={simulation} imageSource={imageSource} cameraModel={cameraModel} lensModel={lensModel} />
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

**Step 6: Manual test**

Run: `npm run dev`
1. Upload a Fujifilm JPEG on the home page
2. Click Share
3. Check Supabase `recipes` table — new row should have `camera_model` and `lens_model` populated

**Step 7: Commit**

```bash
git add lib/share-recipe.ts components/recipe-card.tsx app/page.tsx
git commit -m "feat: save camera model and lens info when sharing recipes"
```

---

### Task 3: Create the recipe detail page (Server Component)

**Context:** This is the main new page. It fetches recipe data by ID from Supabase, gets the sharer's profile info, and renders the page layout. It uses `notFound()` for missing recipes.

**Files:**
- Create: `app/gallery/[id]/page.tsx`

**Step 1: Create the directory**

Run: `mkdir -p app/gallery/\[id\]`

**Step 2: Create the page**

Create `app/gallery/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeHero } from "@/components/recipe-hero";
import { RecipeSettings } from "@/components/recipe-settings";
import { SimilarRecipes } from "@/components/similar-recipes";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) notFound();

  const supabase = await createClient();

  // Fetch recipe with stats
  const { data: recipe } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (!recipe) notFound();

  // Fetch sharer profile
  let sharerName: string | null = null;
  if (recipe.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", recipe.user_id)
      .single();
    sharerName = profile?.display_name ?? null;
  }

  // Check if current user has favorited this recipe
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId)
      .single();
    isFavorited = !!fav;
  }

  // Fetch similar recipes (same core settings)
  let similarRecipes: typeof recipe[] = [];
  {
    const { data } = await supabase
      .from("recipes_with_stats")
      .select("*")
      .neq("id", recipeId)
      .eq("simulation", recipe.simulation)
      .eq("grain_roughness", recipe.grain_roughness)
      .eq("grain_size", recipe.grain_size)
      .eq("highlight", recipe.highlight)
      .eq("shadow", recipe.shadow)
      .eq("color", recipe.color)
      .eq("sharpness", recipe.sharpness)
      .eq("dynamic_range_development", recipe.dynamic_range_development)
      .order("created_at", { ascending: false })
      .limit(12);
    similarRecipes = data ?? [];
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        {/* Back link */}
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Link>

        {/* Hero: Photo + Meta + Settings side-by-side */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <RecipeHero
            recipe={recipe}
            supabaseUrl={supabaseUrl}
            isFavorited={isFavorited}
            sharerName={sharerName}
          />
          <RecipeSettings recipe={recipe} />
        </div>

        {/* Similar recipes */}
        {similarRecipes.length > 0 && (
          <SimilarRecipes recipes={similarRecipes} supabaseUrl={supabaseUrl} />
        )}
      </div>
    </div>
  );
}
```

> **Note:** The Supabase `.eq()` filter treats NULL values as non-matching by default (SQL `= NULL` is always false). This means if a recipe has `highlight = NULL`, it won't match other recipes with `highlight = NULL`. This is acceptable behavior — recipes with missing fields are treated as unique. If exact NULL-matching is needed later, a Supabase RPC function can be added.

**Step 3: Verify the file was created**

Run: `ls app/gallery/\[id\]/page.tsx`
Expected: File exists.

---

### Task 4: Create the RecipeHero client component

**Context:** This component shows the recipe photo, sharer name, camera/lens info, and the favorite button. It's a Client Component because the favorite button needs interactivity.

**Files:**
- Create: `components/recipe-hero.tsx`

**Step 1: Create the component**

Create `components/recipe-hero.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RecipeHeroProps {
  recipe: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    camera_model: string | null;
    lens_model: string | null;
    favorite_count: number;
  };
  supabaseUrl: string;
  isFavorited: boolean;
  sharerName: string | null;
}

export function RecipeHero({
  recipe,
  supabaseUrl,
  isFavorited: initialFavorited,
  sharerName,
}: RecipeHeroProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoriteCount, setFavoriteCount] = useState(recipe.favorite_count);
  const { user } = useUser();
  const { toast } = useToast();

  const thumbnailUrl = recipe.thumbnail_path
    ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${recipe.thumbnail_path}`
    : null;

  const toggleFavorite = async () => {
    if (!user) {
      toast({ description: "Sign in to save favorites" });
      return;
    }

    const supabase = createClient();

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .match({ user_id: user.id, recipe_id: recipe.id });
      setIsFavorited(false);
      setFavoriteCount((c) => c - 1);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, recipe_id: recipe.id });
      setIsFavorited(true);
      setFavoriteCount((c) => c + 1);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Photo */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={recipe.simulation ?? "Recipe photo"}
          className="w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          No image
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {recipe.simulation ?? "Unknown Simulation"}
          </h1>
          {sharerName && (
            <p className="text-sm text-muted-foreground">by {sharerName}</p>
          )}
          {(recipe.camera_model || recipe.lens_model) && (
            <p className="text-xs text-muted-foreground">
              {[recipe.camera_model, recipe.lens_model]
                .filter(Boolean)
                .join(" \u2022 ")}
            </p>
          )}
        </div>
        <button
          onClick={toggleFavorite}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          <Heart
            className={`h-4 w-4 ${
              isFavorited
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground"
            }`}
          />
          <span className="text-muted-foreground">{favoriteCount}</span>
        </button>
      </div>
    </div>
  );
}
```

---

### Task 5: Create the RecipeSettings server component

**Context:** This component displays the recipe settings in a two-column grid, reusing the existing `RecipeItem` component pattern. It's a Server Component (no interactivity needed).

**Files:**
- Create: `components/recipe-settings.tsx`

**Step 1: Create the component**

Create `components/recipe-settings.tsx`:

```tsx
import { RecipeItem } from "@/components/recipe-item";
import { addSign } from "@/lib/utils";

interface RecipeSettingsProps {
  recipe: {
    simulation: string | null;
    dynamic_range_development: number | null;
    grain_roughness: string | null;
    grain_size: string | null;
    color_chrome: string | null;
    color_chrome_fx_blue: string | null;
    wb_type: string | null;
    wb_color_temperature: number | null;
    wb_red: number | null;
    wb_blue: number | null;
    highlight: number | null;
    shadow: number | null;
    color: number | null;
    sharpness: number | null;
    noise_reduction: number | null;
    clarity: number | null;
    bw_adjustment: number | null;
    bw_magenta_green: number | null;
  };
}

export function RecipeSettings({ recipe }: RecipeSettingsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Settings
      </h2>

      {/* Film Simulation separator */}
      {recipe.simulation && (
        <div className="flex items-center justify-between border-b border-dashed border-border pb-4 mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Film Simulation
          </span>
          <span className="font-bold tracking-wide">{recipe.simulation}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4">
        {recipe.dynamic_range_development != null && (
          <RecipeItem
            label="Dynamic Range"
            value={`DR${recipe.dynamic_range_development}`}
          />
        )}
        {recipe.grain_roughness && (
          <RecipeItem
            label="Grain Effect"
            value={`${recipe.grain_roughness}, ${recipe.grain_size ?? ""}`}
          />
        )}
        {recipe.color_chrome && (
          <RecipeItem label="Color Chrome" value={recipe.color_chrome} />
        )}
        {recipe.color_chrome_fx_blue && (
          <RecipeItem
            label="Color Chrome FX"
            value={recipe.color_chrome_fx_blue}
          />
        )}
        {recipe.wb_type && (
          <RecipeItem
            label="White Balance"
            value={
              recipe.wb_color_temperature
                ? `${recipe.wb_color_temperature}K`
                : recipe.wb_type.replace("-", " ")
            }
          />
        )}
        {recipe.wb_type && (
          <RecipeItem
            label="WB Shift"
            value={
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-red-400">
                  R:{addSign(recipe.wb_red ?? 0)}
                </span>
                <span className="font-mono text-xs text-blue-400">
                  B:{addSign(recipe.wb_blue ?? 0)}
                </span>
              </span>
            }
          />
        )}
        {recipe.highlight != null && (
          <RecipeItem label="Highlight Tone" value={recipe.highlight} />
        )}
        {recipe.shadow != null && (
          <RecipeItem label="Shadow Tone" value={recipe.shadow} />
        )}
        {recipe.color != null && (
          <RecipeItem label="Color" value={recipe.color} />
        )}
        {recipe.sharpness != null && (
          <RecipeItem label="Sharpness" value={recipe.sharpness} />
        )}
        {recipe.noise_reduction != null && (
          <RecipeItem label="Noise Reduction" value={recipe.noise_reduction} />
        )}
        {recipe.clarity != null && (
          <RecipeItem label="Clarity" value={recipe.clarity} />
        )}
        {recipe.bw_adjustment != null && (
          <RecipeItem label="BW Adj" value={recipe.bw_adjustment} />
        )}
        {recipe.bw_magenta_green != null && (
          <RecipeItem label="BW M/G" value={recipe.bw_magenta_green} />
        )}
      </div>
    </div>
  );
}
```

---

### Task 6: Create the SimilarRecipes server component

**Context:** This component displays a grid of recipes that share the same core settings as the current recipe. Each card links to its own detail page.

**Files:**
- Create: `components/similar-recipes.tsx`

**Step 1: Create the component**

Create `components/similar-recipes.tsx`:

```tsx
import Link from "next/link";

interface SimilarRecipesProps {
  recipes: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
  }[];
  supabaseUrl: string;
}

export function SimilarRecipes({ recipes, supabaseUrl }: SimilarRecipesProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Same Recipe
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {recipes.map((recipe) => {
          const url = recipe.thumbnail_path
            ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${recipe.thumbnail_path}`
            : null;
          return (
            <Link
              key={recipe.id}
              href={`/gallery/${recipe.id}`}
              className="group relative overflow-hidden rounded-lg bg-muted"
            >
              {url ? (
                <img
                  src={url}
                  alt={recipe.simulation ?? "Recipe"}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Task 7: Update gallery grid to use Link instead of dialog

**Context:** The gallery grid currently opens a `RecipeDetailDialog` on click. We need to replace this with navigation to the new detail page and remove all dialog-related code.

**Files:**
- Modify: `components/gallery-grid.tsx`
- Delete: `components/recipe-detail-dialog.tsx`

**Step 1: Rewrite gallery-grid.tsx**

Replace the entire `components/gallery-grid.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GalleryRecipe {
  id: number;
  simulation: string | null;
  thumbnail_path: string | null;
  favorite_count: number;
}

interface GalleryGridProps {
  recipes: GalleryRecipe[];
  userFavorites: number[];
  supabaseUrl: string;
}

export function GalleryGrid({
  recipes,
  userFavorites,
  supabaseUrl,
}: GalleryGridProps) {
  const [favorites, setFavorites] = useState<Set<number>>(
    new Set(userFavorites)
  );
  const { user } = useUser();
  const { toast } = useToast();

  const getThumbnailUrl = (path: string | null) => {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/thumbnails/${path}`;
  };

  const toggleFavorite = async (recipeId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ description: "Sign in to save favorites" });
      return;
    }

    const supabase = createClient();
    const isFav = favorites.has(recipeId);

    if (isFav) {
      await supabase
        .from("favorites")
        .delete()
        .match({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => new Set(prev).add(recipeId));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {recipes.map((recipe) => {
        const url = getThumbnailUrl(recipe.thumbnail_path);
        return (
          <Link
            key={recipe.id}
            href={`/gallery/${recipe.id}`}
            className="group relative overflow-hidden rounded-lg bg-muted"
          >
            {url ? (
              <img
                src={url}
                alt={recipe.simulation ?? "Recipe"}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
                No image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <p className="text-sm font-semibold">
                {recipe.simulation ?? "Unknown"}
              </p>
            </div>
            <button
              onClick={(e) => toggleFavorite(recipe.id, e)}
              className="absolute right-2 top-2 rounded-full bg-black/30 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Heart
                className={`h-4 w-4 ${
                  favorites.has(recipe.id)
                    ? "fill-white text-white"
                    : "text-white"
                }`}
              />
            </button>
          </Link>
        );
      })}
    </div>
  );
}
```

Key changes from existing code:
- Removed `RecipeDetailDialog` import and `selectedRecipe` state
- Each card is now a `<Link>` instead of a `<div>` with `onClick`
- Favorite button uses `e.preventDefault()` to avoid navigation
- `GalleryRecipe` interface simplified (only needs fields displayed in grid)

**Step 2: Delete the recipe detail dialog**

Run: `rm components/recipe-detail-dialog.tsx`

**Step 3: Verify no remaining imports of deleted file**

Search for any remaining imports of `recipe-detail-dialog`:

Run: `grep -r "recipe-detail-dialog" --include="*.tsx" --include="*.ts" .`
Expected: No matches (the only consumer was `gallery-grid.tsx`, now updated).

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add components/gallery-grid.tsx app/gallery/\[id\]/page.tsx components/recipe-hero.tsx components/recipe-settings.tsx components/similar-recipes.tsx
git rm components/recipe-detail-dialog.tsx
git commit -m "feat: add recipe detail page, replace gallery dialog with page navigation"
```

---

### Task 8: Handle profiles table (if it doesn't exist)

**Context:** The detail page queries a `profiles` table for sharer display names. If this table doesn't exist yet, we need to handle it gracefully. Check Supabase for the table.

**Files:**
- Modify: `app/gallery/[id]/page.tsx` (only if `profiles` table doesn't exist)

**Step 1: Check if profiles table exists**

In Supabase SQL Editor, run:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'profiles'
);
```

**Step 2a: If `profiles` exists** — no changes needed, Task complete.

**Step 2b: If `profiles` does NOT exist** — update the page to use `auth.users` metadata instead:

Replace the sharer profile fetch block in `app/gallery/[id]/page.tsx`:

```typescript
// Fetch sharer info from auth user metadata
let sharerName: string | null = null;
if (recipe.user_id) {
  const { data } = await supabase.auth.admin.getUserById(recipe.user_id);
  sharerName = data?.user?.user_metadata?.full_name
    ?? data?.user?.user_metadata?.name
    ?? data?.user?.email
    ?? null;
}
```

> **Important:** `auth.admin` requires the service role key. If not available on the server client, an alternative is to fall back to showing "Anonymous" for all users. In that case, simply remove the profile fetch block and set `sharerName = null`.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 9: End-to-end manual test

**Context:** Verify the complete flow works: gallery → recipe detail page → similar recipes → back to gallery.

**Files:** None (manual testing)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test gallery → detail page navigation**

1. Navigate to `http://localhost:3000/gallery`
2. Click on any recipe card
3. Verify: URL changes to `/gallery/[id]`
4. Verify: Photo displayed on left, settings on right (desktop) or stacked (mobile)
5. Verify: Back to Gallery link works

**Step 3: Test recipe detail page content**

1. Verify: Film simulation name displayed as heading
2. Verify: Camera/lens info shown (if data exists, hidden if not)
3. Verify: Sharer name shown (or hidden if none)
4. Verify: All recipe settings displayed correctly
5. Verify: Favorite button works (toggle on/off)

**Step 4: Test similar recipes section**

1. If similar recipes exist: verify grid shows at bottom
2. If no similar recipes: verify section is hidden
3. Click a similar recipe: verify navigation to its detail page

**Step 5: Test edge cases**

1. Navigate to `/gallery/99999` (non-existent ID) — should show 404
2. Navigate to `/gallery/abc` (invalid ID) — should show 404
3. Recipe with no thumbnail — should show placeholder

**Step 6: Test mobile layout**

1. Resize browser to mobile width
2. Verify: Photo stacks above settings (not side-by-side)

**Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add DB columns | Supabase SQL only |
| 2 | Update share-recipe for camera/lens | `share-recipe.ts`, `recipe-card.tsx`, `app/page.tsx` |
| 3 | Create detail page (Server Component) | `app/gallery/[id]/page.tsx` |
| 4 | Create RecipeHero (Client Component) | `components/recipe-hero.tsx` |
| 5 | Create RecipeSettings (Server Component) | `components/recipe-settings.tsx` |
| 6 | Create SimilarRecipes (Server Component) | `components/similar-recipes.tsx` |
| 7 | Update gallery grid + delete dialog | `gallery-grid.tsx`, delete `recipe-detail-dialog.tsx` |
| 8 | Handle profiles table | `app/gallery/[id]/page.tsx` (conditional) |
| 9 | End-to-end manual test | None |
