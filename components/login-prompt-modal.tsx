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
  Heart,
  ScanSearch,
  Upload,
} from "lucide-react";

export type LoginFeature = "recommend" | "bookmarks" | "likes" | "upload";

interface FeatureConfig {
  icon: ReactNode;
  title: string;
  description: string;
  benefits: string[];
  next: string;
}

const iconClass = "h-8 w-8";

const FEATURES: Record<LoginFeature, FeatureConfig> = {
  recommend: {
    icon: <ScanSearch className={iconClass} />,
    title: "AI Recipe Recommendation",
    description: "Upload a photo and discover similar film recipes instantly.",
    benefits: [
      "Find recipes that match any photo's look",
      "AI-powered image similarity search",
      "Discover new film simulation styles",
    ],
    next: "/recommend",
  },
  bookmarks: {
    icon: <Bookmark className={iconClass} />,
    title: "Bookmark Recipes",
    description: "Save your favorite recipes and access them anytime.",
    benefits: [
      "Build your personal recipe collection",
      "Quick access to saved recipes",
      "Organize recipes you want to try",
    ],
    next: "/bookmarks",
  },
  likes: {
    icon: <Heart className={iconClass} />,
    title: "Like Recipes",
    description: "Show appreciation for recipes you love.",
    benefits: [
      "Support recipe creators",
      "Keep track of recipes you enjoyed",
      "Help others discover great recipes",
    ],
    next: "/likes",
  },
  upload: {
    icon: <Upload className={iconClass} />,
    title: "Upload Your Recipe",
    description: "Share your Fujifilm film recipes with the community.",
    benefits: [
      "Share your unique film simulation settings",
      "Get likes and feedback from others",
      "Build your recipe portfolio",
    ],
    next: "/",
  },
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
  const config = FEATURES[feature];

  const content = (
    <div className="flex flex-col items-center gap-6 p-6 pt-2">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {config.icon}
      </div>

      {/* Title & description */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">{config.title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>

      {/* Benefits */}
      <ul className="w-full space-y-2.5">
        {config.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <GoogleSignInButton className="w-full" size="lg" next={config.next} />
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 pt-8">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>
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
