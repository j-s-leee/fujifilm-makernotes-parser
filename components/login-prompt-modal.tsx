"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Bookmark,
  Check,
  FolderOpen,
  Heart,
  ScanSearch,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type LoginFeature = "recommend" | "bookmarks" | "likes" | "upload" | "collections";

const iconClass = "h-8 w-8";

const FEATURE_ICONS: Record<LoginFeature, ReactNode> = {
  recommend: <ScanSearch className={iconClass} />,
  bookmarks: <Bookmark className={iconClass} />,
  likes: <Heart className={iconClass} />,
  upload: <Upload className={iconClass} />,
  collections: <FolderOpen className={iconClass} />,
};

const FEATURE_NEXT: Record<LoginFeature, string> = {
  recommend: "/recommend",
  bookmarks: "/bookmarks",
  likes: "/likes",
  upload: "/",
  collections: "/collections",
};

const BENEFIT_KEYS: Record<LoginFeature, string[]> = {
  recommend: ["match", "ai", "discover"],
  bookmarks: ["collection", "quickAccess", "organize"],
  likes: ["support", "track", "help"],
  upload: ["share", "feedback", "portfolio"],
  collections: ["themed", "shareCommunity", "organize"],
};

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: LoginFeature;
}

export function LoginPromptModal({
  open,
  onOpenChange,
  feature,
}: LoginPromptModalProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const t = useTranslations("loginPrompt");

  const title = t(`${feature}.title`);
  const description = t(`${feature}.description`);
  const benefits = BENEFIT_KEYS[feature].map((key) =>
    t(`${feature}.benefits.${key}`)
  );

  const content = (
    <div className="flex flex-col items-center gap-6 p-6 pt-2">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {FEATURE_ICONS[feature]}
      </div>

      {/* Title & description */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Benefits */}
      <ul className="w-full space-y-2.5">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <GoogleSignInButton className="w-full" size="lg" next={FEATURE_NEXT[feature]} />
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 pt-8">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {content}
      </DrawerContent>
    </Drawer>
  );
}
