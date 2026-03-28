# Home Feature Carousel + Motion Animation

**Date:** 2026-03-28
**Status:** Draft
**Scope:** Replace vertical feature rows with horizontal swipe carousel, upgrade all animations to spring-based Motion

---

## Goal

Replace the current vertical feature showcase (3 stacked FeatureRows) with a horizontal swipe carousel with autoplay. Upgrade all home page animations from CSS transitions to Motion spring physics for a more organic, Apple-style feel. Ensure the trending recipes section is visible on page load so users know there's content below.

## Current State

- `components/feature-showcase.tsx` (469 lines): Contains `FeatureShowcase`, `FeatureRow`, `useScrollAnim`, `useReveal`, and 3 mockup components (`ExtractMockup`, `ImageSearchMockup`, `TextSearchMockup`)
- `components/reveal-on-scroll.tsx`: IntersectionObserver wrapper (only imported in `app/[locale]/page.tsx`)
- `tailwind.config.ts`: Custom `fade-in-up` keyframe (only used in `app/[locale]/page.tsx` hero)
- Animations: CSS transitions + IntersectionObserver + setInterval step timers
- No external animation library (only `tailwindcss-animate` for utilities)

## Design

### Library Addition

Add `motion` package (successor to framer-motion). Use `LazyMotion` + `domAnimation` for code-split loading (~5KB initial, ~15KB lazy). The `motion` package supports React 19.

### Client/Server Component Boundary

`app/[locale]/page.tsx` is a Server Component and must remain so (it fetches trending recipes server-side). Motion components require `"use client"`.

**Solution:**
- `FeatureCarousel` → new `"use client"` component (contains all Motion + drag + state)
- Hero animation → extract into a small `"use client"` `HeroSection` component
- Trending `whileInView` → extract into a `"use client"` `TrendingSection` wrapper
- `LazyMotion` provider → placed inside each client component (not in layout), or in a shared `MotionProvider` client component that wraps the home page children
- `app/[locale]/page.tsx` stays a Server Component, importing these client components

### Structure Change

```
page.tsx (Server Component)
├── HeroSection (Client - motion spring fade-in-up)
├── FeatureCarousel (Client - full carousel with drag/autoplay)
│   ├── Slide 1: Extract (icon + description + CTA link + ExtractMockup)
│   ├── Slide 2: Image Search (icon + description + CTA link + ImageSearchMockup)
│   └── Slide 3: Text Search (icon + description + CTA link + TextSearchMockup)
│   ├── Dot indicator with progress bar
│   └── Left/Right arrows (desktop only)
└── TrendingSection (Client - whileInView spring reveal)
    └── TrendingGrid (server-rendered children passed through)
```

### Carousel Behavior

**State management:**
- `useState<number>` for current slide index (0, 1, 2)
- Dot indicators, autoplay timer, and mockup lifecycle all derive from this single index
- Slide change updates index → triggers `AnimatePresence` transition + mockup reset

**Navigation:**
- Touch swipe on mobile (native drag gesture via `motion.div` + `drag="x"`)
- Drag on desktop + left/right arrow buttons
- Dot indicators for direct slide selection
- Snap to nearest slide on release (spring physics with slight overshoot)
- **Infinite loop**: slide 3 → slide 1 wraps around (both directions)
- Arrow keys navigate slides when carousel is focused

**Drag constraints:**
- `dragConstraints`: limit drag to ±1 slide width
- `dragElastic: 0.2`: slight rubber-band past edges
- Velocity threshold: swipe must exceed 50px distance OR 500px/s velocity to advance, otherwise snap back

**Autoplay:**
- Auto-advance every ~4 seconds
- Pause on user touch/drag interaction
- Pause when tab is not visible (`document.hidden`)
- Resume autoplay ~5 seconds after last user interaction
- Progress indicator on active dot: thin bar that fills left-to-right over 4 seconds (CSS `animation: progress 4s linear`)

**Slide transitions:**
- `AnimatePresence` with spring-based enter/exit
- Direction-aware: slide left when advancing, slide right when going back
- Spring config: `{ type: "spring", stiffness: 300, damping: 30 }` (slight overshoot)

**Resize handling:**
- Recalculate slide width on `window.resize` (debounced)
- Re-snap to current slide index after resize

### Carousel Height

Fixed height per breakpoint to prevent layout shift:
- Calculate from the tallest mockup content
- Use Tailwind responsive height classes (e.g., `h-[400px] sm:h-[350px]`)
- Mockup content vertically centered within fixed height

### Slide Layout

Each slide contains: icon, title, description, CTA link ("Try it →"), and mockup animation.

**Desktop (sm+):**
- Horizontal layout: text (icon + title + description + CTA) on left, mockup on right
- Consistent layout across all slides (no alternating sides)

**Mobile:**
- Vertical stack: text on top, mockup below
- Full width, touch-swipe to navigate

### Mockup Animations (per slide)

Keep existing step-based auto-advancing logic (`useScrollAnim` pattern) but:

- Only play when slide is **active** (current carousel index matches)
- **Reset instantly** to step 0 when slide becomes inactive (no fade-out, just snap reset)
- Start animation after a 400ms delay when slide becomes active (let transition settle)
- Replace CSS `transition-opacity duration-500` with Motion spring animations
- Replace CSS stagger delays with Motion `variants` + `staggerChildren: 0.08`

**ExtractMockup (3 steps, 1600ms interval):**
- Step 1: Upload area border + background animate (spring scale + opacity)
- Step 2: Settings section springs in from below
- Step 3: Share button springs in with slight bounce

**ImageSearchMockup (3 steps, 1600ms interval):**
- Step 1: Image upload area transforms with spring color transition
- Step 2: Loading indicator springs in
- Step 3: Result rows stagger in with `staggerChildren`

**TextSearchMockup (3 steps, 1600ms interval):**
- Step 1: Typing effect (keep existing setInterval char-by-char, works well)
- Step 2: Loading indicator springs in
- Step 3: Result rows stagger in with `staggerChildren`

### Hero Animation

Extract into `HeroSection` client component:

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 200, damping: 20 }}
>
```

### Trending Section

Extract into `TrendingSection` client component wrapper, replacing `RevealOnScroll`:

```tsx
<motion.section
  initial={{ opacity: 0, y: 32 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.1 }}
  transition={{ type: "spring", stiffness: 200, damping: 25 }}
>
  {children}
</motion.section>
```

Children (TrendingGrid with recipe cards) are passed from the server component.

### File Changes

| Action | File | Description |
|--------|------|-------------|
| Create | `components/feature-carousel.tsx` | New carousel component (`"use client"`) with FeatureCarousel export. Move mockup components here from feature-showcase.tsx |
| Create | `components/hero-section.tsx` | Small `"use client"` wrapper for hero with Motion animation |
| Create | `components/trending-section.tsx` | Small `"use client"` wrapper replacing RevealOnScroll |
| Delete | `components/feature-showcase.tsx` | Replaced by feature-carousel.tsx |
| Delete | `components/reveal-on-scroll.tsx` | Replaced by trending-section.tsx |
| Modify | `app/[locale]/page.tsx` | Import new components, keep as Server Component |
| Modify | `package.json` | Add `motion` dependency |

### Cleanup

- Remove `animate-fade-in-up` keyframe from `tailwind.config.ts` after migration (only consumer is hero, being replaced)
- Remove `useReveal` hook (moved into carousel logic)

### Performance Considerations

- `LazyMotion` code-splits animation features (~5KB initial, rest lazy)
- Autoplay pauses on hidden tab (no wasted CPU)
- Mockup animations only run on active slide
- `will-change: transform` applied by Motion automatically during animations
- `viewport={{ once: true }}` for trending section (animate once, no re-triggers)
- Fixed carousel height prevents layout shift

### Accessibility

- Carousel has `role="region"` and `aria-roledescription="carousel"` and `aria-label`
- Each slide has `role="group"` and `aria-roledescription="slide"`
- Dots are buttons with `aria-label="Go to slide N"` and `aria-current` on active
- Arrow buttons have `aria-label="Previous slide"` / `"Next slide"`
- Arrow keys (left/right) navigate slides when carousel is focused
- `prefers-reduced-motion` media query: disable autoplay, use instant transitions (no spring)
- Pause autoplay on focus within carousel (keyboard navigation)
- Live region announces current slide for screen readers
