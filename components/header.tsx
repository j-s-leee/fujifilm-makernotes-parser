"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  FolderOpen,
  Heart,
  LogIn,
  LogOut,
  Menu,
  ScanLine,
  ScanSearch,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import dynamic from "next/dynamic";
import type { LoginFeature } from "@/components/login-prompt-modal";
import { useUser } from "@/hooks/use-user";
import { useTranslations } from "next-intl";

const UploadRecipeModal = dynamic(
  () =>
    import("@/components/upload-recipe-modal").then(
      (m) => m.UploadRecipeModal
    ),
  { ssr: false }
);

const LoginPromptModal = dynamic(
  () =>
    import("@/components/login-prompt-modal").then(
      (m) => m.LoginPromptModal
    ),
  { ssr: false }
);
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const { user, loading } = useUser();
  const router = useRouter();
  const t = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [loginPromptFeature, setLoginPromptFeature] =
    useState<LoginFeature | null>(null);
  const [profile, setProfile] = useState<{
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfileLoaded(false);
      loadProfile();
    } else {
      setProfile(null);
      setProfileLoaded(false);
    }
  }, [user, loadProfile]);

  const avatarUrl = profile?.avatar_url ?? null;
  const displayName = profile?.display_name ?? null;
  const initials = getInitials(displayName);

  const avatarElement = profileLoaded ? (
    <Avatar className="h-8 w-8 cursor-pointer">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName ?? "User"} />}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  ) : (
    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
  );

  /** Navigate if logged in, otherwise show login prompt modal */
  const navOrPrompt = (href: string, feature: LoginFeature) => {
    if (user) {
      router.push(href);
    } else {
      setLoginPromptFeature(feature);
    }
  };

  const navLinkClass =
    "flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer";
  const mobileNavLinkClass =
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo/favicon-32x32.png"
                alt="film-simulation.site"
                width={20}
                height={20}
                unoptimized
              />
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              <Link href="/recipes" className={navLinkClass}>
                <SlidersHorizontal className="h-4 w-4" />
                {t("recipes")}
              </Link>
              <button
                onClick={() => navOrPrompt("/recommend", "recommend")}
                className={navLinkClass}
              >
                <ScanSearch className="h-4 w-4" />
                {t("recommend")}
              </button>
              <button
                onClick={() => navOrPrompt("/bookmarks", "bookmarks")}
                className={navLinkClass}
              >
                <Bookmark className="h-4 w-4" />
                {t("bookmarks")}
              </button>
              <button
                onClick={() => navOrPrompt("/likes", "likes")}
                className={navLinkClass}
              >
                <Heart className="h-4 w-4" />
                {t("likes")}
              </button>
              <button
                onClick={() => navOrPrompt("/collections", "collections")}
                className={navLinkClass}
              >
                <FolderOpen className="h-4 w-4" />
                {t("collections")}
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  onClick={() => setUploadModalOpen(true)}
                  aria-label={t("scan")}
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:inline-flex"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  {t("scan")}
                </Button>
                <UploadRecipeModal
                  open={uploadModalOpen}
                  onOpenChange={setUploadModalOpen}
                />
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {avatarElement}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/u/${profile?.username ?? user?.id}`}>
                          <User className="mr-2 h-4 w-4" />
                          {t("profile")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          await createClient().auth.signOut();
                          router.push("/");
                          router.refresh();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      <LogIn className="mr-2 h-4 w-4" />
                      {t("signIn")}
                    </Button>
                  </Link>
                )}
              </>
            )}
            <LocaleSwitcher />
            <ModeToggle />
            <button
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="container flex flex-col gap-1 border-t border-border py-3 lg:hidden">
            <Link
              href="/recipes"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("recipes")}
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navOrPrompt("/recommend", "recommend");
              }}
              className={mobileNavLinkClass}
            >
              <ScanSearch className="h-4 w-4" />
              {t("recommend")}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navOrPrompt("/bookmarks", "bookmarks");
              }}
              className={mobileNavLinkClass}
            >
              <Bookmark className="h-4 w-4" />
              {t("bookmarks")}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navOrPrompt("/likes", "likes");
              }}
              className={mobileNavLinkClass}
            >
              <Heart className="h-4 w-4" />
              {t("likes")}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navOrPrompt("/collections", "collections");
              }}
              className={mobileNavLinkClass}
            >
              <FolderOpen className="h-4 w-4" />
              {t("collections")}
            </button>
          </nav>
        )}
      </header>

      <LoginPromptModal
        open={loginPromptFeature !== null}
        onOpenChange={(open) => {
          if (!open) setLoginPromptFeature(null);
        }}
        feature={loginPromptFeature ?? "recommend"}
      />
    </>
  );
}
