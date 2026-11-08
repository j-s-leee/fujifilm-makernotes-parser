"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ScanLine } from "lucide-react";

const UploadRecipeModal = dynamic(
  () =>
    import("@/components/upload-recipe-modal").then(
      (m) => m.UploadRecipeModal,
    ),
  { ssr: false },
);

interface ScanButtonProps {
  label: string;
  hint?: string;
}

export function ScanButton({ label, hint }: ScanButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ScanLine className="h-4 w-4" />
        {label}
      </button>
      {hint && (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      )}
      <UploadRecipeModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
