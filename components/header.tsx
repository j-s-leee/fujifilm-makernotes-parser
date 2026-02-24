"use client";

import { Film } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/app/login/actions";
import Link from "next/link";

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 md:px-10">
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
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="https://tally.so/r/wLqO0J"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feedback
        </a>
        {!loading && (
          <>
            {user ? (
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
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
      </div>
    </header>
  );
}
