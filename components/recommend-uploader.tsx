"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, Search, Camera, X } from "lucide-react";
import Image from "next/image";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { ALL_CAMERA_MODELS } from "@/fujifilm/cameras";
import type { GalleryRecipe } from "@/components/gallery-card";

interface RecommendResult {
  recommendationId: number | null;
  recipes: GalleryRecipe[];
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
  const [cameraModel, setCameraModel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleClearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleImageSearch = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const compressed = await compressImageToThumbnail(selectedFile);

      const formData = new FormData();
      const compressedFile = new File(
        [compressed.blob],
        `recommend.${compressed.extension}`,
        { type: compressed.contentType },
      );
      formData.append("file", compressedFile);
      if (cameraModel) {
        formData.append("cameraModel", cameraModel);
      }

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
      setSelectedFile(null);
      setPreviewUrl(null);
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
        body: JSON.stringify({ text: trimmed, cameraModel: cameraModel || undefined }),
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

  return (
    <div className="flex flex-col gap-3">
      {/* Mode tabs + camera filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
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

        <div className="relative">
          <Camera className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <select
            value={cameraModel}
            onChange={(e) => setCameraModel(e.target.value)}
            className="h-8 appearance-none rounded-lg border border-border bg-background pl-8 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All cameras</option>
            {ALL_CAMERA_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "image" ? (
        selectedFile && previewUrl ? (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={previewUrl}
                alt="Selected image"
                width={400}
                height={300}
                className="mx-auto max-h-64 w-auto object-contain"
              />
              <button
                onClick={handleClearImage}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleImageSearch}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search similar recipes
            </button>
          </div>
        ) : (
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
        )
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
              disabled={!query.trim() || loading}
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
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

export type { RecommendResult };
