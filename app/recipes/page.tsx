import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { RecipesContent } from "@/components/recipes-content";
import {
  SENSOR_GENERATIONS,
  type SensorGeneration,
} from "@/fujifilm/cameras";
import {
  FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS,
  isStringFujifilmSimulation,
} from "@/fujifilm/simulation";
import { GALLERY_SELECT } from "@/lib/queries";

interface RecipesPageProps {
  searchParams: Promise<{
    simulation?: string;
    sort?: string;
    sensor?: string;
    camera?: string;
  }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build recipes query
  const buildRecipesQuery = () => {
    let query = supabase
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .limit(24);

    if (params.simulation && isStringFujifilmSimulation(params.simulation)) {
      query = query.eq("simulation", params.simulation);
    }

    if (
      params.sensor &&
      SENSOR_GENERATIONS.includes(params.sensor as SensorGeneration)
    ) {
      query = query.eq("sensor_generation", params.sensor);
    }

    if (params.camera) {
      query = query.eq("camera_model", params.camera);
    }

    if (params.sort === "popular") {
      query = query.order("like_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    query = query.order("id", { ascending: false });

    return query;
  };

  // Fetch camera models and recipes in parallel
  const [{ data: cameraRows }, { data: recipes }] = await Promise.all([
    supabase.from("camera_models").select("name").order("name"),
    buildRecipesQuery(),
  ]);
  const cameraModels = (cameraRows ?? []).map((r) => r.name);

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Recipes</h1>

        <RecipesContent
          params={params}
          sensorGenerations={SENSOR_GENERATIONS as unknown as string[]}
          cameraModels={cameraModels}
          simulationOptions={FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS}
        >
          {recipes && recipes.length > 0 ? (
            <GalleryGrid
              initialRecipes={recipes}
              simulation={params.simulation}
              sort={params.sort}
              sensor={params.sensor}
              camera={params.camera}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground py-20">
              No recipes found. Try a different filter or be the first to share!
            </p>
          )}
        </RecipesContent>
      </div>
    </div>
  );
}
