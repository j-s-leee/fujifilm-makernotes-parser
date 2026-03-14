"use client";

import { useState } from "react";
import { ChevronDown, ImageIcon, MessageSquareText, Search } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface TextItem {
  id: number;
  queryText: string;
  createdAt: string;
}

interface ImageItem {
  id: number;
  imagePath: string;
  imageWidth: number | null;
  imageHeight: number | null;
  blurDataUrl: string | null;
  createdAt: string;
}

interface RecommendHistoryProps {
  textItems: TextItem[];
  imageItems: ImageItem[];
}

const TEXT_PREVIEW_COUNT = 5;

export function RecommendHistory({ textItems, imageItems }: RecommendHistoryProps) {
  const [textExpanded, setTextExpanded] = useState(false);
  const t = useTranslations("recommend");
  const hasItems = textItems.length > 0 || imageItems.length > 0;
  const hasMoreText = textItems.length > TEXT_PREVIEW_COUNT;
  const visibleTextItems = textExpanded ? textItems : textItems.slice(0, TEXT_PREVIEW_COUNT);

  const relativeDate = (dateStr: string): string => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { count: minutes });
    if (hours < 24) return t("hoursAgo", { count: hours });
    if (days < 7) return t("daysAgo", { count: days });
    if (weeks < 5) return t("weeksAgo", { count: weeks });
    return t("monthsAgo", { count: months });
  };

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("historyTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("historySubtitle")}
          </p>
        </div>

        {!hasItems && (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("historyEmpty")}
          </p>
        )}

        {hasItems && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
            {/* Text Search History — 1col on tablet, 1col on desktop */}
            {textItems.length > 0 && (
              <section className="flex flex-col gap-3 md:col-span-1">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t("textSearches")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({textItems.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {visibleTextItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/recommend/history/${item.id}`}
                      className="group flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm truncate">{item.queryText}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeDate(item.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
                {hasMoreText && (
                  <button
                    onClick={() => setTextExpanded(!textExpanded)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {textExpanded ? t("showLess") : t("viewAllSearches", { count: textItems.length })}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${textExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </section>
            )}

            {/* Image Search History — 2col on tablet, 3col on desktop */}
            {imageItems.length > 0 && (
              <section className="flex flex-col gap-3 md:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t("imageSearches")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({imageItems.length})
                  </span>
                </div>
                <div className="columns-2 gap-3 lg:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
                  {imageItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/recommend/history/${item.id}`}
                      className="group relative block overflow-hidden rounded-lg bg-muted"
                    >
                      <Image
                        src={item.imagePath}
                        alt="Recommendation search"
                        width={item.imageWidth ?? 300}
                        height={item.imageHeight ?? 300}
                        className="w-full object-cover rounded-lg"
                        style={
                          item.imageWidth && item.imageHeight
                            ? { aspectRatio: `${item.imageWidth}/${item.imageHeight}` }
                            : { aspectRatio: "1/1" }
                        }
                        sizes="(max-width: 768px) 50vw, 25vw"
                        placeholder={item.blurDataUrl ? "blur" : "empty"}
                        blurDataURL={item.blurDataUrl ?? undefined}
                      />
                      <div className="absolute bottom-2 left-2">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                          {relativeDate(item.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
