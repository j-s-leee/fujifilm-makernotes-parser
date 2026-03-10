"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, ImageIcon, MessageSquareText, Sparkles } from "lucide-react";
import { RecommendUploader } from "@/components/recommend-uploader";
import { RecommendResults } from "@/components/recommend-results";
import type { RecommendResult } from "@/components/recommend-uploader";

export function RecommendPageClient() {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState<string | null>(null);

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
            Recipe Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a photo or describe the look you want to find matching
            recipes
          </p>
          <Link
            href="/recommend/history"
            className="text-sm text-muted-foreground hover:text-foreground underline mt-1 inline-block"
          >
            View past recommendations
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
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Image Search</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload any photo and AI will find recipes with a similar look and color tone.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Text Search</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Describe the look you want, like &quot;warm sunset portrait&quot; or &quot;moody street at night&quot;.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Camera Filter</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Narrow results to your camera model for compatible recipe settings.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Try these examples
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  "warm golden hour portrait",
                  "cool blue street photography",
                  "faded vintage film look",
                  "high contrast black and white",
                  "soft pastel tones",
                  "moody dark cafe",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleExampleClick(example)}
                    disabled={exampleLoading !== null}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
                  >
                    {exampleLoading === example ? (
                      <Sparkles className="inline h-3 w-3 animate-pulse" />
                    ) : (
                      example
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
