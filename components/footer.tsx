"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
        <nav className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("terms")}
          </Link>
          <a
            href="https://tally.so/r/b5lQag"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("contact")}
          </a>
          <Link
            href="/changelog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("changelog")}
          </Link>
          <Link
            href="/guide"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("guide")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
