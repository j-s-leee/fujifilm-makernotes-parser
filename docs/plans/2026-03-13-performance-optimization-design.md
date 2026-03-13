# Performance Optimization Design

**Date:** 2026-03-13
**Status:** Approved
**Goal:** Fix underperforming Core Web Vitals across desktop and mobile

## Current Metrics (p75)

| Metric | Desktop | Mobile | Target |
|--------|---------|--------|--------|
| TTFB | 2.66s (poor) | 0.31s (good) | <1s |
| FCP | 2.94s (poor) | 6.21s (poor) | <2.5s |
| LCP | 4.32s (poor) | 6.29s (poor) | <2.5s |
| INP | 8ms (good) | 744ms (poor) | <200ms |
| CLS | 0 (good) | 0 (good) | <0.1 |

## Root Causes

**Desktop (TTFB-driven):**
- Vercel cold starts + Supabase query latency on ISR cache misses
- Sequential queries on recipe detail page (main recipe, then similar recipes)
- Recipe detail fetches 31 fields when only ~11 are needed for initial render

**Mobile (client-JS-driven):**
- 38 "use client" components creating heavy JS bundle
- Global context providers (UserInteractions, Collections) block first paint with Supabase queries on mount
- Duplicate LoginPromptModal in both layout.tsx and header.tsx
- 38 hidden BookmarkPopover instances in DOM (one per gallery card)
- GalleryCard renders duplicate mobile/desktop HTML (showing/hiding via CSS)
- Context re-render cascade: toggling one card's like re-renders all cards
- mergeLikeCounts called via useEffect triggers context-wide re-render

---

## Phase 1: Targeted Metric Fixes

Ship first. Minimum code changes, maximum metric impact.

### 1.1 Desktop TTFB (2.66s -> <1s)

**Preconnect hints:**
- Add `<link rel="preconnect">` in root layout for Supabase and R2 CDN domains
- Saves ~100-200ms on connection setup

**Increase ISR revalidation:**
- Recipe detail: 60s -> 300s (5min) for higher cache hit rate
- Recipe data doesn't change fast enough to justify 1-minute revalidation

**Parallelize recipe detail queries:**
- Main recipe query and similar recipes query currently run sequentially
- Wrap in `Promise.all()` — they're independent
- Saves ~200-400ms server time

**Split RECIPE_DETAIL_SELECT:**
- Fetch only ~11 hero fields server-side (id, simulation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, camera_model, lens_model, sensor_generation, user_display_name, user_username, user_avatar_path)
- Load 20 settings fields lazily when RecipeSettingsModal opens (client-side fetch on demand)
- Reduces initial query payload significantly

### 1.2 Mobile FCP (6.21s -> <2.5s)

**Dynamic import heavy modals:**
- `UploadRecipeModal` (~275 lines) loaded on every page via header
- `LoginPromptModal` loaded on every page
- Use `next/dynamic` with `ssr: false` — only load when opened
- Saves ~80-120KB from initial bundle

**Remove duplicate LoginPromptModal:**
- Currently rendered in both `layout.tsx` and `header.tsx`
- Keep only one instance in the appropriate location

**Defer context provider initialization:**
- `UserInteractionsProvider` fires two Supabase queries (bookmarks + likes) on mount, blocking paint
- Defer fetches until after first paint using `requestIdleCallback` or idle `useEffect`
- UI renders with empty Sets initially, populates when data arrives
- `CollectionsProvider` fetch deferred similarly

### 1.3 Mobile INP (744ms -> <200ms)

**Lazy-load BookmarkPopover:**
- 38 popover instances currently exist in DOM (one per card, hidden)
- Use `next/dynamic` to load only when folder icon is clicked
- Removes ~38 hidden DOM trees

**Stabilize context callbacks:**
- `toggleLike` and `toggleBookmark` cause re-renders across all cards
- Ensure stable function references via `useCallback` with minimal dependencies
- Consider `useRef` for internal state to avoid dependency changes

**Batch mergeLikeCounts:**
- `TrendingGrid` and `SimilarRecipesSection` call `mergeLikeCounts` in `useEffect`
- Updates Map state, triggering context re-render of all consumers
- Move like counts to a ref-based store or batch updates

**Remove GalleryCard duplicate HTML:**
- Currently renders both mobile and desktop UI in same DOM (show/hide via CSS)
- Use single responsive layout to cut DOM nodes per card in half

---

## Phase 2: Client Bundle Overhaul

Ship after Phase 1 metrics are validated.

### 2.1 GalleryCard Hybrid Component

- Make card body a server component (image, title, metadata)
- Wrap only interactive parts in `<CardActions recipeId={id} />` client component
- Removes context consumption from card rendering path

### 2.2 Page-Level Context Providers

- Move `UserInteractionsProvider` and `CollectionsProvider` from root layout to only pages that need them
- Pages like `/privacy`, `/terms`, `/login` don't need these contexts
- Reduces unnecessary initialization and bundle on simple pages

### 2.3 Code-Split Recipe Filters

- `RecipeFilters` renders 50-60 filter buttons
- Use `next/dynamic` to load only on `/recipes` page
- Not needed in main bundle

### 2.4 Header Server/Client Split

- Server-rendered shell: logo, nav links (renders instantly)
- Client-only `<HeaderActions />` island: avatar, upload button, mobile menu
- Shell renders on first paint; actions hydrate after

---

## Measurement Plan

- Measure before/after each phase using Vercel Speed Insights
- Monitor per-route breakdowns, not just site-wide averages
- Target metrics: TTFB <1s, FCP <2.5s, LCP <2.5s, INP <200ms
- Allow 48-72 hours of data collection between phases for reliable comparison

## Files Affected

### Phase 1
- `app/layout.tsx` — preconnect hints, remove duplicate modal
- `app/recipes/[id]/page.tsx` — parallelize queries, split select
- `components/header.tsx` — dynamic import modals
- `contexts/user-interactions-context.tsx` — defer initialization, stabilize callbacks
- `contexts/collections-context.tsx` — defer initialization
- `components/gallery-card.tsx` — lazy BookmarkPopover, remove duplicate HTML
- `components/trending-grid.tsx` — batch mergeLikeCounts
- `lib/queries.ts` — add RECIPE_HERO_SELECT constant

### Phase 2
- `components/gallery-card.tsx` — server/client split
- `app/layout.tsx` — remove context providers
- Per-page layouts — add context providers where needed
- `components/header.tsx` — server/client split
- `components/recipe-filters.tsx` — dynamic import wrapper
