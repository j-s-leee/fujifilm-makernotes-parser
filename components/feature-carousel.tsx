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
/*  ExtractMockup                                                      */
/* ------------------------------------------------------------------ */

function ExtractMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 3, 1600, 2500);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <ScanLine className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Upload Recipe</span>
      </div>

      <div className="p-3">
        <m.div
          animate={
            step >= 1
              ? { borderColor: "var(--border-active, rgba(0,0,0,0.2))" }
              : {}
          }
          className={`flex flex-col items-center justify-center rounded-md border border-dashed py-4 ${
            step >= 1
              ? "border-foreground/20 bg-muted/50"
              : "border-border"
          }`}
        >
          {step < 1 ? (
            <>
              <Upload className="h-4 w-4 text-muted-foreground/40 mb-1" />
              <span className="text-[9px] text-muted-foreground/50">
                Drop JPEG or RAF
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-medium">DSCF4721.RAF</div>
                <div className="text-[9px] text-muted-foreground">
                  X-T5 &middot; 26mm
                </div>
              </div>
            </div>
          )}
        </m.div>
      </div>

      <div className="border-t border-border">
        <m.div
          animate={
            step >= 2
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 8 }
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

      <m.div
        animate={
          step >= 3
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 8 }
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
/*  ImageSearchMockup                                                  */
/* ------------------------------------------------------------------ */

function ImageSearchMockup({ isActive }: { isActive: boolean }) {
  const step = useSlideAnim(isActive, 3, 1600, 2500);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Find Similar Recipes</span>
      </div>

      <div className="p-3">
        <div
          className={`h-24 rounded-md flex items-center justify-center transition-all duration-500 overflow-hidden ${
            step >= 1
              ? "bg-gradient-to-br from-amber-200/60 to-orange-300/40 dark:from-amber-900/40 dark:to-orange-900/30"
              : "bg-muted/30 border border-dashed border-border"
          }`}
        >
          {step < 1 ? (
            <Upload className="h-4 w-4 text-muted-foreground/40" />
          ) : (
            <ImageIcon className="h-6 w-6 text-amber-700/50 dark:text-amber-300/50" />
          )}
        </div>

        <m.div
          animate={
            step === 2
              ? { opacity: 1 }
              : { opacity: 0 }
          }
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
/*  Carousel variants                                                  */
/* ------------------------------------------------------------------ */

const carouselVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const springTransition = { type: "spring" as const, stiffness: 300, damping: 30 };
const reducedTransition = { duration: 0 };

/* ------------------------------------------------------------------ */
/*  FeatureCarousel                                                    */
/* ------------------------------------------------------------------ */

export function FeatureCarousel() {
  const t = useTranslations("home.features");
  const prefersReduced = useReducedMotion();

  // [activeIndex, direction]
  const [[activeIndex, direction], setSlide] = useState([0, 1]);
  const lastInteraction = useRef(Date.now());

  const paginate = useCallback(
    (dir: number) => {
      lastInteraction.current = Date.now();
      setSlide(([prev]) => [(prev + dir + 3) % 3, dir]);
    },
    [],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      if (offset.x > 50 || velocity.x > 500) {
        paginate(-1);
      } else if (offset.x < -50 || velocity.x < -500) {
        paginate(1);
      }
    },
    [paginate],
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

  const slide = slides[activeIndex];
  const Icon = slide.icon;
  const transition = prefersReduced ? reducedTransition : springTransition;

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
        {/* Carousel content */}
        <div className="relative overflow-hidden h-[450px] sm:h-[320px]">
          <AnimatePresence mode="wait" custom={direction}>
            <m.div
              key={activeIndex}
              custom={direction}
              variants={carouselVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              role="group"
              aria-roledescription="slide"
              className="absolute inset-0 flex flex-col sm:flex-row sm:items-center gap-8 sm:gap-12 lg:gap-16 cursor-grab active:cursor-grabbing"
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
                  <slide.Mockup isActive={activeIndex === slides.indexOf(slide)} />
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Arrow buttons — desktop only */}
        <button
          onClick={() => paginate(-1)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
          aria-label="Previous feature"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
          aria-label="Next feature"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                lastInteraction.current = Date.now();
                setSlide([i, i > activeIndex ? 1 : -1]);
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
                    key={`progress-${activeIndex}-${Date.now()}`}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}
