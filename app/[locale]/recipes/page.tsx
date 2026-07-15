import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { RecipesContent } from "@/components/recipes-content";
import {
  SENSOR_GENERATIONS,
  type SensorGeneration,
} from "@/fujifilm/cameras";
import {
  isStringFujifilmSimulation,
  labelForFujifilmSimulation,
  type FujifilmSimulation,
} from "@/fujifilm/simulation";
import { GALLERY_SELECT } from "@/lib/queries";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    simulation?: string;
    sort?: string;
    sensor?: string;
    camera?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recipes" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: getAlternates("/recipes"),
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
    },
  };
}

export default async function RecipesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "recipes" });
  const sp = await searchParams;
  const supabase = await createClient();

  // Build recipes query
  const buildRecipesQuery = () => {
    let query = supabase
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .limit(24);

    if (sp.simulation && isStringFujifilmSimulation(sp.simulation)) {
      query = query.eq("simulation", sp.simulation);
    }

    if (
      sp.sensor &&
      SENSOR_GENERATIONS.includes(sp.sensor as SensorGeneration)
    ) {
      query = query.eq("sensor_generation", sp.sensor);
    }

    if (sp.camera) {
      query = query.eq("camera_model", sp.camera);
    }

    if (sp.sort === "popular") {
      query = query.order("like_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    query = query.order("id", { ascending: false });

    return query;
  };

  // Build camera models query (sensor generation desc, then camera name desc)
  const buildCameraModelsQuery = () => {
    let query = supabase
      .from("camera_models")
      .select("name, sensor_generation")
      .order("sensor_generation", { ascending: false })
      .order("name", { ascending: false });

    if (
      sp.sensor &&
      SENSOR_GENERATIONS.includes(sp.sensor as SensorGeneration)
    ) {
      query = query.eq("sensor_generation", sp.sensor);
    }

    return query;
  };

  // Fetch camera models, simulations, and recipes in parallel
  const [{ data: cameraRows }, { data: simulationRows }, { data: recipes }] =
    await Promise.all([
      buildCameraModelsQuery(),
      supabase.from("simulations").select("slug"),
      buildRecipesQuery(),
    ]);
  const cameraModels = (cameraRows ?? []).map((r) => r.name);
  const simulationOptions = (simulationRows ?? [])
    .map((r) => r.slug)
    .filter(isStringFujifilmSimulation)
    .map((slug) => ({
      value: slug,
      label: labelForFujifilmSimulation(slug as FujifilmSimulation).large,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        <RecipesContent
          params={sp}
          sensorGenerations={SENSOR_GENERATIONS as unknown as string[]}
          cameraModels={cameraModels}
          simulationOptions={simulationOptions}
        >
          {recipes && recipes.length > 0 ? (
            <GalleryGrid
              initialRecipes={recipes}
              simulation={sp.simulation}
              sort={sp.sort}
              sensor={sp.sensor}
              camera={sp.camera}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground py-20">
              {t("empty")}
            </p>
          )}
        </RecipesContent>
      </div>
    </div>
  );
}
