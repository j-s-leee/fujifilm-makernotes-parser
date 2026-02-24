# Film Recipe Viewer — Redesign & Community Platform Design

**Date**: 2026-02-24
**Status**: Approved

## Overview

Redesign the Fujifilm Film Recipe Viewer with a minimal/clean aesthetic, then evolve it into a community platform with recipe sharing, photo gallery, and statistics.

## Approach

**Incremental Enhancement (Approach A):**
- Phase 1: Client-only UI/UX redesign. No backend.
- Phase 2: Add Supabase (auth, database, storage) for community features.

## Phase 1: UI/UX Redesign

### Pages & Navigation

- **Home (`/`)** — Recipe viewer with hero dropzone, photo preview + recipe card.
- Header: Logo/app name (left), dark mode toggle + Feedback link (right).
- Centered max-width container (~1200px) with consistent spacing.
- Footer: Copyright + links, simplified.
- Navigation expands in Phase 2 to include Gallery, Statistics, Login/Profile.

### Recipe Viewer UX

**Dropzone:**
- Large drop area with dashed border, Upload icon, clear CTA text.
- Drag-over: border color change + subtle scale animation.
- After upload: dropzone collapses to a small "Upload another" strip, focus shifts to results.

**Photo preview:**
- Max ~600px wide, rounded corners, subtle shadow, smooth fade-in.

**Recipe card:**
- Film simulation name as prominent header (large type).
- Settings in 2-column grid with label/value pairs.
- Visual hierarchy: Film Simulation > White Balance/Grain/Color Chrome > Tone > Other.
- Copy button with subtle icon in card header.
- Values use `+`/`-` signs with clear formatting.

**Empty state:**
- Only the dropzone visible with tagline: "Drop a Fujifilm JPEG to extract its film recipe."

### Visual Design System

**Typography:**
- Font: Space Grotesk (existing).
- Scale: 12px labels, 14px body, 18px headings, 24px page titles.

**Color palette:**
- Pure grayscale, no accent color.
- Light: white bg, #1a1a1a text, #f5f5f5 surfaces.
- Dark: #0a0a0a bg, #e5e5e5 text, #1a1a1a surfaces.

**Components:**
- Continue with Radix UI + Tailwind + shadcn/ui. Refine existing component styling.

**Spacing:**
- 8px grid (Tailwind p-2, p-4, p-8, etc.).
- 32px between major sections, 16px within cards.

**Responsive:**
- Mobile-first. Stacked < 768px, two-column >= 768px.

### Project Structure (Phase 1)

```
app/
  page.tsx              — Home/recipe viewer
  layout.tsx            — Root layout
  globals.css           — Global styles
components/
  image-dropzone.tsx    — Redesigned dropzone
  recipe-card.tsx       — Redesigned recipe card
  recipe-item.tsx       — Individual setting row (extracted)
  header.tsx            — Extracted header component
  footer.tsx            — Extracted footer component
  mode-toggle.tsx       — Dark mode toggle (existing)
  theme-provider.tsx    — Theme provider (existing)
  ui/                   — shadcn/ui components (existing)
fujifilm/
  makerNoteParser.ts    — Binary parser (no changes)
  recipe.ts             — Recipe type + parsing (no changes)
  simulation.ts         — Simulation type + parsing (no changes)
hooks/
  use-toast.ts          — Toast hook (existing)
lib/
  utils.ts              — Utilities (existing)
```

### Error Handling

- Toast-based errors for: no MakerNote found, parse failures, non-Fujifilm images.
- No changes needed — current pattern is clean.

### Performance

- `URL.createObjectURL` for image preview (no change).
- MakerNote parsing is synchronous and fast (~1ms).
- Fully client-side, no SSR needed.

## Phase 2: Community Platform (Future)

### Architecture

- **Auth**: Supabase Auth with Google + GitHub OAuth.
- **Database**: Supabase Postgres.
- **Storage**: Supabase Storage for compressed thumbnails (~400px wide, ~50KB each).
- **Hosting**: Vercel (app) + Cloudflare (CDN/DNS).

### Data Model

- `users` — Managed by Supabase Auth.
- `recipes` — Parsed recipe data + thumbnail URL, linked to user.
- `favorites` — user_id + recipe_id join table.
- `recipe_stats` — Materialized/aggregated stats for trending queries.

### Image Flow

1. User uploads JPEG, client parses MakerNote (same as Phase 1).
2. Client compresses image to ~400px wide thumbnail via canvas.
3. Thumbnail uploaded to Supabase Storage.
4. Recipe data + thumbnail URL stored in `recipes` table.

### Gallery (`/gallery`)

- Photo grid (CSS Grid): 3-4 columns desktop, 2 mobile.
- Infinite scroll or pagination.
- Click photo → modal with full recipe details.
- Filter by film simulation.
- Sort by: newest, most favorited.

### Statistics (`/stats`)

- Film simulation distribution (pie/bar chart).
- Popular recipes ranking (list).
- Trends over time (line chart, monthly).
- Chart library: Recharts (lightweight).

### Auth Flow

- Login button in header → OAuth redirect → callback.
- Public viewing (no auth required).
- Sharing recipes and favoriting requires login.
- User profile: avatar, name, shared recipes list.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Incremental (A) | Ship Phase 1 fast, add complexity only when needed |
| Design aesthetic | Minimal & clean | Focus on photography, reduce visual noise |
| Accent color | Pure grayscale | Most minimal, relies on contrast and typography |
| Image storage | Compressed thumbnails in Supabase | 1GB free tier (~20K images), simple setup |
| Auth | Supabase Auth (OAuth) | Built-in, pairs with database |
| Priority | Phase 1 (UI) first | Polish core experience before adding social features |
