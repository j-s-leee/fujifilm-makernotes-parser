"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";

const REASON_KEYS = [
  { value: "inappropriate", key: "reasonInappropriate" },
  { value: "spam", key: "reasonSpam" },
  { value: "copyright", key: "reasonCopyright" },
  { value: "other", key: "reasonOther" },
] as const;

interface ReportRecipeDialogProps {
  recipeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportRecipeDialog({
  recipeId,
  open,
  onOpenChange,
}: ReportRecipeDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "duplicate" | null>(null);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");

  const reset = () => {
    setReason("");
    setDetail("");
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          detail: reason === "other" ? detail : undefined,
        }),
      });
      if (res.ok) {
        setResult("success");
      } else if (res.status === 409) {
        setResult("duplicate");
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="flex flex-col gap-4">
      <DialogHeader className="gap-2 pb-4">
        <DialogTitle>{t("reportTitle")}</DialogTitle>
        <DialogDescription>
          {t("reportDescription")}
        </DialogDescription>
      </DialogHeader>

      {result ? (
        <div className="py-4 text-center text-sm">
          {result === "success"
            ? t("reportSuccess")
            : t("reportDuplicate")}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {REASON_KEYS.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{t(r.key)}</span>
              </label>
            ))}
            {reason === "other" && (
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t("detailPlaceholder")}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              variant="outline"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason}
              variant="destructive"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tCommon("report")}
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">{content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="p-4 pb-8">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
