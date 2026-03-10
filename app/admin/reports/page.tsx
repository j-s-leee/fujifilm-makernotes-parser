import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminReportsTable } from "@/components/admin-reports-table";

export default async function AdminReportsPage() {
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

  // Fetch all reports
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, detail, created_at, user_id, recipe_id")
    .order("created_at", { ascending: false });

  const reportRows = reports ?? [];

  // Collect unique user_ids and recipe_ids
  const userIds = [...new Set(reportRows.map((r) => r.user_id))];
  const recipeIds = [...new Set(reportRows.map((r) => r.recipe_id))];

  // Fetch reporter profiles and recipe metadata in parallel
  const [profilesRes, recipesRes] = await Promise.all([
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
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );

  const recipeMeta: Record<
    number,
    { deleted_at: string | null; report_count: number; simulation: string | null }
  > = {};
  for (const recipe of (recipesRes.data ?? []) as { id: number; deleted_at: string | null; simulations: { slug: string } | null }[]) {
    const count = reportRows.filter((r) => r.recipe_id === recipe.id).length;
    recipeMeta[recipe.id] = {
      deleted_at: recipe.deleted_at,
      report_count: count,
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
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">신고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            총 {formattedReports.length}건의 신고
          </p>
        </div>
        <AdminReportsTable reports={formattedReports} />
      </div>
    </div>
  );
}
