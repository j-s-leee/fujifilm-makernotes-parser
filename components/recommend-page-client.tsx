"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Camera, ImageIcon, MessageSquareText, Sparkles } from "lucide-react";
import { RecommendUploader } from "@/components/recommend-uploader";
import { RecommendResults } from "@/components/recommend-results";
import type { RecommendResult } from "@/components/recommend-uploader";
import { useTranslations } from "next-intl";

export function RecommendPageClient() {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState<string | null>(null);
  const t = useTranslations("recommend");

  const handleResult = (
    newResult: RecommendResult,
    newPreviewUrl: string | null,
  ) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setResult(newResult);
    setPreviewUrl(newPreviewUrl);
  };

  const examples = [
    { key: "example1", text: t("example1") },
    { key: "example2", text: t("example2") },
    { key: "example3", text: t("example3") },
    { key: "example4", text: t("example4") },
    { key: "example5", text: t("example5") },
    { key: "example6", text: t("example6") },
  ];

  const handleExampleClick = async (text: string) => {
    setExampleLoading(text);
    try {
      const res = await fetch("/api/recommend/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed");
      const data: RecommendResult = await res.json();
      handleResult(data, null);
    } catch {
      // silently fail
    } finally {
      setExampleLoading(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
          <Link
            href="/recommend/history"
            className="text-sm text-muted-foreground hover:text-foreground underline mt-1 inline-block"
          >
            {t("viewHistory")}
          </Link>
        </div>

        <RecommendUploader onResult={handleResult} />

        {result ? (
          <RecommendResults
            recipes={result.recipes}
            uploadedImageUrl={previewUrl}
            queryText={result.queryText}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("howItWorks")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">{t("imageSearch")}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("imageSearchDescription")}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">{t("textSearch")}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("textSearchDescription")}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">{t("cameraFilter")}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("cameraFilterDescription")}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {t("tryExamples")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example.key}
                    onClick={() => handleExampleClick(example.text)}
                    disabled={exampleLoading !== null}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
                  >
                    {exampleLoading === example.text ? (
                      <Sparkles className="inline h-3 w-3 animate-pulse" />
                    ) : (
                      example.text
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
