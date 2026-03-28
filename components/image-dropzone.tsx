"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageDropzoneProps {
  onFileDrop: (files: File[]) => void;
  hasImage: boolean;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageDropzone({ onFileDrop, hasImage, multiple = false, maxFiles = 1 }: ImageDropzoneProps) {
  const t = useTranslations("upload");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileDrop(acceptedFiles);
    },
    [onFileDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/x-fuji-raf": [".raf"],
    },
    multiple,
    maxFiles: multiple ? maxFiles : 1,
  });

  if (hasImage) {
    return (
      <div
        {...getRootProps()}
        className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 cursor-pointer transition-all ${
          isDragActive
            ? "border-foreground bg-muted"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {multiple ? t("addMorePhotos") : t("tryAnother")}
        </p>
      </div>
    );
  }

  return (
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
        {t("dropzoneText")}
      </p>
      <p className="text-xs text-muted-foreground">
        {multiple ? t("dropzoneFormatsMulti") : t("dropzoneFormats")}
      </p>
    </div>
  );
}
