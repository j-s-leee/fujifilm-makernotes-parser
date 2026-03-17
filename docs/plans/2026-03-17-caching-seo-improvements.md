# Caching & SEO Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Vercel fluid active CPU time through aggressive caching and eliminate unnecessary API calls; improve SEO through robots/sitemap fixes and human-readable slug URLs for recipes.

**Architecture:** Three independent PRs. PR1 optimizes server-side rendering by fixing an ISR bug, increasing revalidation periods, and inlining recipe settings data. PR2 fixes robots.txt and sitemap.xml issues. PR3 introduces `/recipes/[slug]-[id]` URL pattern with DB migration, routing changes, and 301 redirects from old URLs.

**Tech Stack:** Next.js 15 (App Router, ISR), Supabase (Postgres), Cloudflare R2/CDN, next-intl

---

## PR 1: Reduce Vercel CPU Time (Phase A)

### Task 1: Fix Home Page ISR Bug + Increase Revalidation Periods

**Problem:** The home page (`app/[locale]/page.tsx:15`) uses `createClient()` which calls `cookies()`, opting the page into dynamic rendering despite `revalidate = 3600`. Every request hits the server. Additionally, revalidation periods across the site are too short for content that rarely changes.

**Files:**
- Modify: `app/[locale]/page.tsx:2,15` (fix ISR bug)
- Modify: `app/[locale]/recipes/[id]/page.tsx:23` (increase revalidation)
- Modify: `app/[locale]/u/[identifier]/page.tsx` (increase revalidation)
- Modify: `next.config.ts:14-51` (update CDN cache headers)

**Step 1: Fix home page ISR bug**

In `app/[locale]/page.tsx`, change:
```typescript
// Line 2: Change import
import { createClient } from "@/lib/supabase/server";
// TO:
import { createStaticClient } from "@/lib/supabase/server";
```

```typescript
// Line 15: Change client usage
const supabase = await createClient();
// TO:
const supabase = createStaticClient();
```

> Note: `get_trending_recipes` is a public RPC that doesn't require auth context. `createStaticClient()` does not call `cookies()`, so the page stays ISR-eligible.

**Step 2: Increase revalidation periods**

Recipe detail `app/[locale]/recipes/[id]/page.tsx:23`:
```typescript
// FROM:
export const revalidate = 300;
// TO:
export const revalidate = 86400; // 24 hours — recipe content never changes after creation
```

Home page `app/[locale]/page.tsx:6`:
```typescript
// FROM:
export const revalidate = 3600;
// TO:
export const revalidate = 43200; // 12 hours — trending updates are not time-critical
```

User profile (find the revalidate export in `app/[locale]/u/[identifier]/page.tsx`):
```typescript
// FROM:
export const revalidate = 60;
// TO:
export const revalidate = 3600; // 1 hour — profile content changes infrequently
```

**Step 3: Update CDN cache headers in next.config.ts**

Match CDN-Cache-Control headers to the new revalidation periods:

```typescript
// next.config.ts headers()
{
  // Recipe detail
  source: "/:locale*/recipes/:id(\\d+)",
  headers: [{
    key: "CDN-Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=172800", // 24h + 48h stale
  }],
},
{
  // User profile
  source: "/:locale*/u/:identifier*",
  headers: [{
    key: "CDN-Cache-Control",
    value: "public, max-age=3600, stale-while-revalidate=7200", // 1h + 2h stale
  }],
},
// Category pages: keep existing 3600s (already reasonable)
// SEO files: keep existing 86400s
```

**Step 4: Verify**

- Run `npm run build` — no errors
- Run `npm run dev`, navigate to home page, check Network tab: response should NOT have `set-cookie` header (confirms ISR works)
- Check recipe detail page: `x-nextjs-cache` header should show `HIT` on second request

**Step 5: Commit**

```bash
git add app/[locale]/page.tsx app/[locale]/recipes/[id]/page.tsx app/[locale]/u/[identifier]/page.tsx next.config.ts
git commit -m "perf: fix home page ISR bug and increase revalidation periods

Home page was using createClient() which calls cookies(), breaking ISR.
Switched to createStaticClient(). Increased revalidation from 5min to 24h
for recipes, 1min to 1h for profiles, 1h to 12h for home."
```

---

### Task 2: Inline Recipe Settings in Detail Page

**Problem:** Recipe detail page renders with RECIPE_HERO_SELECT (15 fields), then when the user clicks "View Recipe Settings", a separate API call to `/api/recipes/[id]/settings` fetches 20 more fields. Since recipe settings never change, they should be included in the ISR-cached page to eliminate the extra Vercel function invocation.

**Files:**
- Modify: `app/[locale]/recipes/[id]/page.tsx:9,17` (fetch full data, pass settings prop)
- Modify: `components/recipe-hero.tsx:60-78,80-153,310-331` (accept settings prop, remove API fetch)

**Step 1: Update recipe detail page to fetch RECIPE_DETAIL_SELECT**

In `app/[locale]/recipes/[id]/page.tsx`:

```typescript
// Line 9: Change import
import { RECIPE_HERO_SELECT, GALLERY_SELECT } from "@/lib/queries";
// TO:
import { RECIPE_DETAIL_SELECT, GALLERY_SELECT } from "@/lib/queries";
```

```typescript
// Line 17: Change select
.select(RECIPE_HERO_SELECT)
// TO:
.select(RECIPE_DETAIL_SELECT)
```

**Step 2: Pass settings to RecipeHero**

In the `RecipePage` component, add settings prop:

```typescript
// After constructing sharer (around line 155), build settings object:
const settings = {
  id: recipe.id,
  simulation: recipe.simulation,
  sensor_generation: recipe.sensor_generation,
  dynamic_range_development: recipe.dynamic_range_development,
  grain_roughness: recipe.grain_roughness,
  grain_size: recipe.grain_size,
  color_chrome: recipe.color_chrome,
  color_chrome_fx_blue: recipe.color_chrome_fx_blue,
  wb_type: recipe.wb_type,
  wb_color_temperature: recipe.wb_color_temperature,
  wb_red: recipe.wb_red,
  wb_blue: recipe.wb_blue,
  highlight: recipe.highlight,
  shadow: recipe.shadow,
  color: recipe.color,
  sharpness: recipe.sharpness,
  noise_reduction: recipe.noise_reduction,
  clarity: recipe.clarity,
  bw_adjustment: recipe.bw_adjustment,
  bw_magenta_green: recipe.bw_magenta_green,
};
```

```typescript
// Update RecipeHero usage (around line 190):
<RecipeHero recipe={recipe} settings={settings} sharer={sharer} />
```

**Step 3: Update RecipeHero to accept settings prop and remove API fetch**

In `components/recipe-hero.tsx`:

Add `settings` to the interface:
```typescript
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
  };
  settings: RecipeSettingsRecipe; // NEW
  sharer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}
```

Update the component function signature and remove API fetch state/logic:
```typescript
export function RecipeHero({ recipe, settings, sharer }: RecipeHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // REMOVE: settingsRecipe state
  // REMOVE: settingsLoading state
  // REMOVE: handleOpenSettings function

  // ... keep all other existing logic ...
```

Simplify the settings button (replace lines 311-322):
```typescript
{/* Row 3: View Recipe Settings button */}
<button
  onClick={() => setSettingsOpen(true)}
  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
>
  <NotebookText className="h-4 w-4" />
  {t("viewRecipe")}
</button>
```

Update the modal render (replace lines 325-331):
```typescript
<RecipeSettingsModal
  recipe={settings}
  open={settingsOpen}
  onOpenChange={setSettingsOpen}
/>
```

Also remove the `Loader2` import since it's no longer needed for loading state.

**Step 4: Verify**

- Run `npm run build` — no errors
- Run `npm run dev`, go to `/recipes/1` (any recipe)
- Click "View Recipe Settings" — modal should open instantly with no loading spinner
- Network tab: NO request to `/api/recipes/1/settings`

**Step 5: Commit**

```bash
git add app/[locale]/recipes/[id]/page.tsx components/recipe-hero.tsx
git commit -m "perf: inline recipe settings in detail page SSR

Fetch full recipe data (RECIPE_DETAIL_SELECT) at ISR time instead of
loading settings on-demand via API. Eliminates a Vercel function
invocation per recipe view. Settings modal now opens instantly."
```

---

## PR 2: SEO Fixes (Phase B-1)

### Task 3: Fix robots.txt

**Problem:** The disallow list only covers unprefixed paths (`/profile`, `/login`, etc.) but not Korean locale-prefixed paths (`/ko/profile`, `/ko/login`). Search engines may index these private pages via the `/ko/` prefix.

**Additional check:** Cloudflare may append AI bot rules to the response. Verify by fetching `https://www.film-simulation.site/robots.txt` and comparing with the app's output.

**Recommendation for user (Cloudflare config):** The `film-simulation.site` → `www.film-simulation.site` redirect uses 307 (temporary). For SEO, change this to 301 (permanent) in Cloudflare dashboard.

**Files:**
- Modify: `app/robots.ts`

**Step 1: Update robots.ts to include locale-prefixed disallow paths**

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  const privatePaths = [
    "/api/",
    "/admin/",
    "/profile",
    "/my-recipes",
    "/likes",
    "/bookmarks",
    "/recommend",
    "/login",
  ];

  // Block both default (en) and locale-prefixed paths
  const disallow = [
    ...privatePaths,
    ...privatePaths.map((p) => `/ko${p}`),
  ];

  return {
    // AI training bot blocking is handled by Cloudflare managed robots.txt
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: "https://www.film-simulation.site/sitemap.xml",
  };
}
```

**Step 2: Verify**

- Run `npm run dev`
- Fetch `http://localhost:3000/robots.txt` — confirm `/ko/profile`, `/ko/login`, etc. appear in Disallow
- Also fetch `http://localhost:3000/ko/robots.txt` — should rewrite to same content (middleware handles this)

**Step 3: Commit**

```bash
git add app/robots.ts
git commit -m "fix(seo): add locale-prefixed paths to robots.txt disallow list

Private routes like /profile, /login were only blocked for the default
locale. Korean locale paths (/ko/profile, /ko/login) were exposed to
search engine indexing."
```

---

### Task 4: Improve sitemap.xml

**Problems:**
1. `lastModified: new Date()` makes every URL appear "just modified" on every sitemap generation — misleading for crawlers
2. No `alternates` entries linking locale variants — Google recommends hreflang in sitemap as a signal
3. Recipe pages should include `created_at` as lastModified

**Files:**
- Modify: `app/sitemap.ts`

**Step 1: Add alternates and fix lastModified**

Replace the `localized` helper function and update the data fetching:

```typescript
import type { MetadataRoute } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS } from "@/fujifilm/simulation";
import { ALL_CAMERA_MODELS, SENSOR_GENERATIONS } from "@/fujifilm/cameras";
import { toSlug } from "@/lib/slug";

const BASE_URL = "https://www.film-simulation.site";
const LOCALES = ["en", "ko"] as const;
const DEFAULT_LOCALE = "en";

type Entry = MetadataRoute.Sitemap[number];

/** Build a single sitemap entry with hreflang alternates for all locales. */
function localized(
  path: string,
  opts: {
    priority: number;
    changeFrequency: Entry["changeFrequency"];
    lastModified?: Date;
  },
): Entry {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
    languages[locale] = `${BASE_URL}${prefix}${path}`;
  }
  languages["x-default"] = `${BASE_URL}${path}`;

  return {
    url: `${BASE_URL}${path}`,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();

  const [recipesRes, profilesRes, lensesRes] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, created_at")
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("username")
      .not("username", "is", null),
    supabase
      .from("lenses")
      .select("name"),
  ]);

  const recipes = recipesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const lenses = lensesRes.data ?? [];

  // --- Static pages (no lastModified — omit rather than lie) ---
  const staticPages: Entry[] = [
    localized("", { priority: 1.0, changeFrequency: "daily" }),
    localized("/recipes", { priority: 0.9, changeFrequency: "daily" }),
    localized("/privacy", { priority: 0.3, changeFrequency: "yearly" }),
    localized("/terms", { priority: 0.3, changeFrequency: "yearly" }),
  ];

  // --- Category pages ---
  const simulationPages = FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS.map(
    ({ value }) =>
      localized(`/recipes/simulation/${value}`, {
        priority: 0.8,
        changeFrequency: "weekly",
      }),
  );

  const cameraPages = ALL_CAMERA_MODELS.map((model) =>
    localized(`/recipes/camera/${toSlug(model)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const sensorPages = SENSOR_GENERATIONS.map((gen) =>
    localized(`/recipes/sensor/${toSlug(gen)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const lensPages = lenses.map(({ name }) =>
    localized(`/recipes/lens/${toSlug(name)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  // --- Dynamic pages ---
  const recipePages = recipes.map(({ id, created_at }) =>
    localized(`/recipes/${id}`, {
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: created_at ? new Date(created_at) : undefined,
    }),
  );

  const profilePages = profiles.map(({ username }) =>
    localized(`/u/${username}`, {
      priority: 0.6,
      changeFrequency: "weekly",
    }),
  );

  return [
    ...staticPages,
    ...simulationPages,
    ...cameraPages,
    ...sensorPages,
    ...lensPages,
    ...recipePages,
    ...profilePages,
  ];
}
```

**Key changes:**
1. `localized()` now returns **one entry** with `alternates.languages` (hreflang) instead of **two separate entries** per locale. This is the correct way to signal locale variants in sitemaps.
2. `lastModified` is only set when we have real data (`created_at` for recipes). Omitted for static/category pages.
3. Recipes fetch `created_at` in addition to `id`.

**Step 2: Verify**

- Run `npm run dev`
- Fetch `http://localhost:3000/sitemap.xml`
- Confirm each URL has `<xhtml:link rel="alternate" hreflang="en" .../>` and `hreflang="ko"` entries
- Confirm recipe entries have `<lastmod>` with actual dates
- Confirm static pages don't have a misleading `<lastmod>`

**Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "fix(seo): add hreflang alternates to sitemap and fix lastModified

Each sitemap entry now includes alternates for all locales (hreflang).
Previously generated duplicate entries per locale without linking them.
Fixed lastModified to use actual created_at for recipes instead of
current date for all entries."
```

---

## PR 3: Slug URL Implementation (Phase B-2)

### Task 5: Add Slug Column to Database

**Files:**
- Create: `supabase/migrations/20260317000000_recipe_slugs.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- RECIPE SLUGS: Add slug column for SEO-friendly URLs
-- Pattern: /recipes/{slug}-{id} e.g. /recipes/classic-chrome-x-t5-xf35mmf1-4-r-123
-- ============================================================

-- 1. Add slug column (nullable first for safe backfill)
ALTER TABLE public.recipes ADD COLUMN slug text;

-- 2. Backfill slugs from joined reference tables
UPDATE public.recipes r
SET slug = LOWER(TRIM(BOTH '-' FROM
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      CONCAT_WS('-',
        COALESCE(s.slug, ''),
        COALESCE(REGEXP_REPLACE(cm.name, '[^a-zA-Z0-9]+', '-', 'g'), ''),
        COALESCE(REGEXP_REPLACE(l.name, '[^a-zA-Z0-9]+', '-', 'g'), '')
      ),
      '-{2,}', '-', 'g'   -- collapse multiple hyphens
    ),
    '(^-|-$)', '', 'g'    -- trim leading/trailing hyphens
  )
))
FROM public.simulations s
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
WHERE s.id = r.simulation_id;

-- 3. Handle recipes with no simulation (fallback slug)
UPDATE public.recipes
SET slug = 'recipe'
WHERE slug IS NULL OR slug = '';

-- 4. Add NOT NULL constraint after backfill
ALTER TABLE public.recipes ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN slug SET DEFAULT 'recipe';

-- 5. Add slug to recipes_with_stats view
CREATE OR REPLACE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.id,
  r.user_id,
  r.created_at,
  r.thumbnail_path,
  r.blur_data_url,
  r.thumbnail_width,
  r.thumbnail_height,
  r.recipe_hash,
  r.slug,
  s.slug AS simulation,
  r.sensor_generation,
  cm.name AS camera_model,
  l.name AS lens_model,
  wbt.slug AS wb_type,
  r.grain_roughness,
  r.grain_size,
  r.color_chrome,
  r.color_chrome_fx_blue,
  r.dynamic_range_setting,
  r.dynamic_range_development,
  r.wb_color_temperature,
  r.wb_red,
  r.wb_blue,
  r.highlight,
  r.shadow,
  r.color,
  r.sharpness,
  r.noise_reduction,
  r.clarity,
  r.bw_adjustment,
  r.bw_magenta_green,
  r.bookmark_count,
  r.like_count,
  p.display_name AS user_display_name,
  p.username AS user_username,
  p.avatar_path AS user_avatar_path
FROM public.recipes r
LEFT JOIN public.simulations s ON s.id = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
LEFT JOIN public.wb_types wbt ON wbt.id = r.wb_type_id
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.deleted_at IS NULL;
```

> **IMPORTANT:** The `CREATE OR REPLACE VIEW` must include ALL existing columns. Before running, verify the current view definition matches by running:
> ```sql
> SELECT pg_get_viewdef('recipes_with_stats', true);
> ```
> Adjust the view definition to match the existing one, adding only the `r.slug` column.

**Step 2: Test migration on dev DB**

```bash
supabase db push --db-url "$SUPABASE_DEV_DB_URL"
```

Verify:
```sql
SELECT id, slug FROM recipes LIMIT 10;
-- Expected: slugs like "classic-chrome-x-t5-xf35mmf1-4-r"

SELECT id, slug, simulation, camera_model, lens_model FROM recipes_with_stats LIMIT 5;
-- Expected: slug column visible in view output
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260317000000_recipe_slugs.sql
git commit -m "feat(db): add slug column to recipes for SEO-friendly URLs

Adds slug column generated from simulation + camera + lens names.
Backfills all existing recipes. Updates recipes_with_stats view to
expose slug. Pattern: /recipes/{slug}-{id}"
```

---

### Task 6: Create Slug Utility Functions

**Files:**
- Modify: `lib/slug.ts` (add recipe slug utilities)

**Step 1: Add recipe slug generation and URL parsing functions**

Append to `lib/slug.ts`:

```typescript
/**
 * Generate a recipe slug from parsed metadata.
 * Example: simulation="classic-chrome", camera="X-T5", lens="XF35mmF1.4 R"
 * → "classic-chrome-x-t5-xf35mmf1-4-r"
 */
export function generateRecipeSlug(
  simulation: string | null,
  cameraModel: string | null,
  lensModel: string | null,
): string {
  const parts = [simulation, cameraModel, lensModel]
    .filter(Boolean)
    .map((p) => toSlug(p!));

  return parts.join("-") || "recipe";
}

/**
 * Build the full slug-id path segment for a recipe URL.
 * Example: slug="classic-chrome-x-t5", id=123 → "classic-chrome-x-t5-123"
 */
export function buildRecipeSlugId(slug: string, id: number): string {
  return `${slug}-${id}`;
}

/**
 * Extract the numeric recipe ID from a slug-id URL segment.
 * "classic-chrome-x-t5-123" → 123
 * "123" → 123 (backward compatible with old URLs)
 */
export function parseRecipeId(slugId: string): number {
  // Try slug-id pattern: last hyphen-separated numeric segment
  const match = slugId.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  // Fallback: entire string is numeric (old URL format)
  return parseInt(slugId, 10);
}
```

**Step 2: Verify with manual test**

```typescript
// Quick sanity check (run in a test or console):
generateRecipeSlug("classic-chrome", "X-T5", "XF35mmF1.4 R")
// → "classic-chrome-x-t5-xf35mmf1-4-r"

generateRecipeSlug("provia", null, null)
// → "provia"

generateRecipeSlug(null, null, null)
// → "recipe"

parseRecipeId("classic-chrome-x-t5-123")
// → 123

parseRecipeId("123")
// → 123

buildRecipeSlugId("classic-chrome-x-t5", 123)
// → "classic-chrome-x-t5-123"
```

**Step 3: Commit**

```bash
git add lib/slug.ts
git commit -m "feat: add recipe slug generation and URL parsing utilities"
```

---

### Task 7: Update Recipe Detail Page Routing for Slug URLs

**Files:**
- Modify: `app/[locale]/recipes/[id]/page.tsx` (parse slug-id, add canonical redirect)
- Modify: `lib/queries.ts` (add slug to GALLERY_SELECT and RECIPE_HERO_SELECT)

**Step 1: Add slug to query select constants**

In `lib/queries.ts`:

```typescript
export const GALLERY_SELECT =
  "id, user_id, simulation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, bookmark_count, like_count, camera_model, created_at, user_display_name, user_username, user_avatar_path, slug";

export const RECIPE_HERO_SELECT =
  "id, user_id, simulation, sensor_generation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, camera_model, lens_model, bookmark_count, like_count, recipe_hash, user_display_name, user_username, user_avatar_path, slug";

export const RECIPE_DETAIL_SELECT =
  "id, user_id, simulation, sensor_generation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, camera_model, lens_model, bookmark_count, like_count, recipe_hash, dynamic_range_development, grain_roughness, grain_size, color_chrome, color_chrome_fx_blue, wb_type, wb_color_temperature, wb_red, wb_blue, highlight, shadow, color, sharpness, noise_reduction, clarity, bw_adjustment, bw_magenta_green, user_display_name, user_username, user_avatar_path, slug";
```

**Step 2: Update recipe detail page to parse slug-id and redirect to canonical URL**

In `app/[locale]/recipes/[id]/page.tsx`:

Add imports:
```typescript
import { permanentRedirect } from "next/navigation";
import { parseRecipeId, buildRecipeSlugId } from "@/lib/slug";
```

Update `generateMetadata`:
```typescript
export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipeId = parseRecipeId(id);
  if (isNaN(recipeId)) return {};

  const recipe = await getRecipe(recipeId);
  if (!recipe) return {};

  const canonicalSlugId = buildRecipeSlugId(recipe.slug, recipe.id);

  const title = `${recipe.simulation} Recipe`;
  const byName = recipe.user_username
    ? `@${recipe.user_username}`
    : recipe.user_display_name;
  const description = `${recipe.simulation} recipe shot on ${recipe.camera_model ?? "Fujifilm"}${byName ? ` by ${byName}` : ""}`;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const image = recipe.thumbnail_path
    ? `${r2PublicUrl}/${recipe.thumbnail_path}`
    : undefined;

  return {
    title,
    description,
    alternates: getAlternates(`/recipes/${canonicalSlugId}`),
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}
```

Update `RecipePage` component — add canonical redirect near the top:
```typescript
export default async function RecipePage({ params }: RecipePageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const recipeId = parseRecipeId(id);
  if (isNaN(recipeId)) notFound();

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    // ... existing soft-delete check (keep as-is) ...
  }

  // Canonical slug redirect — ensures SEO-friendly URL
  const canonicalSlugId = buildRecipeSlugId(recipe.slug, recipe.id);
  if (id !== canonicalSlugId) {
    permanentRedirect(`/recipes/${canonicalSlugId}`);
  }

  // ... rest of existing render logic ...
```

**Step 3: Update next.config.ts CDN headers to match slug URLs**

The existing pattern `/:locale*/recipes/:id(\\d+)` only matches numeric IDs. Update to also match slug-id pattern:

```typescript
{
  // Recipe detail — match both /recipes/123 and /recipes/slug-123
  source: "/:locale*/recipes/:slugId([\\w-]+-\\d+|\\d+)",
  headers: [{
    key: "CDN-Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=172800",
  }],
},
```

**Step 4: Verify**

- Run `npm run dev`
- Navigate to `/recipes/1` (old format) → should 308 redirect to `/recipes/slug-1`
- Navigate to `/recipes/slug-1` → should render normally
- Navigate to `/recipes/wrong-slug-1` → should redirect to `/recipes/correct-slug-1`
- Check page source: canonical URL should use slug format
- Check hreflang tags in `<head>`: should use slug format

**Step 5: Commit**

```bash
git add app/[locale]/recipes/[id]/page.tsx lib/queries.ts next.config.ts
git commit -m "feat(seo): implement slug-based recipe URLs with canonical redirect

Recipe detail page now parses slug-id from URL (e.g., /recipes/classic-chrome-x-t5-123).
Old numeric URLs (/recipes/123) permanently redirect to the canonical slug URL.
Added slug to all query select constants."
```

---

### Task 8: Update All Recipe Links to Use Slug URLs

**Files:**
- Modify: `components/gallery-card.tsx:114` (gallery links)
- Modify: `components/recipe-hero.tsx:126` (share URL)
- Modify: `components/recipe-settings.tsx:106` (copy URL)
- Modify: `components/upload-recipe-modal.tsx:129` (post-upload redirect)
- Modify: `components/admin-reports-table.tsx:118` (admin link)
- Modify: `lib/share-recipe.ts` (set slug on insert)
- Modify: `components/gallery-card.tsx:20-35` (add slug to GalleryRecipe interface)

**Step 1: Update GalleryRecipe interface and gallery card link**

In `components/gallery-card.tsx`:

Add `slug` to the interface:
```typescript
export interface GalleryRecipe {
  id: number;
  user_id: string;
  simulation: string | null;
  thumbnail_path: string | null;
  blur_data_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  bookmark_count: number;
  like_count: number;
  camera_model: string | null;
  created_at: string | null;
  user_display_name: string | null;
  user_username: string | null;
  user_avatar_path: string | null;
  slug: string; // NEW
}
```

Update the link (line 114):
```typescript
href={`/recipes/${recipe.slug}-${recipe.id}`}
```

**Step 2: Update share URLs in recipe-hero.tsx and recipe-settings.tsx**

In `components/recipe-hero.tsx` line 126:
```typescript
const handleShare = async () => {
  const url = `${window.location.origin}/recipes/${recipe.slug}-${recipe.id}`;
  // ... rest unchanged ...
};
```

> Note: `recipe-hero.tsx` also needs `slug` in its recipe interface. Since Task 2 already changed the page to use RECIPE_DETAIL_SELECT (which includes slug), add `slug: string;` to the RecipeHeroProps.recipe interface.

In `components/recipe-settings.tsx` line 106:
```typescript
const url = `${window.location.origin}/recipes/${recipe.slug}-${recipe.id}`;
```

> Note: `RecipeSettingsRecipe` interface also needs `slug: string;` added.

**Step 3: Update upload redirect**

In `components/upload-recipe-modal.tsx` line 129:
```typescript
// After successful upload, we get recipeId but no slug yet.
// Two options:
// A) Generate slug client-side and redirect (requires slug generation in browser)
// B) Redirect to numeric URL, let server redirect to slug URL
//
// Option B is simpler and only costs one redirect for the uploader:
router.push(`/recipes/${result.recipeId}`);
// This will be redirected by the server to /recipes/slug-recipeId
```

Keep as-is for simplicity. The server-side redirect handles it.

**Step 4: Update share-recipe.ts to generate slug on insert**

In `lib/share-recipe.ts`:

Add import:
```typescript
import { generateRecipeSlug } from "@/lib/slug";
```

Before the insert (around line 66), generate the slug:
```typescript
const simulationSlug = simulation ?? null;
const slug = generateRecipeSlug(simulationSlug, normalizedCamera, lensModel ?? null);
```

Add `slug` to the insert object (around line 68):
```typescript
const { data: inserted, error: insertError } = await supabase.from("recipes").insert({
  user_id: user.id,
  slug, // NEW
  simulation_id: simulationId,
  // ... rest unchanged ...
}).select("id").single();
```

**Step 5: Update admin reports table link**

In `components/admin-reports-table.tsx` line 118:
```typescript
// Admin links can keep using numeric IDs (they'll redirect):
href={`/recipes/${report.recipe_id}`}
// OR if recipe data includes slug, use it. Keep as-is for simplicity.
```

**Step 6: Verify**

- Run `npm run build` — no TypeScript errors
- Navigate galleries: recipe cards should link to `/recipes/slug-123` format
- Share button: copied URL should be slug format
- Recipe settings copy: URL should be slug format
- Upload a new recipe: should redirect and end up at slug URL

**Step 7: Commit**

```bash
git add components/gallery-card.tsx components/recipe-hero.tsx components/recipe-settings.tsx components/upload-recipe-modal.tsx lib/share-recipe.ts
git commit -m "feat(seo): update all recipe links to use slug URLs

Gallery cards, share button, copy recipe, and new recipe insert now use
/recipes/{slug}-{id} format. Upload redirect uses numeric ID (server
redirects to canonical slug URL). Admin links unchanged (redirect handles it)."
```

---

### Task 9: Update Sitemap for Slug URLs

**Files:**
- Modify: `app/sitemap.ts` (fetch slug, use in URLs)

**Step 1: Update sitemap to use slug URLs**

Change the recipes query to include slug:
```typescript
supabase
  .from("recipes")
  .select("id, slug, created_at")
  .is("deleted_at", null),
```

Update recipe page URL generation:
```typescript
const recipePages = recipes.map(({ id, slug, created_at }) =>
  localized(`/recipes/${slug}-${id}`, {
    priority: 0.7,
    changeFrequency: "monthly",
    lastModified: created_at ? new Date(created_at) : undefined,
  }),
);
```

**Step 2: Verify**

- Run `npm run dev`
- Fetch `http://localhost:3000/sitemap.xml`
- Recipe URLs should be in `slug-id` format (e.g., `classic-chrome-x-t5-123`)

**Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): use slug URLs in sitemap

Recipe entries now use /recipes/{slug}-{id} format instead of /recipes/{id}.
Improves search engine understanding of page content from URL structure."
```

---

## Deployment Order

### PR 1 (Caching):
1. Merge to main → Vercel deploys automatically
2. Monitor Vercel dashboard for CPU time reduction

### PR 2 (SEO Fixes):
1. Merge to main → Vercel deploys automatically
2. Verify via Google Search Console: submit updated sitemap, check indexing
3. Check Naver Search Advisor: verify robots.txt, sitemap processing

### PR 3 (Slug URLs):
**DB first, code second** (per CLAUDE.md deployment rules):
1. Apply migration to prod DB: `supabase db push`
2. Verify migration: `SELECT id, slug FROM recipes LIMIT 10;`
3. Merge PR to main → Vercel deploys
4. Verify: old URLs redirect, new URLs work, sitemap uses slugs
5. Submit updated sitemap to Google Search Console and Naver Search Advisor

### Post-Deployment Verification:
- [ ] Cloudflare: Change 307 → 301 redirect for `film-simulation.site` → `www.film-simulation.site`
- [ ] Google Search Console: Check for crawl errors after slug URL change
- [ ] Naver Search Advisor: Verify sitemap processing and indexing
- [ ] Vercel Dashboard: Monitor Active CPU Time metric over 48 hours

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Home page | Dynamic render (broken ISR) | Proper ISR, 12h revalidation |
| Recipe detail | 5min ISR + API call for settings | 24h ISR, settings inlined |
| User profile | 1min ISR | 1h ISR |
| robots.txt | Missing `/ko/*` private paths | All locales blocked |
| sitemap.xml | Duplicate entries, fake lastModified | hreflang alternates, real dates |
| Recipe URLs | `/recipes/123` | `/recipes/classic-chrome-x-t5-123` |
| Old recipe URLs | N/A | 308 permanent redirect to slug URL |
