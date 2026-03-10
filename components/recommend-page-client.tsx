"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RecommendUploader } from "@/components/recommend-uploader";
import { RecommendResults } from "@/components/recommend-results";
import type { RecommendResult } from "@/components/recommend-uploader";

export function RecommendPageClient() {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

        {result && (
          <RecommendResults
            recipes={result.recipes}
            uploadedImageUrl={previewUrl}
            queryText={result.queryText}
          />
        )}
      </div>
    </div>
  );
}
