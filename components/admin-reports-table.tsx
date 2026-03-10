"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Report {
  id: number;
  reason: string;
  detail: string | null;
  created_at: string;
  recipe_id: number;
  reporter_name: string;
  reporter_username: string | null;
  recipe_simulation: string | null;
  recipe_deleted: boolean;
  recipe_report_count: number;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: "부적절한 콘텐츠",
  spam: "스팸",
  copyright: "저작권 침해",
  other: "기타",
};

export function AdminReportsTable({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDismiss = async (reportId: number) => {
    setLoadingId(`dismiss-${reportId}`);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/dismiss`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const handleRestore = async (recipeId: number) => {
    setLoadingId(`restore-${recipeId}`);
    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}/restore`, {
        method: "PATCH",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  if (reports.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">
        신고 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">레시피</th>
            <th className="px-4 py-3 text-left font-medium">사유</th>
            <th className="px-4 py-3 text-left font-medium">신고자</th>
            <th className="px-4 py-3 text-left font-medium">날짜</th>
            <th className="px-4 py-3 text-left font-medium">신고 수</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-left font-medium">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reports.map((report) => (
            <tr key={report.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link
                  href={`/recipes/${report.recipe_id}`}
                  className="text-primary hover:underline"
                >
                  #{report.recipe_id}
                  {report.recipe_simulation &&
                    ` (${report.recipe_simulation})`}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {REASON_LABELS[report.reason] ?? report.reason}
                </span>
                {report.detail && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {report.detail}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {report.reporter_username
                  ? `@${report.reporter_username}`
                  : report.reporter_name}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={
                    report.recipe_report_count >= 3
                      ? "font-semibold text-destructive"
                      : ""
                  }
                >
                  {report.recipe_report_count}
                </span>
              </td>
              <td className="px-4 py-3">
                {report.recipe_deleted ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    숨김
                  </span>
                ) : (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                    공개
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(report.id)}
                    disabled={loadingId !== null}
                    title="신고 삭제"
                  >
                    {loadingId === `dismiss-${report.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  {report.recipe_deleted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(report.recipe_id)}
                      disabled={loadingId !== null}
                      title="레시피 복구"
                    >
                      {loadingId === `restore-${report.recipe_id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
