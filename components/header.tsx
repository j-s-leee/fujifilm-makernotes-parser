"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Film, Heart, LogOut, Menu, ScanSearch, SlidersHorizontal, Upload, User, X } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UploadRecipeModal } from "@/components/upload-recipe-modal";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
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

  const avatarUrl =
    profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    null;
  const initials = getInitials(displayName);

  const avatarElement = profileLoaded ? (
    <Avatar className="h-8 w-8 cursor-pointer">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName ?? "User"} />}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  ) : (
    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3 md:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-5 w-5" />
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/recipes"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Recipes"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Recipes</TooltipContent>
              </Tooltip>
              {user && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/recommend"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Recommend"
                      >
                        <ScanSearch className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Recommend</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/bookmarks"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Bookmarks"
                      >
                        <Bookmark className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Bookmarks</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/likes"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Likes"
                      >
                        <Heart className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Likes</TooltipContent>
                  </Tooltip>
                </>
              )}
            </TooltipProvider>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:inline-flex"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <UploadRecipeModal
                    open={uploadModalOpen}
                    onOpenChange={setUploadModalOpen}
                  />
                </>
              ) : null}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {avatarElement}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/u/${profile?.username ?? user?.id}`}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
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
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </>
          )}
          <ModeToggle />
          <button
            className="md:hidden"
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
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 md:hidden">
          <Link
            href="/recipes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Recipes
          </Link>
          {user && (
            <>
              <Link
                href="/recommend"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ScanSearch className="h-4 w-4" />
                Recommend
              </Link>
              <Link
                href="/bookmarks"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Bookmark className="h-4 w-4" />
                Bookmarks
              </Link>
              <Link
                href="/likes"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Heart className="h-4 w-4" />
                Likes
              </Link>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
