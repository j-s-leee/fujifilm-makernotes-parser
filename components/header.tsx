"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, LogOut, Menu, User, X } from "lucide-react";
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
  const [profile, setProfile] = useState<{
    display_name: string | null;
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
            <h1 className="text-lg font-bold tracking-tight">
              film-simulation.site
            </h1>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/recipes"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Recipes
            </Link>
            <Link
              href="/stats"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Stats
            </Link>
            {user && (
              <>
                <Link
                  href="/recommend"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Recommend
                </Link>
                <Link
                  href="/my-recipes"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  My Recipes
                </Link>
                <Link
                  href="/bookmarks"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Bookmarks
                </Link>
                <Link
                  href="/likes"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Likes
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {avatarElement}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Edit Profile
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
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Recipes
          </Link>
          <Link
            href="/stats"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Stats
          </Link>
          {user && (
            <>
              <Link
                href="/recommend"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Recommend
              </Link>
              <Link
                href="/my-recipes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                My Recipes
              </Link>
              <Link
                href="/bookmarks"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Bookmarks
              </Link>
              <Link
                href="/likes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
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
