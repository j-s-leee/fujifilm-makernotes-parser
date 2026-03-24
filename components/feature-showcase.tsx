"use client";

import { useState } from "react";
import { ScanLine, ImageIcon, MessageSquareText, ArrowRight } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-4">
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 self-center">
        {features.map((key) => {
          const Icon = featureIcons[key];
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
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
        {/* Steps visualization */}
        <div className="p-5 sm:p-6">
          <h3 className="text-base font-semibold">{t(`${active}Title`)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`${active}Description`)}
          </p>

          {/* Step-by-step demo */}
          <div className="mt-5 flex flex-col gap-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {step}
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                  {t(`${active}Step${step}` as never)}
                </p>
              </div>
            ))}
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
