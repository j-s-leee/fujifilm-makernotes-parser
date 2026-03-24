"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanLine,
  ImageIcon,
  MessageSquareText,
  ArrowRight,
  Camera,
  Settings,
  Share2,
  Upload,
  Palette,
  Search,
  Globe,
  Sparkles,
  ListFilter,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const features = ["extract", "imageSearch", "textSearch"] as const;
type Feature = (typeof features)[number];

const featureIcons = {
  extract: ScanLine,
  imageSearch: ImageIcon,
  textSearch: MessageSquareText,
} as const;

const featureHrefs = {
  extract: "/extract",
  imageSearch: "/search",
  textSearch: "/search",
} as const;

export function FeatureShowcase() {
  const t = useTranslations("home.features");
  const [active, setActive] = useState<Feature>("extract");
  const [animStep, setAnimStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const userInteracted = useRef(false);

  // Auto-advance animation steps
  useEffect(() => {
    setAnimStep(0);

    timerRef.current = setInterval(() => {
      setAnimStep((prev) => {
        if (prev >= 3) {
          // After completing 3 steps, pause, then move to next tab
          if (!userInteracted.current) {
            setTimeout(() => {
              setActive((curr) => {
                const idx = features.indexOf(curr);
                return features[(idx + 1) % features.length];
              });
            }, 800);
          }
          return prev;
        }
        return prev + 1;
      });
    }, 1800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  const handleTabClick = (key: Feature) => {
    userInteracted.current = true;
    setActive(key);
    setAnimStep(0);
    // Restart animation for clicked tab
    setTimeout(() => {
      userInteracted.current = true; // Keep user control
    }, 0);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 self-center">
        {features.map((key) => {
          const Icon = featureIcons[key];
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`${key}Tab`)}
            </button>
          );
        })}
      </div>

      {/* Demo preview card */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Left: text info */}
          <div className="p-5 sm:p-6 flex flex-col">
            <h3 className="text-base font-semibold">{t(`${active}Title`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`${active}Description`)}
            </p>

            {/* Step indicators */}
            <div className="mt-5 flex flex-col gap-3">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex items-start gap-3 transition-all duration-500 ${
                    animStep >= step
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors duration-300 ${
                      animStep === step
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                  <p className="text-sm text-muted-foreground pt-0.5">
                    {t(`${active}Step${step}` as never)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: animated mockup */}
          <div className="hidden sm:flex items-center justify-center bg-muted/30 p-6">
            {active === "extract" && <ExtractAnimation step={animStep} />}
            {active === "imageSearch" && <ImageSearchAnimation step={animStep} />}
            {active === "textSearch" && <TextSearchAnimation step={animStep} />}
          </div>
        </div>

        {/* CTA footer */}
        <Link
          href={featureHrefs[active]}
          className="flex items-center justify-center gap-2 border-t border-border bg-muted/30 px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t(`${active}Cta`)}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Extract: photo card → settings appear → share icon */
function ExtractAnimation({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
      {/* Photo placeholder */}
      <div
        className={`flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed transition-all duration-500 ${
          step >= 1
            ? "border-foreground/30 bg-muted scale-100 opacity-100"
            : "border-border bg-transparent scale-95 opacity-40"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <Upload
            className={`h-5 w-5 transition-all duration-500 ${
              step >= 1 ? "text-foreground/60" : "text-muted-foreground/40"
            }`}
          />
          <span className="text-[10px] text-muted-foreground">DSC_0042.RAF</span>
        </div>
      </div>

      {/* Detected settings */}
      <div
        className={`flex w-full flex-col gap-1.5 transition-all duration-500 ${
          step >= 2
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        <SettingRow icon={Camera} label="X-T5" />
        <SettingRow icon={Palette} label="Classic Chrome" />
        <SettingRow icon={Settings} label="Grain: Weak / Small" />
      </div>

      {/* Share */}
      <div
        className={`flex items-center gap-1.5 text-xs transition-all duration-500 ${
          step >= 3
            ? "opacity-100 scale-100"
            : "opacity-0 scale-90"
        }`}
      >
        <Share2 className="h-3 w-3 text-foreground/60" />
        <span className="text-muted-foreground">Shared to community</span>
      </div>
    </div>
  );
}

/** Image Search: photo uploads → AI analyzing → result cards appear */
function ImageSearchAnimation({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
      {/* Upload photo */}
      <div
        className={`flex h-20 w-full items-center justify-center rounded-lg transition-all duration-500 ${
          step >= 1
            ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 opacity-100 scale-100"
            : "bg-muted opacity-40 scale-95"
        }`}
      >
        <ImageIcon
          className={`h-6 w-6 transition-colors duration-500 ${
            step >= 1 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/40"
          }`}
        />
      </div>

      {/* AI analyzing */}
      <div
        className={`flex items-center gap-2 text-xs transition-all duration-500 ${
          step >= 2
            ? "opacity-100"
            : "opacity-0"
        }`}
      >
        <Search
          className={`h-3 w-3 ${step === 2 ? "animate-pulse text-foreground/60" : "text-foreground/60"}`}
        />
        <span className="text-muted-foreground">Analyzing color & mood...</span>
      </div>

      {/* Result cards */}
      <div
        className={`flex w-full gap-2 transition-all duration-500 ${
          step >= 3
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3"
        }`}
      >
        {["Classic Chrome", "PRO Neg. Hi", "Nostalgic Neg."].map(
          (name, i) => (
            <div
              key={name}
              className="flex-1 rounded-md bg-muted p-2 text-center"
              style={{
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <div className="text-[9px] font-medium truncate">{name}</div>
              <div className="text-[9px] text-muted-foreground">
                {(98 - i * 3)}%
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** Text Search: typing effect → translation → result cards */
function TextSearchAnimation({ step }: { step: number }) {
  const [displayText, setDisplayText] = useState("");
  const fullText = "warm sunset portrait";

  useEffect(() => {
    if (step < 1) {
      setDisplayText("");
      return;
    }

    let i = 0;
    setDisplayText("");
    const timer = setInterval(() => {
      i++;
      setDisplayText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(timer);
    }, 60);

    return () => clearInterval(timer);
  }, [step]);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
      {/* Text input mockup */}
      <div
        className={`flex h-10 w-full items-center rounded-lg border px-3 transition-all duration-500 ${
          step >= 1
            ? "border-foreground/30 opacity-100"
            : "border-border opacity-40"
        }`}
      >
        <Search className="h-3 w-3 text-muted-foreground mr-2 shrink-0" />
        <span className="text-xs truncate">
          {displayText}
          {step >= 1 && displayText.length < fullText.length && (
            <span className="animate-pulse">|</span>
          )}
        </span>
      </div>

      {/* Translation */}
      <div
        className={`flex items-center gap-2 text-xs transition-all duration-500 ${
          step >= 2
            ? "opacity-100"
            : "opacity-0"
        }`}
      >
        <Globe className="h-3 w-3 text-foreground/60" />
        <span className="text-muted-foreground">→</span>
        <Sparkles
          className={`h-3 w-3 ${step === 2 ? "animate-pulse text-foreground/60" : "text-foreground/60"}`}
        />
        <span className="text-muted-foreground">Visual matching</span>
      </div>

      {/* Results */}
      <div
        className={`flex w-full gap-2 transition-all duration-500 ${
          step >= 3
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3"
        }`}
      >
        {["ASTIA", "Classic Chrome", "PRO Neg. Std"].map((name, i) => (
          <div
            key={name}
            className="flex-1 rounded-md bg-muted p-2 text-center"
          >
            <div className="text-[9px] font-medium truncate">{name}</div>
            <div className="text-[9px] text-muted-foreground">
              <ListFilter className="h-2.5 w-2.5 inline mr-0.5" />
              {(95 - i * 4)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
}: {
  icon: typeof Camera;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs">{label}</span>
    </div>
  );
}
