"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Loader2, Trash2, RotateCcw, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslations, useLocale } from "next-intl";

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

interface AdminReportsTableProps {
  reports: Report[];
  page: number;
  totalPages: number;
}

export function AdminReportsTable({ reports, page, totalPages }: AdminReportsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const REASON_LABELS: Record<string, string> = {
    inappropriate: t("reasonInappropriate"),
    spam: t("reasonSpam"),
    copyright: t("reasonCopyright"),
    other: t("reasonOther"),
  };

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

  const handleDelete = async (recipeId: number) => {
    setLoadingId(`delete-${recipeId}`);
    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}/delete`, {
        method: "PATCH",
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
        {t("noReports")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("tableRecipe")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableReason")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableReporter")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableDate")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableReportCount")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableStatus")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("tableActions")}</th>
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
                {new Date(report.created_at).toLocaleDateString(locale)}
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
                    {t("statusHidden")}
                  </span>
                ) : (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                    {t("statusPublic")}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {/* Dismiss Report */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId !== null}
                        title={t("dismissReport")}
                      >
                        {loadingId === `dismiss-${report.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("dismissReportTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("dismissReportDescription")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDismiss(report.id)}>
                          {t("dismiss")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Restore / Delete Recipe */}
                  {report.recipe_deleted ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId !== null}
                          title={t("restoreRecipe")}
                        >
                          {loadingId === `restore-${report.recipe_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("restoreRecipeTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("restoreRecipeDescription", { id: report.recipe_id })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestore(report.recipe_id)}>
                            {t("restore")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId !== null}
                          title={t("deleteRecipe")}
                          className="text-destructive hover:text-destructive"
                        >
                          {loadingId === `delete-${report.recipe_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteRecipeTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteRecipeDescription", { id: report.recipe_id })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(report.recipe_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {tCommon("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {totalPages > 1 && (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          asChild={page > 1}
        >
          {page > 1 ? (
            <Link href={`/admin/reports?page=${page - 1}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("previous")}
            </Link>
          ) : (
            <span>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("previous")}
            </span>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("pageOf", { page, totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
        >
          {page < totalPages ? (
            <Link href={`/admin/reports?page=${page + 1}`}>
              {t("next")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          ) : (
            <span>
              {t("next")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    )}
    </div>
  );
}
