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

export function FeatureShowcase() {
  const t = useTranslations("home.features");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <FeatureCard
        icon={ScanLine}
        title={t("extractTitle")}
        description={t("extractDescription")}
        href="/extract"
        cta={t("extractCta")}
        animation={<ExtractAnimation />}
      />
      <FeatureCard
        icon={ImageIcon}
        title={t("imageSearchTitle")}
        description={t("imageSearchDescription")}
        href="/search"
        cta={t("imageSearchCta")}
        animation={<ImageSearchAnimation />}
      />
      <FeatureCard
        icon={MessageSquareText}
        title={t("textSearchTitle")}
        description={t("textSearchDescription")}
        href="/search"
        cta={t("textSearchCta")}
        animation={<TextSearchAnimation />}
      />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
  animation,
}: {
  icon: typeof ScanLine;
  title: string;
  description: string;
  href: string;
  cta: string;
  animation: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-border overflow-hidden transition-colors hover:border-foreground/20"
    >
      {/* Animation area */}
      <div className="flex items-center justify-center bg-muted/30 px-4 py-6 min-h-[140px]">
        {animation}
      </div>

      {/* Text content */}
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {cta}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

/** Loops animation steps 0→1→2→3 then resets */
function useAnimLoop(stepCount: number, interval: number, pauseAtEnd: number) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const advance = () => {
      setStep((prev) => {
        const next = prev + 1;
        if (next > stepCount) {
          // Pause at end then reset
          timeout = setTimeout(() => setStep(0), pauseAtEnd);
          return prev;
        }
        return next;
      });
    };

    const timer = setInterval(advance, interval);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [stepCount, interval, pauseAtEnd]);

  return step;
}

function ExtractAnimation() {
  const step = useAnimLoop(3, 1500, 2000);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-[180px]">
      {/* Photo placeholder */}
      <div
        className={`flex h-16 w-full items-center justify-center rounded-md border-2 border-dashed transition-all duration-500 ${
          step >= 1
            ? "border-foreground/20 bg-muted"
            : "border-border/50"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Upload
            className={`h-4 w-4 transition-all duration-500 ${
              step >= 1 ? "text-foreground/50" : "text-muted-foreground/30"
            }`}
          />
          <span className="text-[9px] text-muted-foreground/60">DSC_0042.RAF</span>
        </div>
      </div>

      {/* Settings */}
      <div className="flex w-full flex-col gap-1">
        {[
          { icon: Camera, label: "X-T5", showAt: 2 },
          { icon: Palette, label: "Classic Chrome", showAt: 2 },
          { icon: Settings, label: "Grain: Weak", showAt: 2 },
        ].map(({ icon: Ic, label, showAt }, i) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 transition-all duration-400 ${
              step >= showAt ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <Ic className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Share */}
      <div
        className={`flex items-center gap-1 text-[10px] text-muted-foreground transition-all duration-500 ${
          step >= 3 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Share2 className="h-2.5 w-2.5" />
        <span>Share recipe</span>
      </div>
    </div>
  );
}

function ImageSearchAnimation() {
  const step = useAnimLoop(3, 1500, 2000);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-[180px]">
      {/* Photo */}
      <div
        className={`flex h-14 w-full items-center justify-center rounded-md transition-all duration-500 ${
          step >= 1
            ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30"
            : "bg-muted/50"
        }`}
      >
        <ImageIcon
          className={`h-5 w-5 transition-all duration-500 ${
            step >= 1 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      </div>

      {/* Analyzing */}
      <div
        className={`flex items-center gap-1.5 text-[10px] text-muted-foreground transition-all duration-500 ${
          step >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Search className={`h-2.5 w-2.5 ${step === 2 ? "animate-pulse" : ""}`} />
        <span>Analyzing mood & tone...</span>
      </div>

      {/* Results */}
      <div className="flex w-full gap-1.5">
        {["Classic Chrome", "PRO Neg. Hi", "Nostalgic"].map((name, i) => (
          <div
            key={name}
            className={`flex-1 rounded-md bg-muted px-1.5 py-1.5 text-center transition-all duration-400 ${
              step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="text-[9px] font-medium truncate">{name}</div>
            <div className="text-[9px] text-muted-foreground">{98 - i * 3}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextSearchAnimation() {
  const step = useAnimLoop(3, 1500, 2000);
  const [displayText, setDisplayText] = useState("");
  const fullText = "warm sunset portrait";
  const prevStepRef = useRef(0);

  useEffect(() => {
    if (step >= 1 && prevStepRef.current < 1) {
      // Start typing
      let i = 0;
      setDisplayText("");
      const timer = setInterval(() => {
        i++;
        setDisplayText(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(timer);
      }, 50);
      return () => clearInterval(timer);
    }
    if (step === 0) {
      setDisplayText("");
    }
    prevStepRef.current = step;
  }, [step]);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-[180px]">
      {/* Text input */}
      <div
        className={`flex h-8 w-full items-center rounded-md border px-2 transition-all duration-500 ${
          step >= 1 ? "border-foreground/20" : "border-border/50"
        }`}
      >
        <Search className="h-2.5 w-2.5 text-muted-foreground mr-1.5 shrink-0" />
        <span className="text-[10px] truncate">
          {displayText}
          {step >= 1 && displayText.length < fullText.length && (
            <span className="animate-pulse">|</span>
          )}
        </span>
      </div>

      {/* Translation/matching */}
      <div
        className={`flex items-center gap-1.5 text-[10px] text-muted-foreground transition-all duration-500 ${
          step >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Globe className="h-2.5 w-2.5" />
        <span>→</span>
        <Sparkles className={`h-2.5 w-2.5 ${step === 2 ? "animate-pulse" : ""}`} />
        <span>Visual matching</span>
      </div>

      {/* Results */}
      <div className="flex w-full gap-1.5">
        {["ASTIA", "Classic Chrome", "PRO Neg."].map((name, i) => (
          <div
            key={name}
            className={`flex-1 rounded-md bg-muted px-1.5 py-1.5 text-center transition-all duration-400 ${
              step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="text-[9px] font-medium truncate">{name}</div>
            <div className="text-[9px] text-muted-foreground">
              <ListFilter className="h-2 w-2 inline mr-0.5" />
              {95 - i * 4}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
