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

const REASONS = [
  { value: "inappropriate", label: "부적절한 콘텐츠" },
  { value: "spam", label: "스팸" },
  { value: "copyright", label: "저작권 침해" },
  { value: "other", label: "기타" },
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>신고 사유를 선택해주세요.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 text-center text-sm">
            {result === "success"
              ? "신고가 접수되었습니다."
              : "이미 신고한 레시피입니다."}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {REASONS.map((r) => (
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
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
              {reason === "other" && (
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="상세 설명을 입력해주세요"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !reason}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                신고하기
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
