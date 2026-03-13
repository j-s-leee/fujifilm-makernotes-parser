# Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix underperforming Core Web Vitals — desktop TTFB (2.66s), mobile FCP (6.21s), mobile INP (744ms) — through targeted code changes across two phases.

**Architecture:** Phase 1 makes surgical changes to existing files (dynamic imports, deferred context init, query parallelization, ISR tuning). Phase 2 restructures component boundaries to reduce client JS. Each task is independently shippable.

**Tech Stack:** Next.js 15 (App Router), React Server Components, `next/dynamic`, Supabase client

---

## Phase 1: Targeted Metric Fixes

### Task 1: Add preconnect hints to root layout

**Files:**
- Modify: `app/layout.tsx:56` (inside `<html>` tag)

**Step 1: Add preconnect link tags**

Add `<head>` with preconnect hints for R2 CDN. The Supabase URL is only used client-side so we focus on the image CDN which is the LCP bottleneck.

In `app/layout.tsx`, add inside the `<html>` tag, before `<body>`:

```tsx
<head>
  <link
    rel="preconnect"
    href={process.env.NEXT_PUBLIC_R2_PUBLIC_URL}
    crossOrigin="anonymous"
  />
</head>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "perf: add preconnect hint for R2 CDN"
```

---

### Task 2: Increase recipe detail ISR revalidation

**Files:**
- Modify: `app/recipes/[id]/page.tsx:21`

**Step 1: Change revalidate from 60 to 300**

In `app/recipes/[id]/page.tsx`, change line 21:

```typescript
// Before
export const revalidate = 60;

// After
export const revalidate = 300;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/recipes/[id]/page.tsx
git commit -m "perf: increase recipe detail ISR to 5min for better cache hit rate"
```

---

### Task 3: Remove duplicate LoginPromptModal

The `LoginPromptModal` is rendered in two places:
1. `components/header.tsx:293-299` — triggered by nav button clicks
2. `contexts/user-interactions-context.tsx:280-286` — triggered by like/bookmark on logged-out users

Both serve different purposes (different triggers) so both are needed. There is NO actual duplication — each handles a different login prompt flow. **Skip this task.**

**Correction:** After re-reading the code, the Header renders its own `LoginPromptModal` for nav prompts (`header.tsx:293`), and the UserInteractionsProvider renders one for bookmark/like prompts (`user-interactions-context.tsx:280`). These are separate modals with separate `open` state — they don't conflict. No change needed here.

---

### Task 4: Dynamic import UploadRecipeModal in Header

**Files:**
- Modify: `components/header.tsx:27,186-189`

**Step 1: Replace static import with dynamic import**

In `components/header.tsx`:

Remove the static import (line 27):
```typescript
// Remove this line
import { UploadRecipeModal } from "@/components/upload-recipe-modal";
```

Add dynamic import at the top of the file (after other imports):
```typescript
import dynamic from "next/dynamic";

const UploadRecipeModal = dynamic(
  () => import("@/components/upload-recipe-modal").then((m) => m.UploadRecipeModal),
  { ssr: false }
);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. UploadRecipeModal is now in a separate chunk.

**Step 3: Verify functionality**

Run: `npm run dev`
- Click the "Scan" button in the header
- Verify the upload modal still opens and works

**Step 4: Commit**

```bash
git add components/header.tsx
git commit -m "perf: dynamic import UploadRecipeModal to reduce initial bundle"
```

---

### Task 5: Dynamic import LoginPromptModal in Header

**Files:**
- Modify: `components/header.tsx:28-31`

**Step 1: Replace static import with dynamic import**

In `components/header.tsx`:

Remove the static import:
```typescript
// Remove these lines
import {
  LoginPromptModal,
  type LoginFeature,
} from "@/components/login-prompt-modal";
```

Add dynamic import and keep the type import:
```typescript
import type { LoginFeature } from "@/components/login-prompt-modal";

const LoginPromptModal = dynamic(
  () => import("@/components/login-prompt-modal").then((m) => m.LoginPromptModal),
  { ssr: false }
);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/header.tsx
git commit -m "perf: dynamic import LoginPromptModal in header"
```

---

### Task 6: Dynamic import LoginPromptModal in UserInteractionsProvider

**Files:**
- Modify: `contexts/user-interactions-context.tsx:17-18`

**Step 1: Replace static import with dynamic import**

In `contexts/user-interactions-context.tsx`:

Remove the static import:
```typescript
// Remove these lines
import {
  LoginPromptModal,
  type LoginFeature,
} from "@/components/login-prompt-modal";
```

Add:
```typescript
import dynamic from "next/dynamic";
import type { LoginFeature } from "@/components/login-prompt-modal";

const LoginPromptModal = dynamic(
  () => import("@/components/login-prompt-modal").then((m) => m.LoginPromptModal),
  { ssr: false }
);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add contexts/user-interactions-context.tsx
git commit -m "perf: dynamic import LoginPromptModal in UserInteractionsProvider"
```

---

### Task 7: Defer UserInteractionsProvider initialization

**Files:**
- Modify: `contexts/user-interactions-context.tsx:66-99`

**Step 1: Add deferred fetch flag**

The context currently fetches bookmarks+likes immediately on mount when a user exists. Change it to defer until after first paint.

In `contexts/user-interactions-context.tsx`, modify the `useEffect` at line 66:

```typescript
// Before
useEffect(() => {
  if (!user) {
    setBookmarks(new Set());
    setLikes(new Set());
    setIsLoaded(false);
    return;
  }

  let cancelled = false;
  const supabase = createClient();

  async function fetchInteractions() {
    const [{ data: bmarks }, { data: lks }] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("recipe_id")
        .eq("user_id", user!.id),
      supabase
        .from("likes")
        .select("recipe_id")
        .eq("user_id", user!.id),
    ]);

    if (cancelled) return;
    setBookmarks(new Set(bmarks?.map((b) => b.recipe_id) ?? []));
    setLikes(new Set(lks?.map((l) => l.recipe_id) ?? []));
    setIsLoaded(true);
  }

  fetchInteractions();
  return () => {
    cancelled = true;
  };
}, [user]);

// After
useEffect(() => {
  if (!user) {
    setBookmarks(new Set());
    setLikes(new Set());
    setIsLoaded(false);
    return;
  }

  let cancelled = false;
  const supabase = createClient();

  async function fetchInteractions() {
    const [{ data: bmarks }, { data: lks }] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("recipe_id")
        .eq("user_id", user!.id),
      supabase
        .from("likes")
        .select("recipe_id")
        .eq("user_id", user!.id),
    ]);

    if (cancelled) return;
    setBookmarks(new Set(bmarks?.map((b) => b.recipe_id) ?? []));
    setLikes(new Set(lks?.map((l) => l.recipe_id) ?? []));
    setIsLoaded(true);
  }

  // Defer fetch until after first paint to avoid blocking FCP
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = requestIdleCallback(() => {
      if (!cancelled) fetchInteractions();
    });
    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  } else {
    // Fallback: defer with setTimeout(0) to yield to rendering
    const id = setTimeout(() => {
      if (!cancelled) fetchInteractions();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }
}, [user]);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test manually**

Run: `npm run dev`
- Log in and verify bookmarks/likes still load (may flash briefly as empty then populate)
- Verify toggling like/bookmark still works with optimistic updates

**Step 4: Commit**

```bash
git add contexts/user-interactions-context.tsx
git commit -m "perf: defer UserInteractions fetch until after first paint"
```

---

### Task 8: Defer CollectionsProvider initialization

**Files:**
- Modify: `contexts/collections-context.tsx:75-82`

**Step 1: Defer the collections fetch**

In `contexts/collections-context.tsx`, modify the `useEffect` at line 75:

```typescript
// Before
useEffect(() => {
  if (!user) {
    setCollections([]);
    setIsLoaded(false);
    return;
  }
  fetchCollections();
}, [user, fetchCollections]);

// After
useEffect(() => {
  if (!user) {
    setCollections([]);
    setIsLoaded(false);
    return;
  }

  let cancelled = false;

  // Defer fetch until after first paint
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = requestIdleCallback(() => {
      if (!cancelled) fetchCollections();
    });
    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  } else {
    const id = setTimeout(() => {
      if (!cancelled) fetchCollections();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }
}, [user, fetchCollections]);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add contexts/collections-context.tsx
git commit -m "perf: defer CollectionsProvider fetch until after first paint"
```

---

### Task 9: Dynamic import CollectionPopover in GalleryCard

**Files:**
- Modify: `components/gallery-card.tsx:10,157,192`

**Step 1: Replace static import with dynamic import**

In `components/gallery-card.tsx`:

Remove the static import (line 10):
```typescript
// Remove this line
import { CollectionPopover } from "@/components/bookmark-popover";
```

Add dynamic import:
```typescript
import dynamic from "next/dynamic";

const CollectionPopover = dynamic(
  () => import("@/components/bookmark-popover").then((m) => m.CollectionPopover),
  { ssr: false, loading: () => <button><FolderPlus className="h-3.5 w-3.5 text-white" /></button> }
);
```

Note: The loading fallback should match the approximate visual appearance of the trigger button. Adjust the loading fallback for both desktop and mobile usages if needed — or simply use `loading: () => null` if the button itself is the trigger and the popover content is what's lazy-loaded. Since `CollectionPopover` wraps its `children` as the trigger, using `ssr: false` alone is sufficient — the children (trigger buttons) are rendered by the parent, not by CollectionPopover.

Actually, since `CollectionPopover` accepts `children` as the trigger and renders content lazily (only on click), the dynamic import won't affect the trigger rendering. Just use:

```typescript
const CollectionPopover = dynamic(
  () => import("@/components/bookmark-popover").then((m) => m.CollectionPopover),
  { ssr: false }
);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test manually**

Run: `npm run dev`
- Hover over a gallery card → verify the folder icon appears
- Click the folder icon → verify the collection popover opens

**Step 4: Commit**

```bash
git add components/gallery-card.tsx
git commit -m "perf: dynamic import CollectionPopover to reduce per-card DOM weight"
```

---

### Task 10: Dynamic import CollectionPopover in RecipeHero

**Files:**
- Modify: `components/recipe-hero.tsx:30`

**Step 1: Replace static import with dynamic import**

In `components/recipe-hero.tsx`:

Remove the static import (line 30):
```typescript
// Remove this line
import { CollectionPopover } from "@/components/bookmark-popover";
```

Add dynamic import:
```typescript
import dynamic from "next/dynamic";

const CollectionPopover = dynamic(
  () => import("@/components/bookmark-popover").then((m) => m.CollectionPopover),
  { ssr: false }
);
```

**Step 2: Also dynamic import RecipeSettingsModal, DeleteRecipeDialog, ReportRecipeDialog**

These are all modals that only render when opened. Replace their static imports similarly:

```typescript
// Remove these static imports
import { RecipeSettingsModal } from "@/components/recipe-settings-modal";
import { DeleteRecipeDialog } from "@/components/delete-recipe-dialog";
import { ReportRecipeDialog } from "@/components/report-recipe-dialog";

// Add dynamic imports
const RecipeSettingsModal = dynamic(
  () => import("@/components/recipe-settings-modal").then((m) => m.RecipeSettingsModal),
  { ssr: false }
);
const DeleteRecipeDialog = dynamic(
  () => import("@/components/delete-recipe-dialog").then((m) => m.DeleteRecipeDialog),
  { ssr: false }
);
const ReportRecipeDialog = dynamic(
  () => import("@/components/report-recipe-dialog").then((m) => m.ReportRecipeDialog),
  { ssr: false }
);
```

Keep the type import for RecipeSettingsRecipe:
```typescript
import type { RecipeSettingsRecipe } from "@/components/recipe-settings";
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Test manually**

Run: `npm run dev`
- Navigate to a recipe detail page
- Click "View Recipe" button → verify settings modal opens
- Click folder icon → verify collection popover works

**Step 5: Commit**

```bash
git add components/recipe-hero.tsx
git commit -m "perf: dynamic import modals and popovers in RecipeHero"
```

---

### Task 11: Stabilize toggleLike and toggleBookmark callbacks

**Files:**
- Modify: `contexts/user-interactions-context.tsx:101-157,159-231`

**Step 1: Use refs for bookmarks/likes to remove callback dependencies**

The current `toggleBookmark` depends on `[user, bookmarks]` and `toggleLike` depends on `[user, likes, likeCounts]`. These change on every toggle, causing all consumers to re-render.

Change to use refs for reading current state:

Add refs after the state declarations (around line 57):
```typescript
const bookmarksRef = useRef(bookmarks);
bookmarksRef.current = bookmarks;
const likesRef = useRef(likes);
likesRef.current = likes;
const likeCountsRef = useRef(likeCounts);
likeCountsRef.current = likeCounts;
```

Then change `toggleBookmark` to use refs for reading (keep setters as-is since those use functional updates):
```typescript
const toggleBookmark = useCallback(
  async (recipeId: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!user) {
      promptLogin("bookmarks");
      return;
    }

    const key = `bookmark:${recipeId}`;
    if (inflightRef.current.has(key)) return;
    inflightRef.current.add(key);

    const supabase = createClient();
    const isBookmarked = bookmarksRef.current.has(recipeId);

    // optimistic update
    if (isBookmarked) {
      setBookmarks((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    } else {
      setBookmarks((prev) => new Set(prev).add(recipeId));
    }

    try {
      const { error } = isBookmarked
        ? await supabase
            .from("bookmarks")
            .delete()
            .match({ user_id: user.id, recipe_id: recipeId })
        : await supabase
            .from("bookmarks")
            .insert({ user_id: user.id, recipe_id: recipeId });

      if (error) throw error;
    } catch {
      // rollback
      if (isBookmarked) {
        setBookmarks((prev) => new Set(prev).add(recipeId));
      } else {
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      }
      toast.error("Something went wrong. Please try again.");
    } finally {
      inflightRef.current.delete(key);
    }
  },
  [user, promptLogin],
);
```

Similarly change `toggleLike` to read from `likesRef.current` and `likeCountsRef.current`:
```typescript
const toggleLike = useCallback(
  async (recipeId: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!user) {
      promptLogin("likes");
      return;
    }

    const key = `like:${recipeId}`;
    if (inflightRef.current.has(key)) return;
    inflightRef.current.add(key);

    const supabase = createClient();
    const isLiked = likesRef.current.has(recipeId);
    const prevCount = likeCountsRef.current.get(recipeId) ?? 0;

    // optimistic update
    if (isLiked) {
      setLikes((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(recipeId, prevCount - 1);
        return next;
      });
    } else {
      setLikes((prev) => new Set(prev).add(recipeId));
      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(recipeId, prevCount + 1);
        return next;
      });
    }

    try {
      const { error } = isLiked
        ? await supabase
            .from("likes")
            .delete()
            .match({ user_id: user.id, recipe_id: recipeId })
        : await supabase
            .from("likes")
            .insert({ user_id: user.id, recipe_id: recipeId });

      if (error) throw error;
    } catch {
      // rollback
      if (isLiked) {
        setLikes((prev) => new Set(prev).add(recipeId));
      } else {
        setLikes((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      }
      setLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(recipeId, prevCount);
        return next;
      });
      toast.error("Something went wrong. Please try again.");
    } finally {
      inflightRef.current.delete(key);
    }
  },
  [user, promptLogin],
);
```

The key change: dependency arrays shrink from `[user, bookmarks]` and `[user, likes, likeCounts]` to just `[user, promptLogin]`. The functions now read current state from refs, so they don't recreate when state changes. This means the `useMemo` value object changes less often, reducing re-renders across all consumers.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test manually**

Run: `npm run dev`
- Like a recipe → verify heart fills red, count increments
- Unlike → verify it reverts
- Bookmark → verify icon fills
- Test rapid clicking → verify deduplication still works

**Step 4: Commit**

```bash
git add contexts/user-interactions-context.tsx
git commit -m "perf: stabilize toggle callbacks with refs to reduce context re-renders"
```

---

### Task 12: Split RECIPE_DETAIL_SELECT and lazy-load settings

**Files:**
- Modify: `lib/queries.ts` — add RECIPE_HERO_SELECT
- Modify: `app/recipes/[id]/page.tsx` — use RECIPE_HERO_SELECT, add settings API route
- Create: `app/api/recipes/[id]/settings/route.ts` — API endpoint for lazy settings fetch
- Modify: `components/recipe-hero.tsx` — fetch settings on modal open

**Step 1: Add RECIPE_HERO_SELECT to queries.ts**

In `lib/queries.ts`, add:

```typescript
// Recipe detail hero: fields needed for initial page render (no settings)
export const RECIPE_HERO_SELECT =
  "id, user_id, simulation, sensor_generation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, camera_model, lens_model, bookmark_count, like_count, recipe_hash, user_display_name, user_username, user_avatar_path";
```

**Step 2: Create API route for settings**

Create `app/api/recipes/[id]/settings/route.ts`:

```typescript
import { createStaticClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const RECIPE_SETTINGS_SELECT =
  "id, simulation, sensor_generation, dynamic_range_development, grain_roughness, grain_size, color_chrome, color_chrome_fx_blue, wb_type, wb_color_temperature, wb_red, wb_blue, highlight, shadow, color, sharpness, noise_reduction, clarity, bw_adjustment, bw_magenta_green";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_SETTINGS_SELECT)
    .eq("id", recipeId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
```

**Step 3: Update recipe detail page to use RECIPE_HERO_SELECT**

In `app/recipes/[id]/page.tsx`:

Change the import:
```typescript
// Before
import { RECIPE_DETAIL_SELECT, GALLERY_SELECT } from "@/lib/queries";

// After
import { RECIPE_HERO_SELECT, GALLERY_SELECT } from "@/lib/queries";
```

Change the query:
```typescript
// Before
const getRecipe = cache(async (recipeId: number) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_DETAIL_SELECT)
    .eq("id", recipeId)
    .single();
  return data;
});

// After
const getRecipe = cache(async (recipeId: number) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_HERO_SELECT)
    .eq("id", recipeId)
    .single();
  return data;
});
```

Remove `settingsRecipe` from the RecipeHero call:
```typescript
// Before
<RecipeHero recipe={recipe} settingsRecipe={recipe} sharer={sharer} />

// After
<RecipeHero recipe={recipe} sharer={sharer} />
```

**Step 4: Update RecipeHero to lazy-load settings**

In `components/recipe-hero.tsx`:

Remove the `settingsRecipe` prop from the interface:
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
  sharer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}
```

Update the component to fetch settings on modal open:
```typescript
export function RecipeHero({ recipe, sharer }: RecipeHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsRecipe, setSettingsRecipe] = useState<RecipeSettingsRecipe | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  // ... rest of existing state ...

  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    if (!settingsRecipe && !settingsLoading) {
      setSettingsLoading(true);
      try {
        const res = await fetch(`/api/recipes/${recipe.id}/settings`);
        if (res.ok) {
          setSettingsRecipe(await res.json());
        }
      } catch {
        // Settings will show as empty
      } finally {
        setSettingsLoading(false);
      }
    }
  };
```

Update the "View Recipe" button to use `handleOpenSettings`:
```typescript
// Before
<button onClick={() => setSettingsOpen(true)} ...>

// After
<button onClick={handleOpenSettings} ...>
```

Update the RecipeSettingsModal to handle loading state:
```typescript
{settingsRecipe && (
  <RecipeSettingsModal
    recipe={settingsRecipe}
    open={settingsOpen}
    onOpenChange={setSettingsOpen}
  />
)}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Test manually**

Run: `npm run dev`
- Navigate to a recipe detail page — should load faster (fewer fields)
- Click "View Recipe" — settings modal should open after a brief load
- Verify all settings values display correctly in the modal

**Step 7: Commit**

```bash
git add lib/queries.ts app/recipes/[id]/page.tsx app/api/recipes/[id]/settings/route.ts components/recipe-hero.tsx
git commit -m "perf: split recipe detail query - lazy-load settings on modal open"
```

---

### Task 13: Final Phase 1 build verification

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings

**Step 2: Run dev server and verify all pages**

Run: `npm run dev`

Verify each page loads and functions:
- Home page (`/`) — trending grid loads
- Recipe detail (`/recipes/[id]`) — hero renders, "View Recipe" opens settings, similar recipes load
- User profile (`/u/[username]`) — profile loads, recipes load
- Recipes gallery (`/recipes`) — grid loads, filters work, infinite scroll works
- Bookmarks (`/bookmarks`) — loads when logged in
- Collections (`/collections`) — loads when logged in

**Step 3: Commit any fixes if needed**

---

## Phase 2: Client Bundle Overhaul

> **Note:** Implement Phase 2 ONLY after Phase 1 is deployed and metrics are measured for 48-72 hours. If Phase 1 achieves target metrics, Phase 2 may not be necessary.

### Task 14: Move context providers from root layout to page-level

**Files:**
- Modify: `app/layout.tsx` — remove UserInteractionsProvider and CollectionsProvider
- Modify: `app/page.tsx` — wrap with providers
- Modify: `app/recipes/page.tsx` — wrap with providers
- Modify: `app/recipes/[id]/page.tsx` — wrap with providers
- Modify: `app/u/[identifier]/page.tsx` — wrap with providers
- Modify: `app/bookmarks/page.tsx` — wrap with providers
- Modify: `app/likes/page.tsx` — wrap with providers
- Modify: `app/collections/page.tsx` — wrap with providers
- Modify: `app/collections/[id]/page.tsx` — wrap with providers
- Modify: `app/recommend/page.tsx` — wrap with providers
- Create: `components/app-providers.tsx` — wrapper component for the two providers

**Step 1: Create AppProviders wrapper**

Create `components/app-providers.tsx`:
```tsx
"use client";

import { UserInteractionsProvider } from "@/contexts/user-interactions-context";
import { CollectionsProvider } from "@/contexts/collections-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserInteractionsProvider>
      <CollectionsProvider>
        {children}
      </CollectionsProvider>
    </UserInteractionsProvider>
  );
}
```

**Step 2: Remove providers from root layout**

In `app/layout.tsx`, remove `UserInteractionsProvider` and `CollectionsProvider` wrapping. Keep `ThemeProvider`. The Header will need to be updated too since it uses `useUserInteractions` — but that's handled in Task 15.

**IMPORTANT:** This task has a large blast radius. The Header component uses `useUserInteractions` (indirectly through LoginPromptModal in user-interactions-context) — if the provider is removed from the layout, the Header will crash on pages without the provider.

**Alternative approach:** Instead of removing from layout entirely, keep the providers in layout but make their initialization lazy (already done in Tasks 7-8). This preserves the existing architecture while achieving the performance goal.

**Decision:** Skip this task unless Phase 1 metrics are still insufficient. The deferred initialization (Tasks 7-8) already prevents the providers from blocking FCP.

### Task 15: Code-split RecipeFilters

**Files:**
- Modify: `components/recipes-content.tsx` or wherever RecipeFilters is imported

**Step 1: Find where RecipeFilters is imported**

Search for the import and replace with dynamic:
```typescript
import dynamic from "next/dynamic";

const RecipeFilters = dynamic(
  () => import("@/components/recipe-filters").then((m) => m.RecipeFilters),
  { ssr: false }
);
```

**Step 2: Verify build and test**

Run: `npm run build && npm run dev`
Verify filter pills appear on `/recipes` page

**Step 3: Commit**

```bash
git add components/recipes-content.tsx
git commit -m "perf: code-split RecipeFilters component"
```

---

## Verification Checklist

After deployment, monitor Vercel Speed Insights for 48-72 hours:

- [ ] Desktop TTFB: target < 1.5s (from 2.66s)
- [ ] Desktop FCP: target < 2s (from 2.94s)
- [ ] Desktop LCP: target < 2.5s (from 4.32s)
- [ ] Mobile FCP: target < 3s (from 6.21s)
- [ ] Mobile LCP: target < 4s (from 6.29s)
- [ ] Mobile INP: target < 200ms (from 744ms)
- [ ] No regressions in CLS (stays at 0)
- [ ] No functional regressions (all features work)
