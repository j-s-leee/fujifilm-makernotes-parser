"use client";

import { useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, Search } from "lucide-react";
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
  recipes: RecommendedRecipe[];
  // Image search fields (optional)
  imagePath?: string;
  blurDataUrl?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  // Text search fields (optional)
  queryText?: string;
}

interface RecommendUploaderProps {
  onResult: (result: RecommendResult, previewUrl: string | null) => void;
}

type Mode = "image" | "text";

export function RecommendUploader({ onResult }: RecommendUploaderProps) {
  const [mode, setMode] = useState<Mode>("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const previewUrl = URL.createObjectURL(file);
      const compressed = await compressImageToThumbnail(file);

      const formData = new FormData();
      const compressedFile = new File(
        [compressed.blob],
        `recommend.${compressed.extension}`,
        { type: compressed.contentType },
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
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleTextSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommend/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to get recommendations");
      }

      const result: RecommendResult = await res.json();
      onResult(result, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
    <div className="flex flex-col gap-3">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 self-start">
        <button
          onClick={() => setMode("image")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "image"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Image
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Text
        </button>
      </div>

      {mode === "image" ? (
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
      ) : (
        <form onSubmit={handleTextSearch} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. warm sunset portrait, moody street at night, vintage film look..."
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe the look you want and we&apos;ll find matching recipes
          </p>
        </form>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export type { RecommendResult, RecommendedRecipe };
