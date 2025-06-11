"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface ImageDropzoneProps {
  onFileDrop: (files: File[]) => void;
}

export function ImageDropzone({ onFileDrop }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileDrop(acceptedFiles);
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`font-space-grotesk border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/5"
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-1">
        Drag & drop a Fujifilm image here, or click to select
      </p>
      <p className="text-xs text-muted-foreground/70">Supports JPG files</p>
    </div>
  );
}
