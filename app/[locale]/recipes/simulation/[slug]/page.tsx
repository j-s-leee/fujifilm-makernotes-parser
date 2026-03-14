import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { fromSimulationSlug } from "@/lib/slug";
import { FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS } from "@/fujifilm/simulation";
import { GALLERY_SELECT } from "@/lib/queries";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string; locale: string }>;
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
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "recipeBrowse" });
  const result = fromSimulationSlug(slug);
  if (!result) notFound();

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select(GALLERY_SELECT)
    .eq("simulation", result.dbValue)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{result.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("simulationSubtitle", { name: result.label })}
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid initialRecipes={recipes} simulation={result.dbValue} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("emptySimulation", { name: result.label })}
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
