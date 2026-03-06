import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { fromSensorSlug, toSlug } from "@/lib/slug";
import { SENSOR_GENERATIONS } from "@/fujifilm/cameras";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sensor = fromSensorSlug(slug);

  if (!sensor) return {};

  return {
    title: `${sensor} Recipes`,
    description: `Browse Fujifilm film simulation recipes from ${sensor} sensor cameras.`,
  };
}

export default async function SensorPage({ params }: Props) {
  const { slug } = await params;
  const sensor = fromSensorSlug(slug);
  if (!sensor) notFound();

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("sensor_generation", sensor)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{sensor}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Film simulation recipes from {sensor} sensor cameras
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid initialRecipes={recipes} sensor={sensor} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found for {sensor} cameras.
          </p>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return SENSOR_GENERATIONS.map((g) => ({ slug: toSlug(g) }));
}
