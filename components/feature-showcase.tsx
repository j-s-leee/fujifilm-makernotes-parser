"use client";

import { useState, useCallback, type FormEvent } from "react";
import { ScanLine, ImageIcon, MessageSquareText, Search, Upload, Loader2, ArrowRight } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";

export function FeatureShowcase() {
  const t = useTranslations("home.features");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const handleTextSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchLoading(true);
    router.push(`/recommend?q=${encodeURIComponent(trimmed)}`);
  };

  const handleExampleClick = (example: string) => {
    setSearchLoading(true);
    router.push(`/recommend?q=${encodeURIComponent(example)}`);
  };

  const examples = [
    t("example1"),
    t("example2"),
    t("example3"),
    t("example4"),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero search bar */}
      <form onSubmit={handleTextSearch} className="mx-auto w-full max-w-lg">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-border bg-background py-3 pl-10 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!query.trim() || searchLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </form>

      {/* Example chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => handleExampleClick(example)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>

      {/* Interactive feature cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ExtractCard />
        <ImageSearchCard />
        <TextSearchCard />
      </div>
    </div>
  );
}

function ExtractCard() {
  const t = useTranslations("home.features");
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(() => {
    // Navigate to recommend page — actual scan is handled by the header modal
    // For now, redirect to extract page
    router.push("/extract");
  }, [router]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/x-fujifilm-raf": [".raf"],
    },
    multiple: false,
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative flex flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-all ${
        isDragging
          ? "border-foreground bg-muted scale-[1.02]"
          : "border-border hover:border-foreground/20 hover:bg-muted/50"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("extractTitle")}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("extractDescription")}
      </p>
      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        <span>{t("extractDrop")}</span>
      </div>
      <Link
        href="/extract"
        className="absolute inset-0 z-10"
        aria-label={t("extractTitle")}
      />
    </div>
  );
}

function ImageSearchCard() {
  const t = useTranslations("home.features");
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const onDrop = useCallback(() => {
    router.push("/recommend");
  }, [router]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative flex flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-all ${
        isDragging
          ? "border-foreground bg-muted scale-[1.02]"
          : "border-border hover:border-foreground/20 hover:bg-muted/50"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("imageSearchTitle")}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("imageSearchDescription")}
      </p>
      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        <span>{t("imageDrop")}</span>
      </div>
      <Link
        href="/search"
        className="absolute inset-0 z-10"
        aria-label={t("imageSearchTitle")}
      />
    </div>
  );
}

function TextSearchCard() {
  const t = useTranslations("home.features");

  return (
    <Link
      href="/search"
      className="group flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("textSearchTitle")}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("textSearchDescription")}
      </p>
      <span className="mt-auto text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        {t("learnMore")} &rarr;
      </span>
    </Link>
  );
}
