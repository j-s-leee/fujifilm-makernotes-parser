"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanLine,
  ImageIcon,
  MessageSquareText,
  ArrowRight,
  Upload,
  Search,
  Heart,
  Bookmark,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function FeatureShowcase() {
  const t = useTranslations("home.features");

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <FeatureRow
        icon={ScanLine}
        title={t("extractTitle")}
        description={t("extractDescription")}
        href="/extract"
        cta={t("extractCta")}
        mockup={<ExtractMockup />}
        reverse={false}
      />
      <FeatureRow
        icon={ImageIcon}
        title={t("imageSearchTitle")}
        description={t("imageSearchDescription")}
        href="/search"
        cta={t("imageSearchCta")}
        mockup={<ImageSearchMockup />}
        reverse={true}
      />
      <FeatureRow
        icon={MessageSquareText}
        title={t("textSearchTitle")}
        description={t("textSearchDescription")}
        href="/search"
        cta={t("textSearchCta")}
        mockup={<TextSearchMockup />}
        reverse={false}
      />
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
  href,
  cta,
  mockup,
  reverse,
}: {
  icon: typeof ScanLine;
  title: string;
  description: string;
  href: string;
  cta: string;
  mockup: React.ReactNode;
  reverse: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10 ${
        reverse ? "sm:flex-row-reverse" : ""
      }`}
    >
      {/* Mockup */}
      <div className="flex justify-center sm:w-1/2">
        <div className="w-full max-w-[280px]">{mockup}</div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-3 sm:w-1/2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        <Link
          href={href}
          className="group/link mt-1 flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function useAnimLoop(stepCount: number, interval: number, pauseAtEnd: number) {
  const [step, setStep] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev >= stepCount) return prev;
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [stepCount, interval]);

  useEffect(() => {
    if (step >= stepCount) {
      timeoutRef.current = setTimeout(() => setStep(0), pauseAtEnd);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [step, stepCount, pauseAtEnd]);

  return step;
}

function ExtractMockup() {
  const step = useAnimLoop(3, 1600, 2500);

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <ScanLine className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium">Upload Recipe</span>
      </div>

      <div className="p-3">
        <div
          className={`flex flex-col items-center justify-center rounded-md border border-dashed py-4 transition-all duration-500 ${
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
                <div className="text-[9px] text-muted-foreground">X-T5 · 26mm</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div
          className={`p-3 space-y-1.5 transition-opacity duration-500 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <SettingMockRow label="Film Simulation" value="Classic Chrome" />
          <SettingMockRow label="Dynamic Range" value="DR400" />
          <SettingMockRow label="Grain Effect" value="Weak / Small" />
          <SettingMockRow label="White Balance" value="Auto" />
        </div>
      </div>

      <div
        className={`p-3 pt-0 transition-opacity duration-500 ${
          step >= 3 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-center rounded-md bg-foreground py-1.5 text-[10px] font-medium text-background">
          Upload Recipe
        </div>
      </div>
    </div>
  );
}

function ImageSearchMockup() {
  const step = useAnimLoop(3, 1600, 2500);

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

        <div
          className={`flex items-center justify-center gap-1.5 mt-2 h-4 transition-opacity duration-500 ${
            step === 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-pulse" />
          <span className="text-[9px] text-muted-foreground">
            Analyzing color & tone...
          </span>
        </div>
      </div>

      <div className="border-t border-border">
        <div
          className={`p-3 space-y-2 transition-opacity duration-500 ${
            step >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-[9px] text-muted-foreground mb-1">
            3 recipes found
          </div>
          {[
            { name: "Classic Chrome", score: "98%" },
            { name: "PRO Neg. Hi", score: "94%" },
            { name: "Nostalgic Neg.", score: "91%" },
          ].map((r, i) => (
            <RecipeResultRow
              key={r.name}
              name={r.name}
              score={r.score}
              delay={i * 80}
              visible={step >= 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TextSearchMockup() {
  const step = useAnimLoop(3, 1600, 2500);
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

        <div
          className={`flex items-center justify-center gap-1.5 mt-2 h-4 transition-opacity duration-500 ${
            step === 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-pulse" />
          <span className="text-[9px] text-muted-foreground">
            Matching recipes...
          </span>
        </div>
      </div>

      <div className="border-t border-border">
        <div
          className={`p-3 space-y-2 transition-opacity duration-500 ${
            step >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-[9px] text-muted-foreground mb-1">
            3 recipes found
          </div>
          {[
            { name: "ASTIA", score: "95%" },
            { name: "Classic Chrome", score: "92%" },
            { name: "PRO Neg. Std", score: "88%" },
          ].map((r, i) => (
            <RecipeResultRow
              key={r.name}
              name={r.name}
              score={r.score}
              delay={i * 80}
              visible={step >= 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingMockRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium">{value}</span>
    </div>
  );
}

function RecipeResultRow({
  name,
  score,
  delay,
  visible,
}: {
  name: string;
  score: string;
  delay: number;
  visible: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md bg-muted/50 p-1.5 transition-all duration-400 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
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
    </div>
  );
}
