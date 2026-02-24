# Phase 1: UI/UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Film Recipe Viewer with a minimal, grayscale aesthetic — extracting header/footer components, redesigning the dropzone and recipe card, and updating the color system.

**Architecture:** Client-only Next.js 15 app. No backend changes. Extract inline header/footer from `page.tsx` into standalone components. Redesign `image-dropzone.tsx` to collapse after upload. Redesign `fujifilm-recipe-card.tsx` into `recipe-card.tsx` with extracted `recipe-item.tsx`. Update CSS variables to a pure grayscale palette.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 3, Radix UI, shadcn/ui, Space Grotesk font, lucide-react icons.

---

### Task 1: Update CSS Variables to Grayscale Palette

**Files:**
- Modify: `app/globals.css` (lines 5-51)

**Context:** The current CSS uses red-hued primary colors (`0 72.2% 50.6%`). The design calls for pure grayscale with no accent color. Light mode: white bg, `#1a1a1a` text, `#f5f5f5` surfaces. Dark mode: `#0a0a0a` bg, `#e5e5e5` text, `#1a1a1a` surfaces.

**Step 1: Update the `:root` (light mode) CSS variables**

Replace the `:root` block in `app/globals.css` with:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 10%;
  --primary: 0 0% 10%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 10%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --ring: 0 0% 10%;
  --radius: 0.5rem;
}
```

**Step 2: Update the `.dark` block**

Replace the `.dark` block with:

```css
.dark {
  --background: 0 0% 4%;
  --foreground: 0 0% 90%;
  --card: 0 0% 7%;
  --card-foreground: 0 0% 90%;
  --popover: 0 0% 7%;
  --popover-foreground: 0 0% 90%;
  --primary: 0 0% 90%;
  --primary-foreground: 0 0% 4%;
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 90%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 64%;
  --accent: 0 0% 15%;
  --accent-foreground: 0 0% 90%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 15%;
  --input: 0 0% 15%;
  --ring: 0 0% 90%;
}
```

**Step 3: Update layout.tsx body class**

In `app/layout.tsx`, change the body className from `bg-neutral-50` to `bg-background` so it uses the CSS variable system:

```tsx
<body className={`${spaceGrotesk.variable} bg-background font-sans antialiased`}>
```

**Step 4: Remove unused aurora animation**

Delete the `.theme` class and the `@theme inline` keyframes block from `globals.css` — they're unused.

**Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "style: update CSS variables to pure grayscale palette"
```

---

### Task 2: Extract Header Component

**Files:**
- Create: `components/header.tsx`
- Modify: `app/page.tsx` (lines 92-116 — the `<header>` block)

**Context:** The header is currently inline in `page.tsx`. Extract it into a standalone component. The header has: app name with Film icon (left), Feedback link + dark mode toggle (right). Fix the missing space in `gap-2md:gap-8` (should be `gap-2 md:gap-8`).

**Step 1: Create `components/header.tsx`**

```tsx
import { Film } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 md:px-10">
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5" />
        <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
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
        <ModeToggle />
      </div>
    </header>
  );
}
```

**Step 2: Replace the inline header in `app/page.tsx`**

Import the new component and replace the `<header>...</header>` block (lines 92-116) with:

```tsx
<Header />
```

Add import at top:

```tsx
import { Header } from "@/components/header";
```

Remove the now-unused `Film` import from lucide-react and the `ModeToggle` import (they're used by Header internally now).

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/header.tsx app/page.tsx
git commit -m "refactor: extract header into standalone component"
```

---

### Task 3: Extract Footer Component

**Files:**
- Create: `components/footer.tsx`
- Modify: `app/page.tsx` (lines 146-150 — the `<footer>` block)

**Context:** The footer is inline in `page.tsx`. Extract it. Simplify styling to use the design system colors instead of hardcoded `neutral-*` classes.

**Step 1: Create `components/footer.tsx`**

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Film Recipe Viewer
      </p>
    </footer>
  );
}
```

**Step 2: Replace the inline footer in `app/page.tsx`**

Import and replace the `<footer>...</footer>` block with:

```tsx
<Footer />
```

Add import:

```tsx
import { Footer } from "@/components/footer";
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/footer.tsx app/page.tsx
git commit -m "refactor: extract footer into standalone component"
```

---

### Task 4: Redesign the Image Dropzone

**Files:**
- Modify: `components/image-dropzone.tsx`

**Context:** The dropzone needs two states: (1) full-size hero when no image is uploaded, (2) collapsed "Upload another" strip after upload. Add a prop `hasImage` to control this. Add subtle scale animation on drag-over.

**Step 1: Update the `ImageDropzoneProps` interface and component**

Rewrite `components/image-dropzone.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface ImageDropzoneProps {
  onFileDrop: (files: File[]) => void;
  hasImage: boolean;
}

export function ImageDropzone({ onFileDrop, hasImage }: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileDrop(acceptedFiles);
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
    },
    multiple: false,
  });

  if (hasImage) {
    return (
      <div
        {...getRootProps()}
        className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 cursor-pointer transition-all ${
          isDragActive
            ? "border-foreground bg-muted"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Upload another image</p>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer transition-all ${
        isDragActive
          ? "border-foreground bg-muted scale-[1.01]"
          : "border-border hover:border-foreground/30 hover:bg-muted/50"
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
      <p className="text-sm text-foreground mb-1">
        Drag & drop a Fujifilm image here, or click to select
      </p>
      <p className="text-xs text-muted-foreground">Supports JPG files</p>
    </div>
  );
}
```

**Step 2: Update `app/page.tsx` to pass `hasImage` prop**

Find where `<ImageDropzone>` is rendered and change:

```tsx
<ImageDropzone onFileDrop={onDrop} />
```

to:

```tsx
<ImageDropzone onFileDrop={onDrop} hasImage={!!image} />
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/image-dropzone.tsx app/page.tsx
git commit -m "feat: redesign dropzone with collapsed state after upload"
```

---

### Task 5: Extract RecipeItem into Standalone Component

**Files:**
- Create: `components/recipe-item.tsx`
- Modify: `components/fujifilm-recipe-card.tsx` (remove inline `RecipeItem` function, lines 154-173)

**Context:** `RecipeItem` is currently a local function inside `fujifilm-recipe-card.tsx`. Extract it into its own file so both the current and future recipe card can use it. Apply the design system styling: cleaner borders, consistent typography.

**Step 1: Create `components/recipe-item.tsx`**

```tsx
import { addSign } from "@/lib/utils";

interface RecipeItemProps {
  label: string | React.ReactNode;
  value: string | number;
}

export function RecipeItem({ label, value }: RecipeItemProps) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-3 pr-2">
      <p className="text-xs font-normal uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold uppercase text-foreground">
        {addSign(value)}
      </p>
    </div>
  );
}
```

**Step 2: Update `fujifilm-recipe-card.tsx` to import `RecipeItem`**

At the top of `components/fujifilm-recipe-card.tsx`, add:

```tsx
import { RecipeItem } from "@/components/recipe-item";
```

Delete the local `RecipeItem` function (lines 154-173).

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/recipe-item.tsx components/fujifilm-recipe-card.tsx
git commit -m "refactor: extract RecipeItem into standalone component"
```

---

### Task 6: Redesign the Recipe Card

**Files:**
- Rename: `components/fujifilm-recipe-card.tsx` → `components/recipe-card.tsx`
- Modify: `app/page.tsx` (update import path)

**Context:** Redesign the recipe card per the design doc: film simulation as prominent header, cleaner card styling, visual hierarchy. The component keeps the same props interface. Remove hardcoded `neutral-*` colors from the wrapper in `page.tsx`.

**Step 1: Rewrite the recipe card as `components/recipe-card.tsx`**

Create `components/recipe-card.tsx` with the redesigned layout:

```tsx
import { FujifilmRecipe } from "@/fujifilm/recipe";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addSign } from "@/lib/utils";
import { RecipeItem } from "@/components/recipe-item";

export function RecipeCard({
  simulation,
  ...recipe
}: FujifilmRecipe & { simulation: string | null }) {
  const { toast } = useToast();

  const getRecipeText = () => {
    const recipeItems = [
      simulation && `Film Simulation: ${simulation}`,
      recipe.grainEffect &&
        `Grain: ${recipe.grainEffect.roughness} ${recipe.grainEffect.size}`,
      recipe.colorChromeEffect && `Color Chrome: ${recipe.colorChromeEffect}`,
      recipe.colorChromeFXBlue &&
        `Color Chrome FX Blue: ${recipe.colorChromeFXBlue}`,
      recipe.whiteBalance &&
        `White Balance: ${
          recipe.whiteBalance.type === "K"
            ? `${recipe.whiteBalance.colorTemperature}K`
            : recipe.whiteBalance.type.replace("-", " ")
        } (R:${addSign(recipe.whiteBalance.red)}, B:${addSign(
          recipe.whiteBalance.blue
        )})`,
      recipe.dynamicRange &&
        `Dynamic Range: ${recipe.dynamicRange.development}`,
      recipe.highlight != null && `Highlight: ${recipe.highlight}`,
      recipe.shadow != null && `Shadow: ${recipe.shadow}`,
      recipe.color != null && `Color: ${recipe.color}`,
      recipe.sharpness != null && `Sharpness: ${recipe.sharpness}`,
      recipe.highISONoiseReduction != null &&
        `Noise Reduction: ${recipe.highISONoiseReduction}`,
      recipe.clarity != null && `Clarity: ${recipe.clarity}`,
      recipe.bwAdjustment != null && `BW Adjustment: ${recipe.bwAdjustment}`,
      recipe.bwMagentaGreen != null &&
        `BW Magenta Green: ${recipe.bwMagentaGreen}`,
    ].filter(Boolean);

    return recipeItems.join("\n");
  };

  const copyRecipe = async () => {
    try {
      await navigator.clipboard.writeText(getRecipeText());
      toast({
        title: "Copied",
        description: "Film recipe copied to clipboard",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to copy recipe",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            {simulation && (
              <h2 className="text-2xl font-bold tracking-tight">
                {simulation}
              </h2>
            )}
            <p className="text-xs uppercase text-muted-foreground mt-1">
              Film Recipe
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={copyRecipe}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4">
          {recipe.grainEffect && (
            <RecipeItem
              label="Grain"
              value={`${recipe.grainEffect.roughness} ${recipe.grainEffect.size}`}
            />
          )}
          {recipe.colorChromeEffect && (
            <RecipeItem label="Color Chrome" value={recipe.colorChromeEffect} />
          )}
          {recipe.colorChromeFXBlue && (
            <RecipeItem label="FX Blue" value={recipe.colorChromeFXBlue} />
          )}
          {recipe.whiteBalance && (
            <RecipeItem
              label={`R: ${addSign(recipe.whiteBalance.red)} B: ${addSign(
                recipe.whiteBalance.blue
              )}`}
              value={`${
                recipe.whiteBalance.colorTemperature &&
                recipe.whiteBalance.type === "K"
                  ? `${recipe.whiteBalance.colorTemperature} K`
                  : recipe.whiteBalance.type.replace("-", " ")
              }`}
            />
          )}
          {recipe.dynamicRange && (
            <RecipeItem
              label="DR"
              value={`${recipe.dynamicRange.development}`}
            />
          )}
          {recipe.highlight != null && (
            <RecipeItem label="Highlight" value={recipe.highlight} />
          )}
          {recipe.shadow != null && (
            <RecipeItem label="Shadow" value={recipe.shadow} />
          )}
          {recipe.color != null && (
            <RecipeItem label="Color" value={recipe.color} />
          )}
          {recipe.sharpness != null && (
            <RecipeItem label="Sharpness" value={recipe.sharpness} />
          )}
          {recipe.highISONoiseReduction != null && (
            <RecipeItem
              label="Noise Reduction"
              value={recipe.highISONoiseReduction}
            />
          )}
          {recipe.clarity != null && (
            <RecipeItem label="Clarity" value={recipe.clarity} />
          )}
          {recipe.bwAdjustment != null && (
            <RecipeItem label="BW Adjustment" value={recipe.bwAdjustment} />
          )}
          {recipe.bwMagentaGreen != null && (
            <RecipeItem
              label="BW Magenta Green"
              value={recipe.bwMagentaGreen}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Delete `components/fujifilm-recipe-card.tsx`**

```bash
rm components/fujifilm-recipe-card.tsx
```

**Step 3: Update `app/page.tsx` imports and usage**

Change import:

```tsx
// Before
import { FujifilmRecipeCard } from "@/components/fujifilm-recipe-card";
// After
import { RecipeCard } from "@/components/recipe-card";
```

Change usage (around line 138):

```tsx
// Before
<FujifilmRecipeCard {...recipe} simulation={simulation} />
// After
<RecipeCard {...recipe} simulation={simulation} />
```

Also remove the hardcoded wrapper `<div className="w-full bg-neutral-100 dark:bg-neutral-800 ...">` around the card. Replace with just the card:

```tsx
{recipe && (
  <div className="w-full">
    <RecipeCard {...recipe} simulation={simulation} />
  </div>
)}
```

**Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add components/recipe-card.tsx app/page.tsx
git rm components/fujifilm-recipe-card.tsx
git commit -m "feat: redesign recipe card with prominent simulation header"
```

---

### Task 7: Redesign the Main Page Layout

**Files:**
- Modify: `app/page.tsx`

**Context:** Simplify the page layout. Use a centered max-width container (max-w-5xl). Clean up the wrapper divs. The layout should be: Header → Dropzone → (Photo + Recipe side by side) → Footer. Add fade-in animation to photo preview. Remove `font-space-grotesk` class from component divs (it's already set via the CSS variable in layout.tsx).

**Step 1: Rewrite the page component's return JSX**

Replace the entire `return (...)` block in `app/page.tsx` with:

```tsx
return (
  <div className="flex min-h-screen flex-col bg-background">
    <Header />
    <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <ImageDropzone onFileDrop={onDrop} hasImage={!!image} />
        {(image || recipe) && (
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
            {image && (
              <img
                src={image}
                alt="Uploaded photo"
                className="h-auto max-h-[80vh] w-full rounded-lg object-contain shadow-sm animate-in fade-in duration-300"
              />
            )}
            {recipe && (
              <div className="w-full">
                <RecipeCard {...recipe} simulation={simulation} />
              </div>
            )}
          </div>
        )}
        {!image && !recipe && (
          <p className="text-center text-sm text-muted-foreground">
            Drop a Fujifilm JPEG to extract its film recipe.
          </p>
        )}
      </div>
    </main>
    <Footer />
  </div>
);
```

**Step 2: Clean up unused wrapper divs and classes**

Remove the `layout-container`, `layout-content-container`, `group/design-root`, and `overflow-x-hidden` classes that were part of the old layout. These are now replaced by the simpler structure above.

**Step 3: Clean up imports**

The final imports at the top of `app/page.tsx` should be:

```tsx
"use client";

import { ImageDropzone } from "@/components/image-dropzone";
import {
  FujifilmSimulation,
  getFujifilmSimulationFromMakerNote,
} from "@/fujifilm/simulation";
import {
  FujifilmRecipe,
  getFujifilmRecipeFromMakerNote,
} from "@/fujifilm/recipe";
import { useState, useCallback } from "react";
import * as exifr from "exifr";
import { RecipeCard } from "@/components/recipe-card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
```

Note: `Film` from lucide-react and `ModeToggle` are no longer needed here — they live in `Header`.

**Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redesign main page with clean centered layout"
```

---

### Task 8: Remove Duplicate Utils File

**Files:**
- Delete: `app/lib/utils.ts`

**Context:** There are two `utils.ts` files: `lib/utils.ts` (the canonical one used by imports via `@/lib/utils`) and `app/lib/utils.ts` (a duplicate with only `cn()`). The duplicate can be deleted since `lib/utils.ts` already has `cn()` plus `addSign()`.

**Step 1: Verify no imports reference `app/lib/utils`**

Search for any imports from `@/app/lib/utils` or relative paths to `app/lib/utils`. There should be none — all components use `@/lib/utils`.

**Step 2: Delete the duplicate**

```bash
rm app/lib/utils.ts
rmdir app/lib
```

**Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git rm app/lib/utils.ts
git commit -m "chore: remove duplicate utils file"
```

---

### Task 9: Visual Verification

**Files:** None (manual testing)

**Context:** Run the dev server and visually verify the redesign in both light and dark modes.

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

Open `http://localhost:3000` and check:

1. **Empty state**: Dropzone centered, tagline visible, no photo/recipe visible.
2. **Light mode**: White background, dark text, gray surfaces. No red/colored accents.
3. **Dark mode**: Near-black background, light text. Toggle via the dropdown in header.
4. **Header**: App name + Film icon (left), Feedback link + theme toggle (right).
5. **Footer**: Copyright text, centered.
6. **Upload a Fujifilm JPEG**: Dropzone collapses to strip. Photo + recipe card appear side by side.
7. **Recipe card**: Film simulation name is the prominent header. Settings in 2-column grid. Copy button works.
8. **Mobile responsive**: Resize to < 768px. Photo and recipe card should stack vertically.

**Step 3: Fix any visual issues found**

Address any spacing, alignment, or styling issues discovered during verification.

**Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: visual refinements from manual testing"
```
