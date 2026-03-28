"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  m,
  LazyMotion,
  domAnimation,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  ScanLine,
  ImageIcon,
  MessageSquareText,
  ArrowRight,
  Upload,
  Search,
  Heart,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/* ------------------------------------------------------------------ */
/*  useSlideAnim — replaces useScrollAnim                              */
/* ------------------------------------------------------------------ */

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
    if (!isActive) {
      // Reset instantly when slide becomes inactive
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStep(0);
      return;
    }

    // Start with a small delay so user sees step 0
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= stepCount) return prev;
          return prev + 1;
        });
      }, interval);
    }, 400);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, stepCount, interval]);

  // Reset after completing a cycle
  useEffect(() => {
    if (step >= stepCount && isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      timeoutRef.current = setTimeout(() => {
        setStep(0);
        // Restart the interval
        timerRef.current = setInterval(() => {
          setStep((prev) => {
            if (prev >= stepCount) return prev;
            return prev + 1;
          });
        }, interval);
      }, pauseAtEnd);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [step, stepCount, interval, pauseAtEnd, isActive]);

  return step;
}

/* ------------------------------------------------------------------ */
/*  Mockup sub-components                                              */
/* ------------------------------------------------------------------ */

function SettingMockRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium">{value}</span>
    </div>
  );
}

const resultContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const resultItemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

function RecipeResultRow({
  name,
  score,
}: {
  name: string;
  score: string;
}) {
  return (
    <m.div
      variants={resultItemVariants}
      className="flex items-center gap-2 rounded-md bg-muted/50 p-1.5"
    >
      <div className="h-6 w-6 rounded bg-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium truncate">{name}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] text-muted-foreground">{score}</span>
        <Heart className="h-2.5 w-2.5 text-muted-foreground/50" />
        <Bookmark className="h-2.5 w-2.5 text-muted-foreground/50" />
      </div>
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/*  ExtractMockup — 4-step with drag-and-drop animation                */
/* ------------------------------------------------------------------ */

function ExtractMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 4, 1400, 2500);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <ScanLine className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Upload Recipe</span>
      </div>

      <div className="p-3 relative">
        {/* Drop zone */}
        <m.div
          animate={{
            borderColor:
              step >= 1 && step < 2
                ? "hsl(var(--foreground) / 0.3)"
                : step >= 2
                  ? "hsl(var(--foreground) / 0.2)"
                  : "hsl(var(--border))",
            backgroundColor:
              step >= 2 ? "hsl(var(--muted) / 0.5)" : "transparent",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center justify-center rounded-md border border-dashed py-4 relative overflow-hidden"
        >
          {step < 2 ? (
            <>
              <Upload className="h-4 w-4 text-muted-foreground/40 mb-1" />
              <span className="text-[9px] text-muted-foreground/50">
                Drop JPEG or RAF
              </span>
            </>
          ) : (
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex items-center gap-2"
            >
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-medium">DSCF4721.RAF</div>
                <div className="text-[9px] text-muted-foreground">
                  X-T5 &middot; 26mm
                </div>
              </div>
            </m.div>
          )}
        </m.div>

        {/* Animated cursor with file — visible during step 1 */}
        <AnimatePresence>
          {step === 1 && (
            <m.div
              initial={{ x: 80, y: -30, opacity: 0 }}
              animate={{ x: 0, y: 10, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute top-2 right-4 pointer-events-none flex items-center gap-1"
            >
              <div className="flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 shadow-sm border border-border">
                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground font-medium">
                  DSCF4721.RAF
                </span>
              </div>
              {/* Cursor icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="text-foreground/60 -ml-1 mt-2"
              >
                <path
                  d="M1 1L5 11L6.5 6.5L11 5L1 1Z"
                  fill="currentColor"
                />
              </svg>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings — step 3 */}
      <div className="border-t border-border">
        <m.div
          animate={
            step >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="p-3 space-y-1.5"
        >
          <SettingMockRow label="Film Simulation" value="Classic Chrome" />
          <SettingMockRow label="Dynamic Range" value="DR400" />
          <SettingMockRow label="Grain Effect" value="Weak / Small" />
          <SettingMockRow label="White Balance" value="Auto" />
        </m.div>
      </div>

      {/* Upload button — step 4 */}
      <m.div
        animate={
          step >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="p-3 pt-0"
      >
        <div className="flex items-center justify-center rounded-md bg-foreground py-1.5 text-[10px] font-medium text-background">
          Upload Recipe
        </div>
      </m.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ImageSearchMockup — 4-step with drag-and-drop animation            */
/* ------------------------------------------------------------------ */

function ImageSearchMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 4, 1400, 2500);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Find Similar Recipes</span>
      </div>

      <div className="p-3 relative">
        <div
          className={`h-24 rounded-md flex items-center justify-center transition-all duration-500 overflow-hidden ${
            step >= 2
              ? "bg-gradient-to-br from-amber-200/60 to-orange-300/40 dark:from-amber-900/40 dark:to-orange-900/30"
              : "bg-muted/30 border border-dashed border-border"
          }`}
        >
          {step < 2 ? (
            <Upload className="h-4 w-4 text-muted-foreground/40" />
          ) : (
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <ImageIcon className="h-6 w-6 text-amber-700/50 dark:text-amber-300/50" />
            </m.div>
          )}
        </div>

        {/* Animated cursor with photo — visible during step 1 */}
        <AnimatePresence>
          {step === 1 && (
            <m.div
              initial={{ x: 80, y: -30, opacity: 0 }}
              animate={{ x: 0, y: 10, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute top-2 right-4 pointer-events-none flex items-center gap-1"
            >
              <div className="flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 shadow-sm border border-border">
                <div className="h-4 w-5 rounded-sm bg-gradient-to-br from-amber-200/80 to-orange-300/60 dark:from-amber-900/60 dark:to-orange-900/40 flex items-center justify-center">
                  <ImageIcon className="h-2.5 w-2.5 text-amber-700/60 dark:text-amber-300/60" />
                </div>
                <span className="text-[8px] text-muted-foreground font-medium">
                  IMG_2847.jpg
                </span>
              </div>
              {/* Cursor icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="text-foreground/60 -ml-1 mt-2"
              >
                <path
                  d="M1 1L5 11L6.5 6.5L11 5L1 1Z"
                  fill="currentColor"
                />
              </svg>
            </m.div>
          )}
        </AnimatePresence>

        <m.div
          animate={step === 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex items-center justify-center gap-1.5 mt-2 h-4"
        >
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-pulse" />
          <span className="text-[9px] text-muted-foreground">
            Analyzing color &amp; tone...
          </span>
        </m.div>
      </div>

      <div className="border-t border-border">
        <m.div
          animate={
            step >= 4
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 8 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="p-3 space-y-2"
        >
          <div className="text-[9px] text-muted-foreground mb-1">
            3 recipes found
          </div>
          <m.div
            variants={resultContainerVariants}
            initial="hidden"
            animate={step >= 4 ? "show" : "hidden"}
            className="space-y-2"
          >
            {[
              { name: "Classic Chrome", score: "98%" },
              { name: "PRO Neg. Hi", score: "94%" },
              { name: "Nostalgic Neg.", score: "91%" },
            ].map((r) => (
              <RecipeResultRow key={r.name} name={r.name} score={r.score} />
            ))}
          </m.div>
        </m.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TextSearchMockup                                                   */
/* ------------------------------------------------------------------ */

function TextSearchMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 3, 1600, 2500);
  const [displayText, setDisplayText] = useState("");
  const fullText = "warm sunset portrait";
  const prevStepRef = useRef(0);

  useEffect(() => {
    if (step >= 1 && prevStepRef.current < 1) {
      let i = 0;
      setDisplayText("");
      const timer = setInterval(() => {
        i++;
        setDisplayText(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(timer);
      }, 50);
      prevStepRef.current = step;
      return () => clearInterval(timer);
    }
    if (step === 0) {
      setDisplayText("");
      prevStepRef.current = 0;
    } else {
      prevStepRef.current = step;
    }
  }, [step]);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <MessageSquareText className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Text Search</span>
      </div>

      <div className="p-3">
        <div
          className={`flex items-center rounded-md border px-2 py-1.5 transition-all duration-300 ${
            step >= 1 ? "border-foreground/20" : "border-border"
          }`}
        >
          <Search className="h-3 w-3 text-muted-foreground mr-1.5 shrink-0" />
          <span className="text-[10px] text-foreground/80 truncate">
            {displayText || (
              <span className="text-muted-foreground/40">
                Describe the look...
              </span>
            )}
            {step >= 1 && displayText.length < fullText.length && (
              <span className="animate-pulse text-foreground/60">|</span>
            )}
          </span>
        </div>

        <m.div
          animate={step === 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex items-center justify-center gap-1.5 mt-2 h-4"
        >
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-pulse" />
          <span className="text-[9px] text-muted-foreground">
            Matching recipes...
          </span>
        </m.div>
      </div>

      <div className="border-t border-border">
        <m.div
          animate={
            step >= 3
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 8 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="p-3 space-y-2"
        >
          <div className="text-[9px] text-muted-foreground mb-1">
            3 recipes found
          </div>
          <m.div
            variants={resultContainerVariants}
            initial="hidden"
            animate={step >= 3 ? "show" : "hidden"}
            className="space-y-2"
          >
            {[
              { name: "ASTIA", score: "95%" },
              { name: "Classic Chrome", score: "92%" },
              { name: "PRO Neg. Std", score: "88%" },
            ].map((r) => (
              <RecipeResultRow key={r.name} name={r.name} score={r.score} />
            ))}
          </m.div>
        </m.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide configuration                                                */
/* ------------------------------------------------------------------ */

type SlideConfig = {
  icon: typeof ScanLine;
  titleKey: string;
  descriptionKey: string;
  href: string;
  ctaKey: string;
  Mockup: React.ComponentType<{ isActive: boolean }>;
};

const slides: SlideConfig[] = [
  {
    icon: ScanLine,
    titleKey: "extractTitle",
    descriptionKey: "extractDescription",
    href: "/extract",
    ctaKey: "extractCta",
    Mockup: ExtractMockup,
  },
  {
    icon: ImageIcon,
    titleKey: "imageSearchTitle",
    descriptionKey: "imageSearchDescription",
    href: "/search",
    ctaKey: "imageSearchCta",
    Mockup: ImageSearchMockup,
  },
  {
    icon: MessageSquareText,
    titleKey: "textSearchTitle",
    descriptionKey: "textSearchDescription",
    href: "/search",
    ctaKey: "textSearchCta",
    Mockup: TextSearchMockup,
  },
];

/* ------------------------------------------------------------------ */
/*  Carousel transition                                                */
/* ------------------------------------------------------------------ */

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};
const reducedTransition = { duration: 0 };

/* ------------------------------------------------------------------ */
/*  FeatureCarousel                                                    */
/* ------------------------------------------------------------------ */

export function FeatureCarousel() {
  const t = useTranslations("home.features");
  const prefersReduced = useReducedMotion();

  const [activeIndex, setActiveIndex] = useState(0);
  const lastInteraction = useRef(0);

  const paginate = useCallback(
    (dir: number) => {
      lastInteraction.current = Date.now();
      setActiveIndex((prev) => (prev + dir + 3) % 3);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        paginate(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        paginate(1);
      }
    },
    [paginate],
  );

  // Autoplay
  useEffect(() => {
    if (prefersReduced) return;

    const timer = setInterval(() => {
      if (Date.now() - lastInteraction.current < 5000) return;
      if (document.hidden) return;
      paginate(1);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, prefersReduced, paginate]);

  const transition = prefersReduced ? reducedTransition : springTransition;
  const dragX = useRef(0);

  return (
    <LazyMotion features={domAnimation}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Features"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative outline-none"
      >
        {/* Carousel — all slides rendered, only active visible */}
        <div
          className="relative overflow-hidden touch-pan-y h-[480px] sm:h-[340px] lg:h-[320px]"
          onPointerDown={() => { dragX.current = 0; }}
          onPointerMove={(e) => {
            if (e.buttons > 0) dragX.current += e.movementX;
          }}
          onPointerUp={() => {
            if (dragX.current > 60) {
              paginate(-1);
            } else if (dragX.current < -60) {
              paginate(1);
            }
            dragX.current = 0;
          }}
        >
          {slides.map((slide, i) => {
            const Icon = slide.icon;
            const isActive = i === activeIndex;

            return (
              <m.div
                key={i}
                animate={{
                  opacity: isActive ? 1 : 0,
                  x: isActive ? 0 : i > activeIndex ? 60 : -60,
                }}
                transition={transition}
                role="group"
                aria-roledescription="slide"
                aria-hidden={!isActive}
                className={`absolute inset-0 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12 lg:gap-16 ${
                  !isActive ? "pointer-events-none" : ""
                }`}
              >
                {/* Text */}
                <div className="flex flex-col gap-3 sm:w-1/2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {t(slide.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(slide.descriptionKey)}
                  </p>
                  <Link
                    href={slide.href}
                    className="group/link mt-1 flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground"
                  >
                    {t(slide.ctaKey)}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                </div>

                {/* Mockup */}
                <div className="flex justify-center sm:w-1/2">
                  <div className="w-full max-w-[300px]">
                    <slide.Mockup isActive={isActive} />
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>

        {/* Navigation: arrows inline with dots */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => paginate(-1)}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
            aria-label="Previous feature"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  lastInteraction.current = Date.now();
                  setActiveIndex(i);
                }}
                aria-label={`Go to feature ${i + 1}`}
                className="relative flex items-center justify-center py-2"
              >
                <div
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "h-1.5 w-8 bg-muted-foreground/30"
                      : "h-1.5 w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/30"
                  }`}
                >
                  {i === activeIndex && !prefersReduced && (
                    <m.div
                      className="h-full rounded-full bg-foreground"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 4, ease: "linear" }}
                      key={`progress-${activeIndex}`}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => paginate(1)}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
            aria-label="Next feature"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </LazyMotion>
  );
}
