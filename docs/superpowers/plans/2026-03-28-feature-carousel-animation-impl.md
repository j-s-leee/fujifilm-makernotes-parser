# Feature Carousel + Motion Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vertical feature rows with a horizontal swipe carousel with autoplay and upgrade all home page animations to Motion spring physics.

**Architecture:** Install `motion` package. Create three new client components (`feature-carousel.tsx`, `hero-section.tsx`, `trending-section.tsx`) to handle animations while keeping `page.tsx` as a Server Component. Delete `feature-showcase.tsx` and `reveal-on-scroll.tsx`. The carousel uses `motion.div` drag gestures with spring snap, autoplay timer, and step-based mockup animations that only run on the active slide.

**Tech Stack:** Next.js 15 (App Router), Motion (framer-motion successor), React 19, Tailwind CSS, next-intl

**Spec:** `docs/superpowers/specs/2026-03-28-feature-carousel-animation-design.md`

---

## Task 1: Install Motion and Create Hero Section

**Files:**
- Modify: `package.json` (add `motion` dependency)
- Create: `components/hero-section.tsx`
- Modify: `app/[locale]/page.tsx:27-34` (replace hero div with HeroSection)

- [ ] **Step 1: Install motion**

```bash
npm install motion
```

- [ ] **Step 2: Create `components/hero-section.tsx`**

```tsx
"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
```

- [ ] **Step 3: Update `app/[locale]/page.tsx` hero section**

Replace lines 27-34:
```tsx
<div className="text-center animate-fade-in-up">
```
With:
```tsx
import { HeroSection } from "@/components/hero-section";
// ...
<HeroSection>
```

Keep the h1 and p children as-is. Remove the `animate-fade-in-up` class.

- [ ] **Step 4: Verify build**
```bash
npm run build
```

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json components/hero-section.tsx app/[locale]/page.tsx
git commit -m "feat: add Motion library and hero spring animation"
```

---

## Task 2: Create Trending Section (replace RevealOnScroll)

**Files:**
- Create: `components/trending-section.tsx`
- Modify: `app/[locale]/page.tsx:41-57` (replace RevealOnScroll with TrendingSection)
- Delete: `components/reveal-on-scroll.tsx`

- [ ] **Step 1: Create `components/trending-section.tsx`**

```tsx
"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

export function TrendingSection({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Update `app/[locale]/page.tsx`**

Replace `RevealOnScroll` import with `TrendingSection`:
```tsx
import { TrendingSection } from "@/components/trending-section";
```

Replace `<RevealOnScroll>` / `</RevealOnScroll>` with `<TrendingSection>` / `</TrendingSection>`.

Remove the `RevealOnScroll` import.

- [ ] **Step 3: Delete `components/reveal-on-scroll.tsx`**

```bash
rm components/reveal-on-scroll.tsx
```

- [ ] **Step 4: Verify build**
```bash
npm run build
```

- [ ] **Step 5: Commit**
```bash
git add components/trending-section.tsx app/[locale]/page.tsx
git rm components/reveal-on-scroll.tsx
git commit -m "feat: replace RevealOnScroll with Motion whileInView"
```

---

## Task 3: Create Feature Carousel — Core Structure and Navigation

This is the main task. Create the carousel component with slide navigation, drag gestures, dot indicators, and arrow buttons. Mockup animations will be migrated in the next task.

**Files:**
- Create: `components/feature-carousel.tsx`

- [ ] **Step 1: Create `components/feature-carousel.tsx` with carousel structure**

Read the current `components/feature-showcase.tsx` fully for reference. The new file should:

1. Be `"use client"` with `LazyMotion` + `domAnimation`
2. Export `FeatureCarousel` component that accepts translations via `useTranslations("home.features")`
3. Define slide data array with icon, title key, description key, href, cta key, and mockup component
4. Implement carousel state with `useState<number>` for current index
5. Implement `AnimatePresence` with direction-aware slide transitions (spring physics)
6. Add dot indicators as buttons with `aria-label` and active progress bar
7. Add left/right arrow buttons (visible on `sm+` only) with `aria-label`
8. Add keyboard navigation (left/right arrow keys when focused)
9. Implement infinite loop: advancing past last slide goes to first, and vice versa

**Carousel layout per slide:**
- Desktop (`sm+`): flex-row — text (icon + title + description + CTA link) on left, mockup on right
- Mobile: flex-col — text on top, mockup below

**Spring config for slide transitions:**
```tsx
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

**Slide transition with AnimatePresence:**
```tsx
const [[activeIndex, direction], setSlide] = useState([0, 0]);

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

// In JSX:
<AnimatePresence mode="wait" custom={direction}>
  <m.div
    key={activeIndex}
    custom={direction}
    variants={variants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.2}
    onDragEnd={handleDragEnd}
  >
    {/* Slide content */}
  </m.div>
</AnimatePresence>
```

**Drag handler:**
```tsx
function handleDragEnd(
  _: unknown,
  info: { offset: { x: number }; velocity: { x: number } }
) {
  const swipeThreshold = 50;
  const velocityThreshold = 500;

  if (
    info.offset.x < -swipeThreshold ||
    info.velocity.x < -velocityThreshold
  ) {
    paginate(1); // next
  } else if (
    info.offset.x > swipeThreshold ||
    info.velocity.x > velocityThreshold
  ) {
    paginate(-1); // prev
  }
}

function paginate(dir: number) {
  setSlide(([prev]) => {
    const next = (prev + dir + slides.length) % slides.length;
    return [next, dir];
  });
}
```

**Dot indicators with progress bar:**
```tsx
<div className="flex justify-center gap-2 mt-6">
  {slides.map((_, i) => (
    <button
      key={i}
      onClick={() => setSlide([i, i > activeIndex ? 1 : -1])}
      aria-label={`Go to slide ${i + 1}`}
      className={`relative h-1.5 rounded-full transition-all duration-300 ${
        i === activeIndex ? "w-8 bg-foreground/20" : "w-1.5 bg-foreground/10"
      }`}
    >
      {i === activeIndex && (
        <m.div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/60"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4, ease: "linear" }}
          key={`progress-${activeIndex}`}
        />
      )}
    </button>
  ))}
</div>
```

**Arrow buttons (desktop only):**
```tsx
<button
  onClick={() => paginate(-1)}
  aria-label="Previous slide"
  className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted transition-colors"
>
  <ChevronLeft className="h-4 w-4" />
</button>
```

**Fixed height container:**
```tsx
<div className="relative overflow-hidden h-[420px] sm:h-[320px]">
```

**Accessibility:**
- Carousel wrapper: `role="region"` + `aria-roledescription="carousel"` + `aria-label={t("carouselLabel") or "Features"}`
- Each slide: `role="group"` + `aria-roledescription="slide"` + `aria-label={slide title}`
- `onKeyDown` handler for left/right arrow keys
- `tabIndex={0}` on carousel container for focus

**Reduced motion:**
```tsx
import { useReducedMotion } from "motion/react";
const prefersReduced = useReducedMotion();
// If prefersReduced, use { duration: 0 } for transitions
```

- [ ] **Step 2: Verify build (carousel without mockups first)**

Temporarily render placeholder divs instead of mockup components to verify the carousel structure works:

```tsx
<div className="h-40 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
  Mockup {activeIndex + 1}
</div>
```

```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add components/feature-carousel.tsx
git commit -m "feat: add feature carousel with drag, arrows, dots, and spring transitions"
```

---

## Task 4: Add Autoplay and Mockup Animations

**Files:**
- Modify: `components/feature-carousel.tsx` (add autoplay + move mockup components from feature-showcase.tsx)

- [ ] **Step 1: Add autoplay logic**

Add autoplay to the carousel that:
- Auto-advances every 4 seconds
- Pauses on user drag/click interaction (resume after 5s of inactivity)
- Pauses when `document.hidden` is true
- Pauses when `prefers-reduced-motion` is active
- Resets progress bar animation on each slide change

```tsx
const [isPaused, setIsPaused] = useState(false);
const lastInteraction = useRef(Date.now());

// Autoplay timer
useEffect(() => {
  if (prefersReduced || isPaused) return;

  const timer = setInterval(() => {
    const idleTime = Date.now() - lastInteraction.current;
    if (idleTime < 5000) return; // Wait for 5s idle after interaction
    if (document.hidden) return;
    paginate(1);
  }, 4000);

  return () => clearInterval(timer);
}, [prefersReduced, isPaused, activeIndex]);

// Track user interaction
function onUserInteraction() {
  lastInteraction.current = Date.now();
}

// Pause on visibility change
useEffect(() => {
  const handler = () => {
    if (document.hidden) setIsPaused(true);
    else setIsPaused(false);
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}, []);
```

Add `onUserInteraction()` calls to: drag start, dot click, arrow click.

- [ ] **Step 2: Move and adapt mockup components**

Copy `ExtractMockup`, `ImageSearchMockup`, `TextSearchMockup`, `SettingMockRow`, `RecipeResultRow` from `components/feature-showcase.tsx` into `components/feature-carousel.tsx`.

**Key changes to mockups:**

1. Replace `useScrollAnim` with a new `useSlideAnim` hook that takes `isActive: boolean` instead of using IntersectionObserver:

```tsx
function useSlideAnim(
  isActive: boolean,
  stepCount: number,
  interval: number,
  pauseAtEnd: number,
) {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    // Reset instantly when becoming inactive
    if (!isActive) {
      setStep(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Start after 400ms delay when becoming active
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setStep((prev) => (prev >= stepCount ? prev : prev + 1));
      }, interval);
    }, 400);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, stepCount, interval]);

  // Loop: reset after pause at end
  useEffect(() => {
    if (step >= stepCount && isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      timeoutRef.current = setTimeout(() => {
        setStep(0);
        timerRef.current = setInterval(() => {
          setStep((prev) => (prev >= stepCount ? prev : prev + 1));
        }, interval);
      }, pauseAtEnd);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [step, stepCount, interval, pauseAtEnd, isActive]);

  return step;
}
```

2. Update each mockup to accept `isActive: boolean` prop and pass it to `useSlideAnim`:

```tsx
function ExtractMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 3, 1600, 2500);
  // ... rest stays the same
}
```

Remove `ref` from mockup divs (no longer needed for IntersectionObserver).

3. Replace CSS transition classes with Motion spring animations on step-dependent elements. For example:

**Before (CSS transition):**
```tsx
<div className={`transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-0"}`}>
```

**After (Motion spring):**
```tsx
<m.div
  initial={{ opacity: 0, y: 8 }}
  animate={step >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
>
```

4. Replace `RecipeResultRow` CSS stagger with Motion variants:

```tsx
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

// Usage:
<m.div
  variants={containerVariants}
  initial="hidden"
  animate={step >= 3 ? "show" : "hidden"}
>
  {results.map((r) => (
    <m.div key={r.name} variants={itemVariants} className="...">
      {/* result row content */}
    </m.div>
  ))}
</m.div>
```

- [ ] **Step 3: Wire mockups into carousel slides**

In the carousel, pass `isActive={activeIndex === i}` to each mockup:

```tsx
const slides = [
  { ..., mockup: ExtractMockup },
  { ..., mockup: ImageSearchMockup },
  { ..., mockup: TextSearchMockup },
];

// In render:
const Mockup = slides[activeIndex].mockup;
<Mockup isActive={true} />
```

- [ ] **Step 4: Verify build**
```bash
npm run build
```

- [ ] **Step 5: Commit**
```bash
git add components/feature-carousel.tsx
git commit -m "feat: add autoplay and spring mockup animations to carousel"
```

---

## Task 5: Integrate Carousel into Home Page and Clean Up

**Files:**
- Modify: `app/[locale]/page.tsx` (replace FeatureShowcase with FeatureCarousel)
- Delete: `components/feature-showcase.tsx`
- Modify: `tailwind.config.ts` (remove unused `fade-in-up` keyframe)

- [ ] **Step 1: Update `app/[locale]/page.tsx`**

Replace `FeatureShowcase` import with `FeatureCarousel`:
```tsx
import { FeatureCarousel } from "@/components/feature-carousel";
```

Replace `<FeatureShowcase />` (line 36) with `<FeatureCarousel />`.

Remove the `FeatureShowcase` import.

- [ ] **Step 2: Delete `components/feature-showcase.tsx`**

```bash
rm components/feature-showcase.tsx
```

- [ ] **Step 3: Remove unused `fade-in-up` keyframe from `tailwind.config.ts`**

Read `tailwind.config.ts`. Remove the `'fade-in-up'` entry from both `animation` and `keyframes` objects. Keep `marquee` and `marquee-vertical` (used by other components).

- [ ] **Step 4: Verify build**
```bash
npm run build
```

Expected: Build succeeds. Home page renders with carousel.

- [ ] **Step 5: Verify no broken imports**

```bash
grep -r "feature-showcase\|FeatureShowcase\|RevealOnScroll\|reveal-on-scroll\|animate-fade-in-up" --include="*.tsx" --include="*.ts" components/ app/
```

Expected: No matches (all references cleaned up).

- [ ] **Step 6: Commit**
```bash
git add app/[locale]/page.tsx tailwind.config.ts
git rm components/feature-showcase.tsx
git commit -m "feat: integrate feature carousel and clean up old components"
```

---

## Task 6: Visual Polish and Responsive Tuning

**Files:**
- Modify: `components/feature-carousel.tsx` (responsive adjustments, spring tuning)

This task is for visual refinement after the carousel is functional. The implementer should:

- [ ] **Step 1: Test carousel on mobile viewport (375px)**

Use browser dev tools to verify:
- Touch swipe works
- Slide content stacks vertically (text above, mockup below)
- Fixed height doesn't clip content
- Dots are tappable (min 44px touch target)
- No horizontal overflow on the page

Adjust `h-[420px] sm:h-[320px]` if content is clipped.

- [ ] **Step 2: Test carousel on desktop (1280px)**

Verify:
- Arrow buttons visible and clickable
- Drag gesture works with mouse
- Slide layout is horizontal (text left, mockup right)
- Spring overshoot looks natural, not excessive
- Progress bar on dots fills smoothly

- [ ] **Step 3: Test autoplay behavior**

Verify:
- Slides auto-advance every ~4 seconds
- Dragging/clicking pauses autoplay
- Autoplay resumes after 5s idle
- Switching tabs pauses autoplay
- Returning to tab resumes autoplay

- [ ] **Step 4: Test reduced motion**

In browser dev tools, enable "prefers-reduced-motion: reduce". Verify:
- No spring animations (instant transitions)
- No autoplay
- Manual navigation still works

- [ ] **Step 5: Tune spring values if needed**

If animations feel too bouncy or too stiff, adjust:
- Slide transition: `stiffness: 300, damping: 30`
- Mockup elements: `stiffness: 300, damping: 25`
- Hero: `stiffness: 200, damping: 20`

Higher damping = less bounce. Lower stiffness = slower movement.

- [ ] **Step 6: Commit any adjustments**
```bash
git add components/feature-carousel.tsx components/hero-section.tsx
git commit -m "style: tune carousel responsive layout and spring values"
```
