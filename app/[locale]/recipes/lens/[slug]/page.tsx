import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { fromLensSlug, toSlug } from "@/lib/slug";
import { GALLERY_SELECT } from "@/lib/queries";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

async function getAllLensNames() {
  const supabase = createStaticClient();
  const { data } = await supabase.from("lenses").select("name");
  return (data ?? []).map((l) => l.name);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const names = await getAllLensNames();
  const lens = fromLensSlug(slug, names);
  if (!lens) return {};

  return {
    title: `${lens} Recipes`,
    description: `Browse Fujifilm film simulation recipes shot with ${lens}.`,
    alternates: getAlternates(`/recipes/lens/${slug}`),
  };
}

export default async function LensPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "recipeBrowse" });
  const names = await getAllLensNames();
  const lens = fromLensSlug(slug, names);

  if (!lens) notFound();

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select(GALLERY_SELECT)
    .eq("lens_model", lens)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lens}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("lensSubtitle", { name: lens })}
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid initialRecipes={recipes} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("emptyLens", { name: lens })}
          </p>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const names = await getAllLensNames();
  return names.map((n) => ({ slug: toSlug(n) }));
}
