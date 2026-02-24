import { createClient } from "@/lib/supabase/server";
import {
  SimulationDistributionChart,
  PopularRecipesChart,
  TrendsChart,
} from "@/components/stats-charts";

export default async function StatsPage() {
  const supabase = await createClient();

  // Simulation distribution
  const { data: recipes } = await supabase
    .from("recipes")
    .select("simulation");

  const simulationCounts: Record<string, number> = {};
  recipes?.forEach((r) => {
    const sim = r.simulation ?? "Unknown";
    simulationCounts[sim] = (simulationCounts[sim] ?? 0) + 1;
  });

  const simulationData = Object.entries(simulationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly trends
  const { data: recipesWithDates } = await supabase
    .from("recipes")
    .select("created_at");

  const monthlyCounts: Record<string, number> = {};
  recipesWithDates?.forEach((r) => {
    const date = new Date(r.created_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyCounts[month] = (monthlyCounts[month] ?? 0) + 1;
  });

  const trendData = Object.entries(monthlyCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Total count
  const totalRecipes = recipes?.length ?? 0;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalRecipes} recipes shared by the community
          </p>
        </div>
        {totalRecipes > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <SimulationDistributionChart data={simulationData.slice(0, 10)} />
            <PopularRecipesChart data={simulationData.slice(0, 10)} />
            <div className="md:col-span-2">
              <TrendsChart data={trendData} />
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No data yet. Share some recipes to see statistics!
          </p>
        )}
      </div>
    </div>
  );
}
