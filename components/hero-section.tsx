"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureCarousel } from "@/components/feature-carousel";
import { useTranslations } from "next-intl";

export function HeroSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("home.features");

  return (
    <div className="text-center break-keep [word-break:keep-all] animate-fade-in-up">
      {children}
      <Button size="sm" className="mt-4" onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setOpen(true); }}>
        <ScanLine className="mr-2 h-4 w-4" />
        {t("showFeatures")}
      </Button>
      <FeatureCarousel open={open} onOpenChange={setOpen} />
    </div>
  );
}
