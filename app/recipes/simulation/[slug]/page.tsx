import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { fromSimulationSlug } from "@/lib/slug";
import { FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS } from "@/fujifilm/simulation";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = fromSimulationSlug(slug);
  if (!result) return {};

  return {
    title: `${result.label} Recipes`,
    description: `Browse Fujifilm ${result.label} film simulation recipes shared by the community.`,
  };
}

export default async function SimulationPage({ params }: Props) {
  const { slug } = await params;
  const result = fromSimulationSlug(slug);
  if (!result) notFound();

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("simulation", result.dbValue)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{result.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Film simulation recipes using {result.label}
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid initialRecipes={recipes} simulation={result.dbValue} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found for {result.label}.
          </p>
        )}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS.map((opt) => ({
    slug: opt.value,
  }));
}
