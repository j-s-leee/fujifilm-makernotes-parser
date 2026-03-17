import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import { parseRecipeId, buildRecipeSlugId } from "@/lib/slug";
import { RecipeHero } from "@/components/recipe-hero";
import { BackButton } from "@/components/back-button";
import { SimilarRecipes } from "@/components/similar-recipes";
import { SimilarRecipesSkeleton } from "@/components/skeletons";
import { RECIPE_DETAIL_SELECT, GALLERY_SELECT } from "@/lib/queries";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

const getRecipe = cache(async (recipeId: number) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_DETAIL_SELECT)
    .eq("id", recipeId)
    .single();
  return data;
});

export const revalidate = 86400; // 24 hours — recipe content never changes after creation

interface RecipePageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipeId = parseRecipeId(id);
  if (isNaN(recipeId)) return {};

  const recipe = await getRecipe(recipeId);
  if (!recipe) return {};

  const canonicalSlugId = buildRecipeSlugId(recipe.slug, recipe.id);

  const title = `${recipe.simulation} Recipe`;
  const byName = recipe.user_username
    ? `@${recipe.user_username}`
    : recipe.user_display_name;
  const description = `${recipe.simulation} recipe shot on ${recipe.camera_model ?? "Fujifilm"}${byName ? ` by ${byName}` : ""}`;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const image = recipe.thumbnail_path
    ? `${r2PublicUrl}/${recipe.thumbnail_path}`
    : undefined;

  return {
    title,
    description,
    alternates: getAlternates(`/recipes/${canonicalSlugId}`),
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

async function SimilarRecipesSection({
  recipeId,
  recipeHash,
  locale,
}: {
  recipeId: number;
  recipeHash: string | null;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "recipeDetail" });

  if (!recipeHash) {
    return (
      <p className="text-center text-sm text-muted-foreground py-20">
        {t("noSimilarRecipes")}
      </p>
    );
  }

  const supabase = createStaticClient();
  const { data } = await supabase
    .from("recipes_with_stats")
    .select(GALLERY_SELECT)
    .eq("recipe_hash", recipeHash)
    .neq("id", recipeId)
    .order("created_at", { ascending: false })
    .limit(12);

  const similarRecipes = data ?? [];

  if (similarRecipes.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-20">
        {t("noSimilarRecipes")}
      </p>
    );
  }

  return <SimilarRecipes recipes={similarRecipes} />;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "recipeDetail" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const recipeId = parseRecipeId(id);
  if (isNaN(recipeId)) notFound();

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    // Check if recipe exists but is soft-deleted
    const supabase = createStaticClient();
    const { data: deleted } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .not("deleted_at", "is", null)
      .single();

    if (deleted) {
      return (
        <div className="container py-8 md:py-12">
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-lg font-medium">{t("deletedTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("deletedDescription")}
            </p>
            <BackButton label={tCommon("backToRecipes")} fallbackHref="/recipes" />
          </div>
        </div>
      );
    }

    notFound();
  }

  // Canonical slug redirect — ensures SEO-friendly URL
  const canonicalSlugId = buildRecipeSlugId(recipe.slug, recipe.id);
  if (id !== canonicalSlugId) {
    permanentRedirect(`/recipes/${canonicalSlugId}`);
  }

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const sharer = recipe.user_display_name
    ? {
        userId: recipe.user_id as string,
        displayName: (recipe.user_display_name as string) ?? "Anonymous",
        username: recipe.user_username as string | null,
        avatarUrl: recipe.user_avatar_path
          ? `${r2PublicUrl}/${recipe.user_avatar_path}`
          : null,
      }
    : null;

  const settings = {
    id: recipe.id,
    simulation: recipe.simulation,
    sensor_generation: recipe.sensor_generation,
    dynamic_range_development: recipe.dynamic_range_development,
    grain_roughness: recipe.grain_roughness,
    grain_size: recipe.grain_size,
    color_chrome: recipe.color_chrome,
    color_chrome_fx_blue: recipe.color_chrome_fx_blue,
    wb_type: recipe.wb_type,
    wb_color_temperature: recipe.wb_color_temperature,
    wb_red: recipe.wb_red,
    wb_blue: recipe.wb_blue,
    highlight: recipe.highlight,
    shadow: recipe.shadow,
    color: recipe.color,
    sharpness: recipe.sharpness,
    noise_reduction: recipe.noise_reduction,
    clarity: recipe.clarity,
    bw_adjustment: recipe.bw_adjustment,
    bw_magenta_green: recipe.bw_magenta_green,
    slug: recipe.slug,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: `${recipe.simulation} Film Simulation Recipe`,
    description: `${recipe.simulation} recipe shot on ${recipe.camera_model ?? "Fujifilm"}`,
    contentUrl: recipe.thumbnail_path
      ? `${r2PublicUrl}/${recipe.thumbnail_path}`
      : undefined,
    author: sharer
      ? {
          "@type": "Person",
          name: sharer.displayName,
          ...(sharer.username && {
            url: `https://www.film-simulation.site/u/${sharer.username}`,
          }),
        }
      : undefined,
    datePublished: undefined as string | undefined,
  };

  return (
    <div className="container py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col gap-8">
        {/* Back link */}
        <BackButton label={tCommon("backToRecipes")} fallbackHref="/recipes" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column: Hero (sticky on desktop) */}
          <div className="md:sticky md:top-24 md:self-start">
            <RecipeHero recipe={recipe} settings={settings} sharer={sharer} />
          </div>

          {/* Right column: Similar Recipes */}
          <div>
            <Suspense fallback={<SimilarRecipesSkeleton />}>
              <SimilarRecipesSection
                recipeId={recipeId}
                recipeHash={recipe.recipe_hash}
                locale={locale}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
