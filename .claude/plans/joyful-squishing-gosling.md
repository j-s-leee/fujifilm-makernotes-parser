# Performance Optimization: ISR + Likes/Bookmarks Separation

## Context

All pages are fully dynamic with zero caching. Recipe data and user-specific data (likes/bookmarks) are mixed in server components, preventing ISR. Every page load triggers multiple Supabase queries including auth checks, even for anonymous users.

**Goal:** Separate user-specific interactions from recipe data so public pages can use ISR, and reduce redundant queries.

## Architecture

**Before:** Server component fetches recipes + user bookmarks/likes → passes everything as props to client component.

**After:** Server component fetches only recipe data (ISR cacheable) → client component fetches user's bookmark/like state independently via a shared context.

## Changes

### 1. UserInteractionsProvider (Context)

**New file:** `contexts/user-interactions-context.tsx`

- Wraps app in `layout.tsx`
- On mount, if user is authenticated, fetches all their bookmark IDs and like IDs in parallel (2 queries)
- Provides: `bookmarks: Set<number>`, `likes: Set<number>`, `likeCounts: Map<number, number>`
- Provides: `toggleBookmark(id)`, `toggleLike(id, currentCount)` — update both DB and local state
- Provides: `isLoaded: boolean` for loading states
- Updates `likeCounts` from initialRecipes when new recipes are rendered (merge function)
- Replaces the duplicated toggle logic in `gallery-grid.tsx`, `grouped-recipe-grid.tsx`, `recipe-hero.tsx`

### 2. Refactor client components to use context

**Files to modify:**

- `components/gallery-grid.tsx`
  - Remove: `userBookmarks`, `userLikes` props and internal state
  - Remove: `toggleBookmark`, `toggleLike` functions
  - Use: `useUserInteractions()` context for bookmark/like state and toggles
  - Keep: infinite scroll, recipe state, filter logic

- `components/grouped-recipe-grid.tsx`
  - Same changes as gallery-grid
  - Remove: `userBookmarks`, `userLikes` props and internal state
  - Use context for interactions

- `components/recipe-hero.tsx`
  - Remove: `isBookmarked`, `isLiked` props
  - Remove: internal state and toggle functions
  - Use context: `bookmarks.has(recipe.id)`, `likes.has(recipe.id)`, `toggleLike`, `toggleBookmark`

### 3. Remove user queries from server pages

**Files to modify:**

- `app/gallery/page.tsx`
  - Remove: `supabase.auth.getUser()` (lines 50-52)
  - Remove: bookmark/like queries (lines 54-68)
  - Remove: `userBookmarks`, `userLikes` props from `<GalleryGrid>`
  - Keep: recipe query, simulation filter query, camera model query

- `app/gallery/[id]/page.tsx`
  - Remove: `supabase.auth.getUser()` (lines 32-34)
  - Remove: bookmark/like queries (lines 36-54)
  - Remove: `isBookmarked`, `isLiked` props from `<RecipeHero>`
  - Add: `export const revalidate = 60`

- `app/my-recipes/[id]/page.tsx`
  - Same changes as gallery/[id]
  - Add: `export const revalidate = 60`

- `app/bookmarks/page.tsx`
  - Keep: server-side auth check (page is user-specific, no ISR)
  - Remove: `userBookmarks`, `userLikes` props from `<GroupedRecipeGrid>`

- `app/likes/page.tsx`
  - Same as bookmarks

- `app/my-recipes/page.tsx`
  - Keep: server-side auth check
  - Remove: `userBookmarks`, `userLikes` props from `<GroupedRecipeGrid>`

### 4. ISR directives

| Page | `revalidate` | Reason |
|------|-------------|--------|
| `app/gallery/[id]/page.tsx` | 60 | Individual recipe detail — most impactful |
| `app/my-recipes/[id]/page.tsx` | 60 | Same recipe detail view |
| `app/stats/page.tsx` | 3600 | Aggregate data, rarely changes |

Note: `app/gallery/page.tsx` uses `searchParams` which makes it dynamic in Next.js — ISR not applicable there. But removing auth queries still reduces server-side latency.

### 5. Stats page: server-side aggregation

**File:** `app/stats/page.tsx`

Current: fetches ALL recipes, counts in JS.
After: Use Supabase `.select('simulation')` with `.csv()` or just keep current approach — data volume is small enough. Add `revalidate = 3600` to cache it.

### 6. On-demand revalidation

**File:** `lib/share-recipe.ts` (or wherever recipes are created)

After recipe upload, call `revalidatePath('/gallery')` to bust gallery cache.
Not strictly necessary with time-based ISR but improves freshness.

## File Summary

| Action | File |
|--------|------|
| Create | `contexts/user-interactions-context.tsx` |
| Modify | `app/layout.tsx` — wrap with `UserInteractionsProvider` |
| Modify | `components/gallery-grid.tsx` — remove bookmark/like state, use context |
| Modify | `components/grouped-recipe-grid.tsx` — same |
| Modify | `components/recipe-hero.tsx` — same |
| Modify | `app/gallery/page.tsx` — remove user queries |
| Modify | `app/gallery/[id]/page.tsx` — remove user queries, add ISR |
| Modify | `app/my-recipes/[id]/page.tsx` — same |
| Modify | `app/bookmarks/page.tsx` — remove interaction props |
| Modify | `app/likes/page.tsx` — same |
| Modify | `app/my-recipes/page.tsx` — same |
| Modify | `app/stats/page.tsx` — add ISR |

## Verification

1. `npm run build` — no type errors
2. Gallery page loads without auth queries in server logs
3. `/gallery/[id]` returns cached response on second load (check `x-nextjs-cache` header)
4. Like/bookmark buttons still work (context provides toggle functions)
5. Bookmark/like state persists across page navigation (context is app-level)
6. Stats page caches for 1 hour
