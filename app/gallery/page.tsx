import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import {
  SENSOR_GENERATIONS,
  getCameraModelsForGeneration,
  type SensorGeneration,
} from "@/fujifilm/cameras";

interface GalleryPageProps {
  searchParams: Promise<{
    simulation?: string;
    sort?: string;
    sensor?: string;
  }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recipes_with_stats")
    .select("*")
    .limit(24);

  if (params.simulation) {
    query = query.eq("simulation", params.simulation);
  }

  if (
    params.sensor &&
    SENSOR_GENERATIONS.includes(params.sensor as SensorGeneration)
  ) {
    const models = getCameraModelsForGeneration(
      params.sensor as SensorGeneration,
    );
    const patterns = models.flatMap((m) => [m, `FUJIFILM ${m}`]);
    query = query.in("camera_model", patterns);
  }

  if (params.sort === "popular") {
    query = query.order("like_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: recipes } = await query;

  // Get unique simulations for filter
  const { data: allRecipes } = await supabase
    .from("recipes")
    .select("simulation");
  const simulations = [
    ...new Set(
      allRecipes?.map((r) => r.simulation).filter(Boolean) as string[],
    ),
  ].sort();

  // Get sensor generations that exist in data
  const { data: cameraData } = await supabase
    .from("recipes")
    .select("camera_model")
    .not("camera_model", "is", null);
  const existingModels = new Set(
    cameraData?.map((r) => r.camera_model) ?? [],
  );
  const availableGenerations = SENSOR_GENERATIONS.filter((gen) => {
    const models = getCameraModelsForGeneration(gen);
    return models.some(
      (m) => existingModels.has(m) || existingModels.has(`FUJIFILM ${m}`),
    );
  });

  // Build filter URL helper
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = { ...params, ...overrides };
    const search = new URLSearchParams();
    if (merged.simulation) search.set("simulation", merged.simulation);
    if (merged.sensor) search.set("sensor", merged.sensor);
    if (merged.sort) search.set("sort", merged.sort);
    const qs = search.toString();
    return `/gallery${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Community-shared film recipes
            </p>
          </div>
        </div>

        {/* Sensor generation filter */}
        {availableGenerations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Sensor
            </span>
            <Link
              href={buildUrl({ sensor: undefined })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !params.sensor
                  ? "bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </Link>
            {availableGenerations.map((gen) => (
              <Link
                key={gen}
                href={buildUrl({ sensor: gen })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  params.sensor === gen
                    ? "bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {gen}
              </Link>
            ))}
          </div>
        )}

        {/* Simulation filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Simulation
          </span>
          <Link
            href={buildUrl({ simulation: undefined })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !params.simulation
                ? "bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </Link>
          {simulations.map((sim) => (
            <Link
              key={sim}
              href={buildUrl({ simulation: sim })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                params.simulation === sim
                  ? "bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {sim}
            </Link>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex gap-2">
          <Link
            href={buildUrl({ sort: undefined })}
            className={`text-xs font-medium ${
              params.sort !== "popular"
                ? "text-foreground underline"
                : "text-muted-foreground"
            }`}
          >
            Newest
          </Link>
          <Link
            href={buildUrl({ sort: "popular" })}
            className={`text-xs font-medium ${
              params.sort === "popular"
                ? "text-foreground underline"
                : "text-muted-foreground"
            }`}
          >
            Popular
          </Link>
        </div>

        {recipes && recipes.length > 0 ? (
          <GalleryGrid
            initialRecipes={recipes}
            simulation={params.simulation}
            sort={params.sort}
            sensor={params.sensor}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found. Try a different filter or be the first to share!
          </p>
        )}
      </div>
    </div>
  );
}
