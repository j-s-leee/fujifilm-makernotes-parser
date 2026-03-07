"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { compressImageToThumbnail } from "@/lib/compress-image";

interface RecommendedRecipe {
  id: number;
  simulation: string | null;
  thumbnail_path: string | null;
  blur_data_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  bookmark_count: number;
  like_count: number;
  camera_model: string | null;
  similarity: number;
}

interface RecommendResult {
  recommendationId: number | null;
  imagePath: string;
  blurDataUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  recipes: RecommendedRecipe[];
}

interface RecommendUploaderProps {
  onResult: (result: RecommendResult, previewUrl: string) => void;
}

export function RecommendUploader({ onResult }: RecommendUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Create preview URL for display
      const previewUrl = URL.createObjectURL(file);

      // Compress on client side (matching existing pattern)
      const compressed = await compressImageToThumbnail(file);

      // Send to API
      const formData = new FormData();
      const compressedFile = new File(
        [compressed.blob],
        `recommend.${compressed.extension}`,
        { type: compressed.contentType }
      );
      formData.append("file", compressedFile);

      const res = await fetch("/api/recommend", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to get recommendations");
      }

      const result: RecommendResult = await res.json();
      onResult(result, previewUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: false,
    disabled: loading,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12">
        <Loader2 className="h-10 w-10 mb-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-foreground mb-1">
          Finding similar recipes...
        </p>
        <p className="text-xs text-muted-foreground">
          This may take a few seconds
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 cursor-pointer transition-all ${
          isDragActive
            ? "border-foreground bg-muted scale-[1.01]"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
        <p className="text-sm text-foreground mb-1">
          Upload any photo to find matching Fujifilm recipes
        </p>
        <p className="text-xs text-muted-foreground">
          Supports JPG, PNG, and WebP
        </p>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export type { RecommendResult, RecommendedRecipe };
