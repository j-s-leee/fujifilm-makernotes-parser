# Recipe i18n Labels + GPT SEO Metadata + Content Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent features: (1) Korean recipe setting labels matching Fujifilm camera menus, (2) GPT-4o mini Vision auto-generated SEO metadata per recipe, (3) Changelog + Guide markdown content pages for SEO.

**Architecture:** Three separate PRs, each branching from `develop`. PR1 is translation-only. PR2 adds a server API route for GPT Vision, DB columns, view update, and metadata integration. PR3 creates markdown content pages reusing the existing `getLegalContent` + `MarkdownContent` pattern with frontmatter support.

**Tech Stack:** Next.js 15 (App Router), next-intl, Supabase (Postgres + RLS), OpenAI gpt-4o-mini, react-markdown + remark-gfm, gray-matter

**Spec:** `docs/superpowers/specs/2026-03-27-i18n-seo-content-pages-design.md`

---

## PR 1: Recipe Settings Label i18n

### Task 1: Update Korean Translation Labels

**Files:**
- Modify: `messages/ko.json:149-166` (recipeSettings namespace)

- [ ] **Step 1: Create feature branch**

```bash
git checkout develop
git checkout -b feature/recipe-settings-ko-labels
```

- [ ] **Step 2: Update `ko.json` recipeSettings namespace**

In `messages/ko.json`, replace the `recipeSettings` object with:

```json
"recipeSettings": {
  "title": "레시피 설정",
  "filmSimulation": "필름 시뮬레이션",
  "dynamicRange": "다이나믹 레인지",
  "grainEffect": "그레인 효과",
  "colorChrome": "컬러 크롬 효과",
  "colorChromeFXBlue": "컬러 크롬 FX 블루",
  "whiteBalance": "화이트 밸런스",
  "toneCurve": "톤 곡선",
  "color": "색농도",
  "sharpness": "샤프니스",
  "noiseReduction": "노이즈 리덕션",
  "clarity": "선명도",
  "bwAdjustment": "흑백 조정",
  "bwMG": "흑백 M/G",
  "copyRecipe": "레시피 복사",
  "copied": "복사됨!",
  "highlight": "하이라이트",
  "shadow": "섀도우",
  "wbShift": "WB 시프트"
}
```

- [ ] **Step 3: Add new keys to `en.json`**

In `messages/en.json`, add the 3 new keys to the `recipeSettings` object:

```json
"highlight": "Highlight",
"shadow": "Shadow",
"wbShift": "WB Shift"
```

- [ ] **Step 4: Commit translation changes**

```bash
git add messages/en.json messages/ko.json
git commit -m "i18n: add Korean recipe settings labels (Fujifilm menu names)"
```

---

### Task 2: Fix Hardcoded English Strings in handleCopy

**Files:**
- Modify: `components/recipe-settings.tsx:92-98`

- [ ] **Step 1: Replace hardcoded strings with translation keys**

In `components/recipe-settings.tsx`, update lines 92-98:

Current code:
```typescript
lines.push(
  `WB Shift: R:${addSign(recipe.wb_red ?? 0)} B:${addSign(recipe.wb_blue ?? 0)}`,
);
```
Replace with:
```typescript
lines.push(
  `${t("wbShift")}: R:${addSign(recipe.wb_red ?? 0)} B:${addSign(recipe.wb_blue ?? 0)}`,
);
```

Current code:
```typescript
if (recipe.highlight != null)
  lines.push(`Highlight: ${addSign(recipe.highlight)}`);
if (recipe.shadow != null) lines.push(`Shadow: ${addSign(recipe.shadow)}`);
```
Replace with:
```typescript
if (recipe.highlight != null)
  lines.push(`${t("highlight")}: ${addSign(recipe.highlight)}`);
if (recipe.shadow != null) lines.push(`${t("shadow")}: ${addSign(recipe.shadow)}`);
```

- [ ] **Step 2: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/recipe-settings.tsx
git commit -m "i18n: use translation keys for handleCopy hardcoded strings"
```

---

## PR 2: GPT Vision SEO Metadata Generation

### Task 3: DB Migration — Add AI Metadata Columns + Update View

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_ai_metadata_columns.sql`

- [ ] **Step 1: Create feature branch**

```bash
git checkout develop
git checkout -b feature/gpt-seo-metadata
```

- [ ] **Step 2: Create migration file**

Create `supabase/migrations/20260327000000_ai_metadata_columns.sql`:

```sql
-- ============================================================
-- AI-generated SEO metadata columns
-- ============================================================
ALTER TABLE public.recipes
  ADD COLUMN ai_description_en text DEFAULT null,
  ADD COLUMN ai_description_ko text DEFAULT null,
  ADD COLUMN ai_alt_text_en text DEFAULT null,
  ADD COLUMN ai_alt_text_ko text DEFAULT null;

-- ============================================================
-- Update recipes_with_stats view to include new columns
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
  r.slug,
  r.ai_description_en,
  r.ai_description_ko,
  r.ai_alt_text_en,
  r.ai_alt_text_ko,
  s.slug        AS simulation,
  cm.name       AS camera_model,
  cm.sensor_generation,
  l.name        AS lens_model,
  w.slug        AS wb_type,
  p.display_name AS user_display_name,
  p.username     AS user_username,
  p.avatar_path  AS user_avatar_path
FROM public.recipes r
LEFT JOIN public.simulations s   ON s.id  = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l         ON l.id  = r.lens_id
LEFT JOIN public.wb_types w       ON w.id  = r.wb_type_id
LEFT JOIN public.profiles p       ON p.id  = r.user_id
WHERE r.deleted_at IS NULL;
```

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/20260327000000_ai_metadata_columns.sql
git commit -m "migration: add AI metadata columns and update view"
```

---

### Task 4: Create GPT Metadata Generation API Route

**Files:**
- Create: `lib/generate-ai-metadata.ts`
- Create: `app/api/generate-metadata/route.ts`

- [ ] **Step 1: Create the metadata generation utility**

Create `lib/generate-ai-metadata.ts`:

```typescript
import OpenAI from "openai";

interface RecipeContext {
  simulation: string | null;
  cameraModel: string | null;
  imageUrl: string;
  dynamicRange: number | null;
  grainRoughness: string | null;
  colorChrome: string | null;
}

interface AiMetadata {
  ai_description_en: string;
  ai_description_ko: string;
  ai_alt_text_en: string;
  ai_alt_text_ko: string;
}

export async function generateAiMetadata(
  context: RecipeContext,
): Promise<AiMetadata | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping AI metadata generation");
    return null;
  }

  const settingsSummary = [
    context.simulation && `Film Simulation: ${context.simulation}`,
    context.cameraModel && `Camera: ${context.cameraModel}`,
    context.dynamicRange != null && `Dynamic Range: DR${context.dynamicRange}`,
    context.grainRoughness && `Grain: ${context.grainRoughness}`,
    context.colorChrome && `Color Chrome: ${context.colorChrome}`,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an SEO specialist for film-simulation.site, a Fujifilm film simulation recipe sharing platform. Given a photo and its recipe settings, generate:
1. SEO meta description (1-2 sentences, under 160 characters) describing the photo's mood, subject, and the film simulation used.
2. Image alt text (1 sentence) describing what is visually in the photo.

Generate in both English and Korean. Respond in JSON only:
{"description_en":"...","description_ko":"...","alt_text_en":"...","alt_text_ko":"..."}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: context.imageUrl, detail: "low" },
            },
            {
              type: "text",
              text: `Recipe settings: ${settingsSummary}`,
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, string>;

    // Map from GPT output keys (description_en) to DB column keys (ai_description_en)
    return {
      ai_description_en: parsed.description_en || "",
      ai_description_ko: parsed.description_ko || "",
      ai_alt_text_en: parsed.alt_text_en || "",
      ai_alt_text_ko: parsed.alt_text_ko || "",
    };
  } catch (error) {
    console.error("AI metadata generation failed:", error);
    return null;
  }
}
```

- [ ] **Step 2: Create the API route**

Create `app/api/generate-metadata/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAiMetadata } from "@/lib/generate-ai-metadata";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { recipeId, imageUrl, simulation, cameraModel, dynamicRange, grainRoughness, colorChrome } = body;

  if (!recipeId || !imageUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const metadata = await generateAiMetadata({
    simulation,
    cameraModel,
    imageUrl,
    dynamicRange,
    grainRoughness,
    colorChrome,
  });

  if (!metadata) {
    return NextResponse.json({ skipped: true });
  }

  const { error } = await supabase
    .from("recipes")
    .update(metadata)
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to save AI metadata:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true, metadata });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/generate-ai-metadata.ts app/api/generate-metadata/route.ts
git commit -m "feat: add GPT-4o mini Vision metadata generation API"
```

---

### Task 5: Integrate GPT Metadata into Recipe Upload Flow

**Files:**
- Modify: `lib/share-recipe.ts:112-119`

- [ ] **Step 1: Add non-blocking metadata generation after recipe insert**

In `lib/share-recipe.ts`, after the successful insert (line 116), add the GPT call:

```typescript
if (insertError || !inserted) {
  return { success: false, error: "Failed to save recipe" };
}

// Non-blocking: generate AI metadata for SEO (fire-and-forget)
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
fetch("/api/generate-metadata", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipeId: inserted.id,
    imageUrl: `${r2PublicUrl}/${fileName}`,
    simulation: simulation ?? null,
    cameraModel: normalizedCamera,
    dynamicRange: recipe.dynamicRange?.development ?? null,
    grainRoughness: recipe.grainEffect?.roughness ?? null,
    colorChrome: recipe.colorChromeEffect ?? null,
  }),
}).catch((err) => console.error("AI metadata request failed:", err));

return { success: true, recipeId: inserted.id };
```

Note: This is fire-and-forget. The recipe upload succeeds regardless of GPT result. The metadata will be populated shortly after.

- [ ] **Step 2: Commit**

```bash
git add lib/share-recipe.ts
git commit -m "feat: trigger AI metadata generation on recipe upload"
```

---

### Task 6: Update Query and Metadata to Use AI Fields

**Files:**
- Modify: `lib/queries.ts:8` (RECIPE_DETAIL_SELECT)
- Modify: `app/[locale]/recipes/[id]/page.tsx:30-68` (generateMetadata)
- Modify: `components/recipe-hero.tsx:140` (Image alt)

- [ ] **Step 1: Add AI columns to RECIPE_DETAIL_SELECT**

In `lib/queries.ts`, append to the `RECIPE_DETAIL_SELECT` string:

```
, ai_description_en, ai_description_ko, ai_alt_text_en, ai_alt_text_ko
```

- [ ] **Step 2: Update generateMetadata to be locale-aware**

In `app/[locale]/recipes/[id]/page.tsx`, update `generateMetadata`:

```typescript
export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { id, locale } = await params;
  const recipeId = parseRecipeId(id);
  if (isNaN(recipeId)) return {};

  const recipe = await getRecipe(recipeId);
  if (!recipe) return {};

  const canonicalSlugId = buildRecipeSlugId(recipe.slug, recipe.id);

  const title = `${recipe.simulation} Recipe`;
  const byName = recipe.user_username
    ? `@${recipe.user_username}`
    : recipe.user_display_name;

  // Use AI-generated description if available, else fallback to template
  const aiDescription = locale === "ko"
    ? recipe.ai_description_ko
    : recipe.ai_description_en;
  const description = aiDescription
    ?? `${recipe.simulation} recipe shot on ${recipe.camera_model ?? "Fujifilm"}${byName ? ` by ${byName}` : ""}`;

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

- [ ] **Step 3: Update Image alt text in recipe-hero**

In `components/recipe-hero.tsx`, where the main image is rendered (line 140), update the alt prop. The component needs to receive the AI alt text. Add `aiAltText` to the recipe prop interface and use it:

```typescript
alt={recipe.aiAltText ?? recipe.simulation ?? "Recipe photo"}
```

The parent `page.tsx` should pass the locale-appropriate alt text when constructing the recipe prop:

```typescript
const aiAltText = locale === "ko"
  ? recipe.ai_alt_text_ko
  : recipe.ai_alt_text_en;
```

Pass `aiAltText` into the recipe object going to `RecipeHero`.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts app/[locale]/recipes/[id]/page.tsx components/recipe-hero.tsx
git commit -m "feat: use AI-generated metadata in SEO and image alt text"
```

---

### Task 7: Backfill Script for Existing Recipes

**Files:**
- Create: `scripts/backfill-ai-metadata.ts`

- [ ] **Step 1: Create backfill script**

Create `scripts/backfill-ai-metadata.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { generateAiMetadata } from "../lib/generate-ai-metadata";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

async function backfill() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch recipes without AI metadata
  const { data: recipes, error } = await supabase
    .from("recipes_with_stats")
    .select("id, simulation, camera_model, thumbnail_path, dynamic_range_development, grain_roughness, color_chrome")
    .is("ai_description_en", null)
    .order("id", { ascending: true });

  if (error || !recipes) {
    console.error("Failed to fetch recipes:", error);
    return;
  }

  console.log(`Found ${recipes.length} recipes to backfill`);

  let success = 0;
  let failed = 0;

  for (const recipe of recipes) {
    if (!recipe.thumbnail_path) {
      console.log(`Skipping recipe ${recipe.id}: no thumbnail`);
      continue;
    }

    const imageUrl = `${r2PublicUrl}/${recipe.thumbnail_path}`;

    const metadata = await generateAiMetadata({
      simulation: recipe.simulation,
      cameraModel: recipe.camera_model,
      imageUrl,
      dynamicRange: recipe.dynamic_range_development,
      grainRoughness: recipe.grain_roughness,
      colorChrome: recipe.color_chrome,
    });

    if (metadata) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update(metadata)
        .eq("id", recipe.id);

      if (updateError) {
        console.error(`Failed to update recipe ${recipe.id}:`, updateError);
        failed++;
      } else {
        console.log(`✓ Recipe ${recipe.id} (${recipe.simulation})`);
        success++;
      }
    } else {
      console.error(`✗ Recipe ${recipe.id}: metadata generation returned null`);
      failed++;
    }

    // Throttle: ~1 request per second to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nBackfill complete: ${success} success, ${failed} failed`);
}

backfill().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/backfill-ai-metadata.ts
git commit -m "feat: add backfill script for AI metadata on existing recipes"
```

- [ ] **Step 3: Ensure `OPENAI_API_KEY` is set**

Verify that `OPENAI_API_KEY` is configured in `.env.local` (for local dev) and in Vercel environment variables (for production). This key is already used by `lib/translate.ts`, so it should already be set.

- [ ] **Step 4: Run backfill (after migration is applied)**

```bash
npx tsx scripts/backfill-ai-metadata.ts
```

Note: The `recipes_with_stats` view already filters `WHERE r.deleted_at IS NULL`, so soft-deleted recipes are automatically excluded.

---

## PR 3: Changelog + Guide Pages

### Task 8: Install gray-matter and Create Content Utility

**Files:**
- Create: `lib/content.ts`

- [ ] **Step 1: Create feature branch**

```bash
git checkout develop
git checkout -b feature/changelog-guide-pages
```

- [ ] **Step 2: Install gray-matter**

```bash
npm install gray-matter
```

- [ ] **Step 3: Create content utility**

Create `lib/content.ts` — generalizes the existing `getLegalContent` pattern with frontmatter support:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface ContentMeta {
  title: string;
  date?: string;
  summary?: string;
  slug: string;
}

export interface ContentEntry {
  meta: ContentMeta;
  content: string;
}

/**
 * Get a single content entry by section, slug, and locale.
 * Falls back to English if the locale file is missing.
 */
export function getContent(
  section: "changelog" | "guide",
  slug: string,
  locale: string,
): ContentEntry | null {
  const dir = path.join(CONTENT_DIR, section);
  const localePath = path.join(dir, `${slug}.${locale}.md`);
  const fallbackPath = path.join(dir, `${slug}.en.md`);

  const filePath = fs.existsSync(localePath) ? localePath : fallbackPath;
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    meta: {
      title: data.title ?? slug,
      date: data.date ?? undefined,
      summary: data.summary ?? undefined,
      slug,
    },
    content,
  };
}

/**
 * List all content entries for a section and locale, sorted by date desc.
 */
export function listContent(
  section: "changelog" | "guide",
  locale: string,
): ContentMeta[] {
  const dir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);

  // Extract unique slugs from filenames like "slug.en.md" or "slug.ko.md"
  const slugs = new Set<string>();
  for (const file of files) {
    const match = file.match(/^(.+)\.(en|ko)\.md$/);
    if (match) slugs.add(match[1]);
  }

  const entries: ContentMeta[] = [];
  for (const slug of slugs) {
    const entry = getContent(section, slug, locale);
    if (entry) entries.push(entry.meta);
  }

  // Sort by date descending (changelog), alphabetically for guide
  if (section === "changelog") {
    entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  } else {
    entries.sort((a, b) => a.title.localeCompare(b.title));
  }

  return entries;
}

/**
 * Get all slugs for a section (for generateStaticParams).
 */
export function getAllSlugs(section: "changelog" | "guide"): string[] {
  const dir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const slugs = new Set<string>();
  for (const file of files) {
    const match = file.match(/^(.+)\.(en|ko)\.md$/);
    if (match) slugs.add(match[1]);
  }
  return Array.from(slugs);
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/content.ts
git commit -m "feat: add content utility with frontmatter support"
```

---

### Task 9: Create Changelog Pages

**Files:**
- Create: `app/[locale]/changelog/page.tsx`
- Create: `app/[locale]/changelog/[slug]/page.tsx`
- Create: `content/changelog/2026-03-27-recommend-feature.en.md`
- Create: `content/changelog/2026-03-27-recommend-feature.ko.md`

- [ ] **Step 1: Create content directory and sample changelog**

```bash
mkdir -p content/changelog
```

Create `content/changelog/2026-03-27-recommend-feature.en.md`:

```markdown
---
title: "AI Recipe Recommendation"
date: "2026-03-27"
summary: "Upload a photo and discover similar film simulation recipes instantly."
slug: "recommend-feature"
---

## AI-Powered Recipe Recommendations

You can now upload any photo and find film simulation recipes that produce a similar look. Our recommendation engine analyzes color tones, contrast, and mood to find the best matches.

### How It Works

1. Go to the **Recommend** page
2. Upload a reference photo
3. Get instant recipe recommendations ranked by visual similarity

### Tips

- Photos with distinct color characteristics work best
- Try uploading photos from your favorite photographers for inspiration
- Each recommendation shows the exact recipe settings you can apply to your camera
```

Create `content/changelog/2026-03-27-recommend-feature.ko.md`:

```markdown
---
title: "AI 레시피 추천 기능"
date: "2026-03-27"
summary: "사진을 업로드하면 비슷한 느낌의 필름 시뮬레이션 레시피를 찾아드립니다."
slug: "recommend-feature"
---

## AI 기반 레시피 추천

사진을 업로드하면 비슷한 느낌의 필름 시뮬레이션 레시피를 바로 찾을 수 있습니다. 색감, 대비, 분위기를 분석하여 가장 잘 맞는 레시피를 추천합니다.

### 사용 방법

1. **추천** 페이지로 이동
2. 참고 사진 업로드
3. 시각적 유사도 순으로 레시피 추천 확인

### 팁

- 색감 특징이 뚜렷한 사진일수록 정확한 추천이 가능합니다
- 좋아하는 사진작가의 사진을 업로드해보세요
- 각 추천 결과에서 카메라에 바로 적용할 수 있는 레시피 설정을 확인할 수 있습니다
```

- [ ] **Step 2: Create changelog list page**

Create `app/[locale]/changelog/page.tsx`:

```typescript
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { listContent } from "@/lib/content";
import { getAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "changelog" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getAlternates("/changelog"),
  };
}

export default async function ChangelogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "changelog" });
  const entries = listContent("changelog", locale);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="space-y-6">
        {entries.map((entry) => (
          <article key={entry.slug} className="border-b border-border pb-6 last:border-0">
            <Link
              href={`/changelog/${entry.slug}`}
              className="group block"
            >
              <time className="text-xs text-muted-foreground">{entry.date}</time>
              <h2 className="mt-1 text-lg font-semibold group-hover:text-primary transition-colors">
                {entry.title}
              </h2>
              {entry.summary && (
                <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
              )}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create changelog detail page**

Create `app/[locale]/changelog/[slug]/page.tsx`:

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getContent, getAllSlugs } from "@/lib/content";
import { MarkdownContent } from "@/components/markdown-content";
import { BackButton } from "@/components/back-button";
import { getAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  const slugs = getAllSlugs("changelog");
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getContent("changelog", slug, locale);
  if (!entry) return {};

  return {
    title: entry.meta.title,
    description: entry.meta.summary,
    alternates: getAlternates(`/changelog/${slug}`),
  };
}

export default async function ChangelogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const entry = getContent("changelog", slug, locale);
  if (!entry) notFound();

  return (
    <div className="container py-8 md:py-12">
      <BackButton />
      <article className="mt-6">
        <time className="text-xs text-muted-foreground">{entry.meta.date}</time>
        <h1 className="mt-2 mb-8 text-2xl font-bold tracking-tight">
          {entry.meta.title}
        </h1>
        <MarkdownContent content={entry.content} />
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add content/changelog/ app/[locale]/changelog/
git commit -m "feat: add changelog pages with markdown content"
```

---

### Task 10: Create Guide Pages

**Files:**
- Create: `app/[locale]/guide/page.tsx`
- Create: `app/[locale]/guide/[slug]/page.tsx`
- Create: `content/guide/how-to-upload-recipe.en.md`
- Create: `content/guide/how-to-upload-recipe.ko.md`

- [ ] **Step 1: Create content directory and sample guide**

```bash
mkdir -p content/guide
```

Create `content/guide/how-to-upload-recipe.en.md`:

```markdown
---
title: "How to Upload a Recipe"
summary: "Learn how to extract and share your Fujifilm film simulation recipes."
slug: "how-to-upload-recipe"
---

## Uploading Your Film Simulation Recipe

Sharing your custom film simulation recipe is simple. Here's how to do it step by step.

### Step 1: Take a Photo

Take a photo with your Fujifilm camera using your custom film simulation settings.

### Step 2: Extract the Recipe

Go to the **Extract** page and upload your photo. The app will automatically read the EXIF makernotes from your image and extract all film simulation settings.

### Step 3: Review and Share

Review the extracted settings to make sure everything looks correct, then click **Share** to publish your recipe to the gallery.

### Supported Cameras

All Fujifilm X-series and GFX cameras with film simulation support are compatible.
```

Create `content/guide/how-to-upload-recipe.ko.md`:

```markdown
---
title: "레시피 업로드 방법"
summary: "후지필름 필름 시뮬레이션 레시피를 추출하고 공유하는 방법을 알아보세요."
slug: "how-to-upload-recipe"
---

## 필름 시뮬레이션 레시피 업로드

나만의 필름 시뮬레이션 레시피를 공유하는 방법은 간단합니다. 아래 단계를 따라해 보세요.

### 1단계: 사진 촬영

커스텀 필름 시뮬레이션 설정으로 후지필름 카메라로 사진을 촬영하세요.

### 2단계: 레시피 추출

**추출** 페이지에서 사진을 업로드하세요. 이미지의 EXIF 메이커노트에서 필름 시뮬레이션 설정을 자동으로 추출합니다.

### 3단계: 확인 및 공유

추출된 설정을 확인한 후 **공유** 버튼을 눌러 갤러리에 레시피를 게시하세요.

### 지원 카메라

필름 시뮬레이션을 지원하는 모든 후지필름 X 시리즈 및 GFX 카메라와 호환됩니다.
```

- [ ] **Step 2: Create guide list page**

Create `app/[locale]/guide/page.tsx` — same pattern as changelog list page but without dates:

```typescript
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { listContent } from "@/lib/content";
import { getAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guide" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getAlternates("/guide"),
  };
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "guide" });
  const entries = listContent("guide", locale);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="space-y-6">
        {entries.map((entry) => (
          <article key={entry.slug} className="border-b border-border pb-6 last:border-0">
            <Link
              href={`/guide/${entry.slug}`}
              className="group block"
            >
              <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {entry.title}
              </h2>
              {entry.summary && (
                <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
              )}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create guide detail page**

Create `app/[locale]/guide/[slug]/page.tsx` — same pattern as changelog detail, without date:

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getContent, getAllSlugs } from "@/lib/content";
import { MarkdownContent } from "@/components/markdown-content";
import { BackButton } from "@/components/back-button";
import { getAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  const slugs = getAllSlugs("guide");
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getContent("guide", slug, locale);
  if (!entry) return {};

  return {
    title: entry.meta.title,
    description: entry.meta.summary,
    alternates: getAlternates(`/guide/${slug}`),
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const entry = getContent("guide", slug, locale);
  if (!entry) notFound();

  return (
    <div className="container py-8 md:py-12">
      <BackButton />
      <article className="mt-6">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          {entry.meta.title}
        </h1>
        <MarkdownContent content={entry.content} />
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add content/guide/ app/[locale]/guide/
git commit -m "feat: add guide pages with markdown content"
```

**Note:** Additional content files from the spec (`getting-started`, `how-to-use-recommend` guides and `2026-03-14-i18n-support` changelog) are deferred — they can be added later as simple markdown files without any code changes.

---

### Task 11: Add i18n Messages, Footer Links, and Sitemap

**Files:**
- Modify: `messages/en.json` (add changelog + guide namespaces, footer keys)
- Modify: `messages/ko.json` (add changelog + guide namespaces, footer keys)
- Modify: `components/footer.tsx` (add changelog + guide links)
- Modify: `app/sitemap.ts` (add content pages)

- [ ] **Step 1: Add i18n message keys**

In `messages/en.json`, add:
```json
"changelog": {
  "title": "Changelog",
  "description": "Latest updates and improvements to film-simulation.site"
},
"guide": {
  "title": "Guides",
  "description": "Learn how to use film-simulation.site"
}
```

Add to `footer` namespace:
```json
"changelog": "Changelog",
"guide": "Guides"
```

In `messages/ko.json`, add:
```json
"changelog": {
  "title": "업데이트",
  "description": "film-simulation.site의 최신 업데이트 및 개선 사항"
},
"guide": {
  "title": "가이드",
  "description": "film-simulation.site 사용 방법 안내"
}
```

Add to `footer` namespace:
```json
"changelog": "업데이트",
"guide": "가이드"
```

- [ ] **Step 2: Add footer links**

In `components/footer.tsx`, add changelog and guide links after the terms link (line 26):

```tsx
<Link
  href="/changelog"
  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
>
  {t("changelog")}
</Link>
<Link
  href="/guide"
  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
>
  {t("guide")}
</Link>
```

- [ ] **Step 3: Update sitemap**

In `app/sitemap.ts`, add imports and content page entries.

Add at top:
```typescript
import { getAllSlugs } from "@/lib/content";
```

Add after `staticPages` definition (after line 67):
```typescript
// --- Content pages ---
const changelogSlugs = getAllSlugs("changelog");
const changelogPages = [
  localized("/changelog", { priority: 0.5, changeFrequency: "weekly" as const }),
  ...changelogSlugs.map((slug) =>
    localized(`/changelog/${slug}`, { priority: 0.4, changeFrequency: "monthly" as const }),
  ),
];

const guideSlugs = getAllSlugs("guide");
const guidePages = [
  localized("/guide", { priority: 0.6, changeFrequency: "monthly" as const }),
  ...guideSlugs.map((slug) =>
    localized(`/guide/${slug}`, { priority: 0.5, changeFrequency: "monthly" as const }),
  ),
];
```

Add `...changelogPages, ...guidePages,` to the return array.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ko.json components/footer.tsx app/sitemap.ts
git commit -m "feat: add footer links, i18n keys, and sitemap entries for content pages"
```

---

## Deployment Order

1. **PR 1** — Merge anytime, no DB changes
2. **PR 2** — Apply migration (`supabase db push` to prod), verify, then merge PR. Run backfill script after deploy.
3. **PR 3** — Merge anytime, no DB changes

PRs 1 and 3 can be developed and merged in parallel.
