# Recipe Detail Page Design

**Date:** 2026-02-26
**Status:** Approved

## Goal

Replace the gallery recipe detail dialog with a dedicated page at `/gallery/[id]`. The page displays the recipe photo alongside settings in a side-by-side layout, adds camera/lens and sharer info, and shows other photos using the same recipe.

## Approach

Server Component page (`app/gallery/[id]/page.tsx`), consistent with existing gallery patterns. Interactive elements (favorite button) extracted as Client Components.

## Routing & Data

**Route:** `app/gallery/[id]/page.tsx`

**Data queries (server-side):**

1. **Recipe detail** — `recipes_with_stats` by ID, joined with user profile for sharer display name/avatar
2. **Camera/lens info** — New `camera_model` and `lens_model` columns on `recipes` table, extracted from EXIF at upload time
3. **Same recipe photos** — Match on 8 core fields (simulation, grain_roughness, grain_size, highlight, shadow, color, sharpness, dynamic_range_development), limit 12

## Page Layout

### Desktop (md+): Side-by-side

```
┌──────────────────────────────────────┐
│ ◀ Back to Gallery                    │
│                                      │
│ ┌──────────────┐  Classic Chrome     │
│ │              │  by @username        │
│ │    PHOTO     │  X-T5 • XF35mmF1.4  │
│ │              │  ♥ 42               │
│ │              │                      │
│ │              │  ── Settings ──      │
│ │              │  Film Sim  CC        │
│ └──────────────┘  DR       200       │
│                   Grain    Weak,Sm   │
│                   HL/SH    +1 / -2   │
│                   Color    +2        │
│                   Sharp    -1        │
│                   WB       5200K     │
│                   WB Shift R:+2 B:-3 │
│                   ...                │
│                                      │
│ ── Same Recipe ──                    │
│ [img] [img] [img] [img] [img]       │
└──────────────────────────────────────┘
```

### Mobile (<md): Vertical stack

Photo (full width) → meta info → settings → same recipe grid.

## Component Structure

```
app/gallery/[id]/page.tsx          (Server Component - data fetch, 404 handling)
├── components/recipe-hero.tsx      (Client - photo + meta + favorite button)
├── components/recipe-settings.tsx  (Server - settings table/grid)
└── components/similar-recipes.tsx  (Server - same-recipe photo grid)
```

## DB Schema Changes

```sql
ALTER TABLE recipes ADD COLUMN camera_model TEXT;
ALTER TABLE recipes ADD COLUMN lens_model TEXT;
```

Update `recipes_with_stats` view to include these columns.

Update `share-recipe.ts` to extract `Make + Model` and `LensModel` from EXIF during upload.

## "Same Recipe" Matching Logic

Match on 8 core recipe fields using `IS NOT DISTINCT FROM` for correct NULL handling:

- simulation
- grain_roughness
- grain_size
- highlight
- shadow
- color
- sharpness
- dynamic_range_development

Query excludes current recipe ID, ordered by `created_at DESC`, limit 12. Section hidden if no matches found.

## Gallery Grid Changes

- Replace `onClick` dialog trigger with `<Link href={/gallery/${id}}>` on each card
- Remove `RecipeDetailDialog` component and related state from `gallery-grid.tsx`
- Keep favorite button on gallery grid cards (hover interaction)
- Delete `components/recipe-detail-dialog.tsx`

## Error Handling

- Non-existent ID → `notFound()` (Next.js 404 page)
- Missing sharer info → "Anonymous"
- Missing camera/lens (existing data) → hide that section
- Missing thumbnail → placeholder display
