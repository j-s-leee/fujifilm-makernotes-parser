import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminReportsTable } from "@/components/admin-reports-table";

const PAGE_SIZE = 50;

interface AdminReportsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch reports with count for pagination
  const { data: reports, count: totalCount } = await supabase
    .from("reports")
    .select("id, reason, detail, created_at, user_id, recipe_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const reportRows = reports ?? [];
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  // Collect unique user_ids and recipe_ids
  const userIds = [...new Set(reportRows.map((r) => r.user_id))];
  const recipeIds = [...new Set(reportRows.map((r) => r.recipe_id))];

  // Fetch reporter profiles, recipe metadata, and report counts in parallel
  const [profilesRes, recipesRes, reportCountsRes] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null }[] }),
    recipeIds.length > 0
      ? supabase
          .from("recipes")
          .select("id, deleted_at, simulation_id, simulations(slug)")
          .in("id", recipeIds)
      : Promise.resolve({ data: [] as { id: number; deleted_at: string | null; simulation_id: number | null; simulations: { slug: string } | null }[] }),
    recipeIds.length > 0
      ? supabase
          .from("reports")
          .select("recipe_id")
          .in("recipe_id", recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: number }[] }),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );

  // Count reports per recipe from DB results
  const reportCountMap = new Map<number, number>();
  for (const r of (reportCountsRes.data ?? []) as { recipe_id: number }[]) {
    reportCountMap.set(r.recipe_id, (reportCountMap.get(r.recipe_id) ?? 0) + 1);
  }

  const recipeMeta: Record<
    number,
    { deleted_at: string | null; report_count: number; simulation: string | null }
  > = {};
  for (const recipe of (recipesRes.data ?? []) as { id: number; deleted_at: string | null; simulations: { slug: string } | null }[]) {
    recipeMeta[recipe.id] = {
      deleted_at: recipe.deleted_at,
      report_count: reportCountMap.get(recipe.id) ?? 0,
      simulation: recipe.simulations?.slug ?? null,
    };
  }

  const formattedReports = reportRows.map((r) => {
    const reporter = profileMap.get(r.user_id);
    return {
      id: r.id as number,
      reason: r.reason as string,
      detail: r.detail as string | null,
      created_at: r.created_at as string,
      recipe_id: r.recipe_id as number,
      reporter_name: reporter?.display_name ?? "Unknown",
      reporter_username: reporter?.username ?? null,
      recipe_simulation: recipeMeta[r.recipe_id]?.simulation ?? null,
      recipe_deleted: !!recipeMeta[r.recipe_id]?.deleted_at,
      recipe_report_count: recipeMeta[r.recipe_id]?.report_count ?? 0,
    };
  });

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">신고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            총 {totalCount ?? 0}건의 신고
          </p>
        </div>
        <AdminReportsTable
          reports={formattedReports}
          page={page}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
