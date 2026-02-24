# Phase 2: Community Platform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase-backed community features: OAuth login, recipe sharing with thumbnail upload, photo gallery with recipe overlay, favorites, and statistics/trends.

**Architecture:** Next.js 15 App Router with Supabase (`@supabase/ssr`) for auth, database, and storage. Server Components for data fetching, Client Components for interactivity. OAuth (Google + GitHub) via Server Actions. RLS policies protect all data. Thumbnails compressed client-side to ~400px/~50KB before upload to Supabase Storage.

**Tech Stack:** Next.js 15, React 19, Supabase (Auth + Postgres + Storage), `@supabase/ssr`, Recharts 3.x, Tailwind CSS 3, Radix UI Dialog.

---

### Task 1: Install Supabase Dependencies and Create Client Utilities

**Files:**
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Create `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Note: The implementer should replace these with actual values from the Supabase dashboard. If no Supabase project exists yet, create one at https://supabase.com/dashboard. Add `.env.local` to `.gitignore` if not already there.

**Step 3: Create `lib/supabase/client.ts`** (browser client for Client Components)

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 4: Create `lib/supabase/server.ts`** (server client for Server Components / Server Actions / Route Handlers)

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — middleware handles cookie writes
          }
        },
      },
    }
  );
}
```

**Step 5: Create `lib/supabase/middleware.ts`** (session refresh helper)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

**Step 6: Create `middleware.ts`** (project root, NOT inside `app/`)

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 7: Verify the build**

Run: `npm run build`
Expected: Build succeeds. The env vars are placeholders — the app will still build but Supabase calls will fail until real values are set.

**Step 8: Commit**

```bash
git add lib/supabase/ middleware.ts package.json package-lock.json
git commit -m "feat: add Supabase client utilities and middleware"
```

Note: Do NOT commit `.env.local`.

---

### Task 2: Create Supabase Database Schema (SQL)

**Files:**
- Create: `supabase/schema.sql` (reference file, run in Supabase SQL Editor)

**Context:** This SQL creates the `recipes`, `favorites` tables, storage bucket, and RLS policies. The `profiles` table is auto-managed by Supabase Auth. Run this SQL in the Supabase Dashboard → SQL Editor.

**Step 1: Create `supabase/schema.sql`**

```sql
-- ============================================================
-- RECIPES TABLE
-- ============================================================
CREATE TABLE public.recipes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation  text,
  grain_roughness text,
  grain_size  text,
  color_chrome text,
  color_chrome_fx_blue text,
  wb_type     text,
  wb_color_temperature integer,
  wb_red      numeric,
  wb_blue     numeric,
  dynamic_range_setting text,
  dynamic_range_development integer,
  highlight   numeric,
  shadow      numeric,
  color       numeric,
  sharpness   numeric,
  noise_reduction numeric,
  clarity     numeric,
  bw_adjustment numeric,
  bw_magenta_green numeric,
  thumbnail_path text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE INDEX recipes_user_id_idx ON public.recipes (user_id);
CREATE INDEX recipes_simulation_idx ON public.recipes (simulation);
CREATE INDEX recipes_created_at_idx ON public.recipes (created_at DESC);

-- Anyone can read all recipes (public gallery)
CREATE POLICY "Recipes are publicly readable"
  ON public.recipes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can create recipes
CREATE POLICY "Users can create recipes"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can delete their own recipes
CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- FAVORITES TABLE
-- ============================================================
CREATE TABLE public.favorites (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX favorites_recipe_id_idx ON public.favorites (recipe_id);

-- Anyone can see favorite counts (for sorting)
CREATE POLICY "Favorites are publicly readable"
  ON public.favorites FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can add favorites
CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- STORAGE BUCKET for thumbnails
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Anyone can read thumbnails (public bucket)
CREATE POLICY "Thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "Users can upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================================
-- VIEW: Recipe with favorite count (for gallery sorting)
-- ============================================================
CREATE OR REPLACE VIEW public.recipes_with_stats AS
SELECT
  r.*,
  COALESCE(f.fav_count, 0) AS favorite_count
FROM public.recipes r
LEFT JOIN (
  SELECT recipe_id, COUNT(*) AS fav_count
  FROM public.favorites
  GROUP BY recipe_id
) f ON f.recipe_id = r.id;
```

**Step 2: Commit the schema file**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase database schema with RLS policies"
```

Note: The implementer needs to run this SQL in the Supabase dashboard SQL Editor. This is not auto-applied.

---

### Task 3: Implement OAuth Login (Google + GitHub)

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Create: `app/auth/callback/route.ts`
- Modify: `components/header.tsx` (add login/user button)
- Create: `hooks/use-user.ts`

**Step 1: Create `app/auth/callback/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}
```

**Step 2: Create `app/login/actions.ts`**

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth-failed");
  }

  redirect(data.url);
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth-failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

**Step 3: Create `app/login/page.tsx`**

```tsx
import { signInWithGoogle, signInWithGitHub } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Film className="h-5 w-5" />
            <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to share recipes and save favorites
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={signInWithGoogle}>
            <Button variant="outline" className="w-full" type="submit">
              Continue with Google
            </Button>
          </form>
          <form action={signInWithGitHub}>
            <Button variant="outline" className="w-full" type="submit">
              Continue with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create `hooks/use-user.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { user, loading };
}
```

**Step 5: Update `components/header.tsx`** — add login/user button + nav links

```tsx
"use client";

import { Film } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/app/login/actions";
import Link from "next/link";

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 md:px-10">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          <Link
            href="/gallery"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Gallery
          </Link>
          <Link
            href="/stats"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Stats
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <a
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="https://tally.so/r/wLqO0J"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feedback
        </a>
        {!loading && (
          <>
            {user ? (
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </>
        )}
        <ModeToggle />
      </div>
    </header>
  );
}
```

**Step 6: Verify the build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add app/login/ app/auth/ hooks/use-user.ts components/header.tsx
git commit -m "feat: implement OAuth login with Google and GitHub"
```

---

### Task 4: Implement Thumbnail Compression and Recipe Sharing

**Files:**
- Create: `lib/compress-image.ts`
- Create: `lib/share-recipe.ts`
- Modify: `app/page.tsx` (add "Share Recipe" button)
- Modify: `components/recipe-card.tsx` (add share button)

**Step 1: Create `lib/compress-image.ts`**

```ts
export async function compressImageToThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 400;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        0.7
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
```

**Step 2: Create `lib/share-recipe.ts`**

```ts
import { createClient } from "@/lib/supabase/client";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";

export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnailBlob: Blob
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Upload thumbnail
  const fileName = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("thumbnails")
    .upload(fileName, thumbnailBlob, {
      contentType: "image/jpeg",
    });

  if (uploadError) {
    return { success: false, error: "Failed to upload thumbnail" };
  }

  // Insert recipe
  const { error: insertError } = await supabase.from("recipes").insert({
    user_id: user.id,
    simulation: simulation ?? null,
    grain_roughness: recipe.grainEffect?.roughness ?? null,
    grain_size: recipe.grainEffect?.size ?? null,
    color_chrome: recipe.colorChromeEffect ?? null,
    color_chrome_fx_blue: recipe.colorChromeFXBlue ?? null,
    wb_type: recipe.whiteBalance?.type ?? null,
    wb_color_temperature: recipe.whiteBalance?.colorTemperature ?? null,
    wb_red: recipe.whiteBalance?.red ?? null,
    wb_blue: recipe.whiteBalance?.blue ?? null,
    dynamic_range_setting: recipe.dynamicRange?.setting ?? null,
    dynamic_range_development: recipe.dynamicRange?.development ?? null,
    highlight: recipe.highlight ?? null,
    shadow: recipe.shadow ?? null,
    color: recipe.color ?? null,
    sharpness: recipe.sharpness ?? null,
    noise_reduction: recipe.highISONoiseReduction ?? null,
    clarity: recipe.clarity ?? null,
    bw_adjustment: recipe.bwAdjustment ?? null,
    bw_magenta_green: recipe.bwMagentaGreen ?? null,
    thumbnail_path: fileName,
  });

  if (insertError) {
    return { success: false, error: "Failed to save recipe" };
  }

  return { success: true };
}
```

**Step 3: Modify `app/page.tsx`** — store the original File for later sharing

Add state for the original file:
```tsx
const [originalFile, setOriginalFile] = useState<File | null>(null);
```

In the `onDrop` callback, save the file:
```tsx
setOriginalFile(file);
```

Pass it to RecipeCard:
```tsx
<RecipeCard {...recipe} simulation={simulation} originalFile={originalFile} />
```

**Step 4: Modify `components/recipe-card.tsx`** — add Share button

Add imports:
```tsx
import { Share2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { shareRecipe } from "@/lib/share-recipe";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { useState } from "react";
```

Update the component props to accept `originalFile`:
```tsx
export function RecipeCard({
  simulation,
  originalFile,
  ...recipe
}: FujifilmRecipe & { simulation: string | null; originalFile?: File | null }) {
```

Add share logic inside the component:
```tsx
const { user } = useUser();
const [sharing, setSharing] = useState(false);

const handleShare = async () => {
  if (!originalFile) return;
  setSharing(true);
  try {
    const thumbnail = await compressImageToThumbnail(originalFile);
    const result = await shareRecipe(recipe as FujifilmRecipe, simulation as FujifilmSimulation | null, thumbnail);
    if (result.success) {
      toast({ title: "Shared", description: "Recipe shared to gallery" });
    } else {
      toast({ variant: "destructive", description: result.error ?? "Failed to share" });
    }
  } catch {
    toast({ variant: "destructive", description: "Failed to share recipe" });
  }
  setSharing(false);
};
```

Add a Share button next to the Copy button in the card header:
```tsx
{user && originalFile && (
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 text-muted-foreground hover:text-foreground"
    onClick={handleShare}
    disabled={sharing}
  >
    <Share2 className="h-4 w-4" />
  </Button>
)}
```

**Step 5: Verify the build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add lib/compress-image.ts lib/share-recipe.ts app/page.tsx components/recipe-card.tsx
git commit -m "feat: add recipe sharing with thumbnail compression"
```

---

### Task 5: Implement Gallery Page

**Files:**
- Create: `app/gallery/page.tsx`
- Create: `components/gallery-grid.tsx`
- Create: `components/recipe-detail-dialog.tsx`

**Step 1: Create `components/recipe-detail-dialog.tsx`**

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeItem } from "@/components/recipe-item";
import { addSign } from "@/lib/utils";

interface RecipeDetailDialogProps {
  recipe: {
    simulation: string | null;
    grain_roughness: string | null;
    grain_size: string | null;
    color_chrome: string | null;
    color_chrome_fx_blue: string | null;
    wb_type: string | null;
    wb_color_temperature: number | null;
    wb_red: number | null;
    wb_blue: number | null;
    dynamic_range_development: number | null;
    highlight: number | null;
    shadow: number | null;
    color: number | null;
    sharpness: number | null;
    noise_reduction: number | null;
    clarity: number | null;
    bw_adjustment: number | null;
    bw_magenta_green: number | null;
    thumbnail_path: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumbnailUrl: string | null;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  thumbnailUrl,
}: RecipeDetailDialogProps) {
  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {recipe.simulation ?? "Unknown Simulation"}
          </DialogTitle>
          <p className="text-xs uppercase text-muted-foreground">Film Recipe</p>
        </DialogHeader>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="Recipe photo"
            className="w-full rounded-lg object-cover"
          />
        )}
        <div className="grid grid-cols-2 gap-x-4">
          {recipe.grain_roughness && (
            <RecipeItem label="Grain" value={`${recipe.grain_roughness} ${recipe.grain_size ?? ""}`} />
          )}
          {recipe.color_chrome && (
            <RecipeItem label="Color Chrome" value={recipe.color_chrome} />
          )}
          {recipe.color_chrome_fx_blue && (
            <RecipeItem label="FX Blue" value={recipe.color_chrome_fx_blue} />
          )}
          {recipe.wb_type && (
            <RecipeItem
              label={`R: ${addSign(recipe.wb_red ?? 0)} B: ${addSign(recipe.wb_blue ?? 0)}`}
              value={recipe.wb_color_temperature ? `${recipe.wb_color_temperature} K` : recipe.wb_type.replace("-", " ")}
            />
          )}
          {recipe.dynamic_range_development != null && (
            <RecipeItem label="DR" value={recipe.dynamic_range_development} />
          )}
          {recipe.highlight != null && <RecipeItem label="Highlight" value={recipe.highlight} />}
          {recipe.shadow != null && <RecipeItem label="Shadow" value={recipe.shadow} />}
          {recipe.color != null && <RecipeItem label="Color" value={recipe.color} />}
          {recipe.sharpness != null && <RecipeItem label="Sharpness" value={recipe.sharpness} />}
          {recipe.noise_reduction != null && <RecipeItem label="Noise Reduction" value={recipe.noise_reduction} />}
          {recipe.clarity != null && <RecipeItem label="Clarity" value={recipe.clarity} />}
          {recipe.bw_adjustment != null && <RecipeItem label="BW Adj" value={recipe.bw_adjustment} />}
          {recipe.bw_magenta_green != null && <RecipeItem label="BW M/G" value={recipe.bw_magenta_green} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create `components/gallery-grid.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GalleryRecipe {
  id: number;
  simulation: string | null;
  grain_roughness: string | null;
  grain_size: string | null;
  color_chrome: string | null;
  color_chrome_fx_blue: string | null;
  wb_type: string | null;
  wb_color_temperature: number | null;
  wb_red: number | null;
  wb_blue: number | null;
  dynamic_range_development: number | null;
  highlight: number | null;
  shadow: number | null;
  color: number | null;
  sharpness: number | null;
  noise_reduction: number | null;
  clarity: number | null;
  bw_adjustment: number | null;
  bw_magenta_green: number | null;
  thumbnail_path: string | null;
  favorite_count: number;
  created_at: string;
}

interface GalleryGridProps {
  recipes: GalleryRecipe[];
  userFavorites: number[];
  supabaseUrl: string;
}

export function GalleryGrid({ recipes, userFavorites, supabaseUrl }: GalleryGridProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<GalleryRecipe | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set(userFavorites));
  const { user } = useUser();
  const { toast } = useToast();

  const getThumbnailUrl = (path: string | null) => {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/thumbnails/${path}`;
  };

  const toggleFavorite = async (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ description: "Sign in to save favorites" });
      return;
    }

    const supabase = createClient();
    const isFav = favorites.has(recipeId);

    if (isFav) {
      await supabase.from("favorites").delete().match({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => { const next = new Set(prev); next.delete(recipeId); return next; });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, recipe_id: recipeId });
      setFavorites((prev) => new Set(prev).add(recipeId));
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {recipes.map((recipe) => {
          const url = getThumbnailUrl(recipe.thumbnail_path);
          return (
            <div
              key={recipe.id}
              className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted"
              onClick={() => setSelectedRecipe(recipe)}
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
                <p className="text-sm font-semibold">{recipe.simulation ?? "Unknown"}</p>
              </div>
              <button
                onClick={(e) => toggleFavorite(recipe.id, e)}
                className="absolute right-2 top-2 rounded-full bg-black/30 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Heart
                  className={`h-4 w-4 ${favorites.has(recipe.id) ? "fill-white text-white" : "text-white"}`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        thumbnailUrl={selectedRecipe ? getThumbnailUrl(selectedRecipe.thumbnail_path) : null}
      />
    </>
  );
}
```

**Step 3: Create `app/gallery/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userFavorites: number[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", user.id);
    userFavorites = favs?.map((f) => f.recipe_id) ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="flex w-full max-w-6xl flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Community-shared film recipes
            </p>
          </div>
          {recipes && recipes.length > 0 ? (
            <GalleryGrid
              recipes={recipes}
              userFavorites={userFavorites}
              supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground py-20">
              No recipes shared yet. Be the first!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
```

**Step 4: Verify the build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add app/gallery/ components/gallery-grid.tsx components/recipe-detail-dialog.tsx
git commit -m "feat: add gallery page with photo grid and recipe detail dialog"
```

---

### Task 6: Implement Statistics Page

**Files:**
- Create: `app/stats/page.tsx`
- Create: `components/stats-charts.tsx`

**Step 1: Install Recharts**

Run:
```bash
npm install recharts
```

**Step 2: Create `components/stats-charts.tsx`**

```tsx
"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const GRAYS = [
  "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080",
  "#999999", "#b3b3b3", "#cccccc", "#d9d9d9", "#e6e6e6",
];

interface SimulationData {
  name: string;
  count: number;
}

interface TrendData {
  month: string;
  count: number;
}

export function SimulationDistributionChart({ data }: { data: SimulationData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Film Simulation Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={GRAYS[idx % GRAYS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PopularRecipesChart({ data }: { data: SimulationData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Most Popular Simulations</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#666666" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendsChart({ data }: { data: TrendData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Recipes Shared Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#1a1a1a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3: Create `app/stats/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import {
  SimulationDistributionChart,
  PopularRecipesChart,
  TrendsChart,
} from "@/components/stats-charts";

export default async function StatsPage() {
  const supabase = await createClient();

  // Simulation distribution
  const { data: recipes } = await supabase
    .from("recipes")
    .select("simulation");

  const simulationCounts: Record<string, number> = {};
  recipes?.forEach((r) => {
    const sim = r.simulation ?? "Unknown";
    simulationCounts[sim] = (simulationCounts[sim] ?? 0) + 1;
  });

  const simulationData = Object.entries(simulationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly trends
  const monthlyCounts: Record<string, number> = {};
  recipes?.forEach((r) => {
    // recipes from the query above don't have created_at, fetch separately
  });

  const { data: recipesWithDates } = await supabase
    .from("recipes")
    .select("created_at");

  recipesWithDates?.forEach((r) => {
    const date = new Date(r.created_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyCounts[month] = (monthlyCounts[month] ?? 0) + 1;
  });

  const trendData = Object.entries(monthlyCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Total count
  const totalRecipes = recipes?.length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="flex w-full max-w-5xl flex-col gap-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalRecipes} recipes shared by the community
            </p>
          </div>
          {totalRecipes > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <SimulationDistributionChart data={simulationData.slice(0, 10)} />
              <PopularRecipesChart data={simulationData.slice(0, 10)} />
              <div className="md:col-span-2">
                <TrendsChart data={trendData} />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-20">
              No data yet. Share some recipes to see statistics!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
```

**Step 4: Verify the build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add app/stats/ components/stats-charts.tsx package.json package-lock.json
git commit -m "feat: add statistics page with simulation distribution and trends"
```

---

### Task 7: Add Shared Layout with Header/Footer for All Pages

**Files:**
- Modify: `app/layout.tsx` (add Header + Footer to the root layout)
- Modify: `app/page.tsx` (remove Header/Footer — now in layout)
- Modify: `app/gallery/page.tsx` (remove redundant wrapper)
- Modify: `app/stats/page.tsx` (remove redundant wrapper)

**Context:** Currently Header and Footer are only in `app/page.tsx`. They should be in the root layout so Gallery, Stats, and Login pages all share the same header/footer. The login page should NOT have the header — handle this with a route group or conditional.

**Step 1: Update `app/layout.tsx`**

Add Header and Footer imports. Wrap children with the flex layout structure:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Film Recipe Viewer",
  description: "View and share your Fujifilm recipes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} bg-background font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 2: Update `app/page.tsx`** — remove Header, Footer, and the outer flex div

The page should now only contain the main content area:

```tsx
return (
  <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <ImageDropzone onFileDrop={onDrop} hasImage={!!image} />
      {/* ... rest of content unchanged ... */}
    </div>
  </div>
);
```

Remove imports for Header and Footer.

**Step 3: Update `app/gallery/page.tsx`** — remove the `min-h-screen flex-col bg-background` wrapper and the `<main>` tag. Just return the inner content div.

**Step 4: Update `app/stats/page.tsx`** — same treatment as gallery.

**Step 5: Create `app/login/layout.tsx`** — login page should NOT show the header/footer. Override with a minimal layout:

```tsx
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

Note: This won't actually hide the root layout header. To properly hide it, move the login page into a route group `(auth)` with its own layout, OR conditionally render Header/Footer based on pathname. Simplest approach: the login page already has its own full-screen centered layout, so the header showing is acceptable for now. Skip the override.

**Step 6: Verify the build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add app/layout.tsx app/page.tsx app/gallery/page.tsx app/stats/page.tsx
git commit -m "refactor: move header and footer to root layout"
```

---

### Task 8: Configure Supabase Providers and Final Integration

**Files:**
- Modify: `.env.local` (fill in real Supabase values)
- Modify: `app/gallery/page.tsx` (add filter by simulation)

**Context:** This task is about wiring everything together, setting up the actual Supabase project with OAuth providers, running the schema SQL, and testing the full flow.

**Step 1: Set up Supabase project**

1. Go to https://supabase.com/dashboard and create a new project (or use existing)
2. Copy the URL and anon key to `.env.local`
3. Run `supabase/schema.sql` in the SQL Editor
4. Enable Google provider: Authentication → Providers → Google (add Client ID + Secret from Google Cloud Console)
5. Enable GitHub provider: Authentication → Providers → GitHub (add Client ID + Secret from GitHub OAuth App)
6. Add redirect URLs in Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

**Step 2: Add simulation filter to gallery page**

Add a query parameter for filtering. Update `app/gallery/page.tsx` to accept a `?simulation=classic-chrome` search param:

```tsx
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";

interface GalleryPageProps {
  searchParams: Promise<{ simulation?: string; sort?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recipes_with_stats")
    .select("*")
    .limit(100);

  if (params.simulation) {
    query = query.eq("simulation", params.simulation);
  }

  if (params.sort === "popular") {
    query = query.order("favorite_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: recipes } = await query;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userFavorites: number[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", user.id);
    userFavorites = favs?.map((f) => f.recipe_id) ?? [];
  }

  // Get unique simulations for filter
  const { data: allRecipes } = await supabase.from("recipes").select("simulation");
  const simulations = [...new Set(allRecipes?.map((r) => r.simulation).filter(Boolean) as string[])].sort();

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Community-shared film recipes
            </p>
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <a
            href="/gallery"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !params.simulation ? "bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </a>
          {simulations.map((sim) => (
            <a
              key={sim}
              href={`/gallery?simulation=${sim}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                params.simulation === sim ? "bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {sim}
            </a>
          ))}
        </div>
        {/* Sort toggle */}
        <div className="flex gap-2">
          <a
            href={`/gallery${params.simulation ? `?simulation=${params.simulation}` : ""}`}
            className={`text-xs font-medium ${params.sort !== "popular" ? "text-foreground underline" : "text-muted-foreground"}`}
          >
            Newest
          </a>
          <a
            href={`/gallery?sort=popular${params.simulation ? `&simulation=${params.simulation}` : ""}`}
            className={`text-xs font-medium ${params.sort === "popular" ? "text-foreground underline" : "text-muted-foreground"}`}
          >
            Popular
          </a>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid
            recipes={recipes}
            userFavorites={userFavorites}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found. Try a different filter or be the first to share!
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify the build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add app/gallery/page.tsx
git commit -m "feat: add simulation filter and sort to gallery page"
```

---

### Task 9: End-to-End Verification

**Files:** None (manual testing)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify the full flow**

1. Open `http://localhost:3000` — recipe viewer works as before
2. Click "Sign In" → login page with Google/GitHub buttons
3. Sign in with Google or GitHub → redirected back to home
4. Upload a Fujifilm JPEG → recipe card shows → Share button visible
5. Click Share → recipe shared to gallery
6. Navigate to `/gallery` → photo grid shows shared recipe
7. Click on a photo → recipe detail dialog opens
8. Click heart icon → favorite toggled
9. Navigate to `/stats` → charts show simulation distribution
10. Click "Sign Out" → back to anonymous state
11. Gallery is still viewable without login

**Step 3: Fix any issues found during testing**

**Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: end-to-end verification fixes"
```
