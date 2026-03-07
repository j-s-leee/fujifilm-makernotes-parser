"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RecommendUploader } from "@/components/recommend-uploader";
import { RecommendResults } from "@/components/recommend-results";
import type { RecommendResult } from "@/components/recommend-uploader";

export function RecommendPageClient() {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleResult = (newResult: RecommendResult, newPreviewUrl: string) => {
    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setResult(newResult);
    setPreviewUrl(newPreviewUrl);
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recipe Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload any photo to find Fujifilm recipes with a similar look
          </p>
          <Link
            href="/recommend/history"
            className="text-sm text-muted-foreground hover:text-foreground underline mt-1 inline-block"
          >
            View past recommendations
          </Link>
        </div>

        <RecommendUploader onResult={handleResult} />

        {result && previewUrl && (
          <RecommendResults
            recipes={result.recipes}
            uploadedImageUrl={previewUrl}
          />
        )}
      </div>
    </div>
  );
}
