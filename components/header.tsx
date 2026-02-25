"use client";

import { useState } from "react";
import { Film, Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/app/login/actions";
import Link from "next/link";

export function Header() {
  const { user, loading } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3 md:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/gallery"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Gallery
            </Link>
            <Link
              href="/stats"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Stats
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            href="https://tally.so/r/wLqO0J"
            target="_blank"
            rel="noopener noreferrer"
          >
            Feedback
          </a>
          {!loading && (
            <>
              {user ? (
                <form action={signOut} className="hidden md:block">
                  <Button variant="ghost" size="sm" type="submit">
                    Sign Out
                  </Button>
                </form>
              ) : (
                <Link href="/login" className="hidden md:block">
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
            href="/gallery"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Gallery
          </Link>
          <Link
            href="/stats"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Stats
          </Link>
          <a
            href="https://tally.so/r/wLqO0J"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            Feedback
          </a>
          {!loading &&
            (user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Sign Out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign In
              </Link>
            ))}
        </nav>
      )}
    </header>
  );
}
