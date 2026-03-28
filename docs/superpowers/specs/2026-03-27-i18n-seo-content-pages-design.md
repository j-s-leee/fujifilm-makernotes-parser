# Recipe i18n Labels + GPT SEO Metadata + Content Pages

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Three independent features delivered as separate PRs

---

## PR 1: Recipe Settings Label i18n

### Goal
Display recipe setting property names in Korean when locale is `ko`, matching official Fujifilm camera menu names.

### Changes
**File:** `messages/ko.json` — update `recipeSettings` namespace only.

| Key | Current (ko.json) | Updated |
|---|---|---|
| filmSimulation | Film Simulation | 필름 시뮬레이션 |
| dynamicRange | Dynamic Range | 다이나믹 레인지 |
| grainEffect | Grain Effect | 그레인 효과 |
| colorChrome | Color Chrome | 컬러 크롬 효과 |
| colorChromeFXBlue | Color Chrome FX Blue | 컬러 크롬 FX 블루 |
| whiteBalance | 화이트 밸런스 | 화이트 밸런스 (no change) |
| toneCurve | Tone Curve | 톤 곡선 |
| color | Color | 색농도 |
| sharpness | Sharpness | 샤프니스 |
| noiseReduction | Noise Reduction | 노이즈 리덕션 |
| clarity | Clarity | 선명도 |
| bwAdjustment | BW Adjustment | 흑백 조정 |
| bwMG | BW M/G | 흑백 M/G |

Note: `title` ("레시피 설정"), `copyRecipe` ("레시피 복사"), `copied` ("복사됨!") are already translated and excluded from this table.

### Additional: handleCopy i18n
`components/recipe-settings.tsx` `handleCopy()` contains hardcoded English strings ("Highlight", "Shadow", "WB Shift") that should also be translated. Add these keys to the `recipeSettings` namespace in both `en.json` and `ko.json`:

| New Key | en | ko |
|---|---|---|
| highlight | Highlight | 하이라이트 |
| shadow | Shadow | 섀도우 |
| wbShift | WB Shift | WB 시프트 |

### Implementation
- Update `ko.json` `recipeSettings` namespace with Korean labels
- Add new keys to both `en.json` and `ko.json` for handleCopy strings
- Update `handleCopy()` to use `t()` for the hardcoded strings
- No other code changes — display labels already use `useTranslations("recipeSettings")`

### Reference
Korean labels sourced from official Fujifilm camera menu names (Korean language setting).

---

## PR 2: GPT Vision SEO Metadata Generation

### Goal
Auto-generate SEO description and image alt text for each recipe using GPT-4o mini Vision API, in both English and Korean.

### Data Flow
```
Recipe upload → R2 image upload complete
→ New server API route: POST /api/generate-metadata
  → GPT-4o mini Vision API call (image URL + recipe settings)
  → Returns: description (en/ko) + alt_text (en/ko)
→ Save to recipes table
→ generateMetadata() uses DB values (locale-aware)
→ <Image> alt uses DB values
```

### DB Migration

**Step 1: Add columns to `recipes` table:**
```sql
ALTER TABLE public.recipes
  ADD COLUMN ai_description_en text DEFAULT null,
  ADD COLUMN ai_description_ko text DEFAULT null,
  ADD COLUMN ai_alt_text_en text DEFAULT null,
  ADD COLUMN ai_alt_text_ko text DEFAULT null;
```

**Step 2: Update `recipes_with_stats` view:**
Use `CREATE OR REPLACE VIEW` to append the 4 new columns. Safe operation per CLAUDE.md conventions since columns are appended at the end.

**Step 3: Update `RECIPE_DETAIL_SELECT` in `lib/queries.ts`:**
Add `ai_description_en, ai_description_ko, ai_alt_text_en, ai_alt_text_ko` to the select string.

### GPT API Call
- **Model:** GPT-4o mini (same model already used for translations)
- **Input:** R2 image URL (publicly accessible via Cloudflare R2) + recipe settings (simulation, camera_model, key settings)
- **Output:** SEO description (1-2 sentences, en + ko) + alt text (1 sentence, en + ko)
- **Call location:** New server-side API route `POST /api/generate-metadata` — called from `lib/share-recipe.ts` after recipe insert. OpenAI API key stays server-side only.
- **Cost:** ~$0.001 per recipe (~$1 per 1,000 recipes)
- **Error handling:** If GPT call fails, recipe is saved without AI metadata (non-blocking). Fallback to current template-based metadata.

### GPT Prompt (draft)
```
You are an SEO specialist for a Fujifilm film simulation recipe sharing website.

Given the photo and recipe settings below, generate:
1. An SEO meta description (1-2 sentences, ~150 chars) describing the photo's mood, subject, and the film simulation used
2. An image alt text (1 sentence) describing what is visually in the photo

Recipe settings:
- Film Simulation: {simulation}
- Camera: {camera_model}
- Key settings: DR{dynamic_range}, {grain_roughness} grain, {color_chrome} chrome

Respond in JSON format:
{
  "description_en": "...",
  "description_ko": "...",
  "alt_text_en": "...",
  "alt_text_ko": "..."
}
```

### Metadata Usage
- `app/[locale]/recipes/[id]/page.tsx` `generateMetadata()`: read `locale` from params, use `ai_description_{locale}` if present, else fall back to current `"{simulation} recipe shot on {camera}"` template. This is a behavioral change — current implementation ignores locale for metadata.
- `components/recipe-hero.tsx`: use `ai_alt_text_{locale}` for `<Image>` alt prop if present, else fall back to current alt text.

### Backfill
One-time standalone script (not a DB migration) to generate metadata for existing recipes.
- Process sequentially with throttling (~1 req/sec) to avoid OpenAI rate limits
- Log progress and errors for manual review
- Can be re-run safely (skip recipes that already have AI metadata)

---

## PR 3: Changelog + Guide Pages

### Goal
Create SEO-friendly content pages for changelog (release notes) and usage guides, using markdown files with locale-based file separation.

### Content Format Decision
Use plain `.md` files (not `.mdx`) to match existing pattern in `content/legal/`. MDX is unnecessary since content is prose with headings — no React components needed. This avoids adding `next-mdx-remote` or `@next/mdx` as new dependencies. Use `gray-matter` for frontmatter parsing and an existing markdown renderer.

### Content Structure
```
content/
  changelog/
    2026-03-27-recommend-feature.en.md
    2026-03-27-recommend-feature.ko.md
    2026-03-14-i18n-support.en.md
    2026-03-14-i18n-support.ko.md
  guide/
    getting-started.en.md
    getting-started.ko.md
    how-to-upload-recipe.en.md
    how-to-upload-recipe.ko.md
    how-to-use-recommend.en.md
    how-to-use-recommend.ko.md
```

### Frontmatter Schema
```yaml
---
title: "AI Recipe Recommendation Launch"
date: "2026-03-27"        # changelog only
summary: "Upload an image and get similar recipe recommendations"
slug: "recommend-feature"  # used in URL
---
```

### Route Structure
```
app/[locale]/
  changelog/
    page.tsx          # list page — shows all changelogs, sorted by date desc
    [slug]/page.tsx   # individual changelog entry
  guide/
    page.tsx          # list page — shows all guides
    [slug]/page.tsx   # individual guide page
```

### i18n Strategy
- Locale-based file separation: `{slug}.en.md` / `{slug}.ko.md`
- Pages read markdown files matching current locale
- If a locale file is missing, fall back to English
- Each page generates proper `alternates` for SEO (hreflang)

### i18n Message Keys
Add to both `en.json` and `ko.json`:

```json
"changelog": {
  "title": "Changelog",
  "description": "Latest updates and improvements"
},
"guide": {
  "title": "Guides",
  "description": "Learn how to use film-simulation.site"
}
```

### Markdown Processing
- Use `gray-matter` for frontmatter parsing (already used or lightweight)
- Use `react-markdown` or similar for rendering
- `generateStaticParams()` scans `content/` directory via `fs.readdirSync` for all slug/locale combinations
- Content files committed to repo — available at build time on Vercel

### Sitemap
Update `app/sitemap.ts` to include changelog and guide pages. Scan `content/changelog/` and `content/guide/` directories with `fs.readdirSync`, extract slugs from filenames, and generate entries for each locale.

### Navigation
Add "Changelog" and "Guide" links to the **footer** alongside existing "Privacy" and "Terms" links. Add corresponding keys to footer namespace in `en.json` / `ko.json`.

### SEO
- Each page gets its own `generateMetadata()` with title/description from frontmatter
- Proper Open Graph tags per page
- hreflang alternates for en/ko

---

## Deployment Order

1. **PR 1 (i18n labels)** — No DB changes, deploy anytime
2. **PR 2 (GPT metadata)** — DB migration first (columns + view update), then code deploy, then backfill script
3. **PR 3 (content pages)** — No DB changes, deploy anytime

PRs 1 and 3 are fully independent and can be developed/merged in parallel.
PR 2 depends on no other PR but requires migration coordination per CLAUDE.md rules (DB first, code second).
