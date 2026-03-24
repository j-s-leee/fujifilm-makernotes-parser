import { Link } from "@/i18n/navigation";
import { createStaticClient } from "@/lib/supabase/server";
import { TrendingGrid } from "@/components/trending-grid";
import { FeatureShowcase } from "@/components/feature-showcase";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const revalidate = 43200; // 12 hours — trending updates are not time-critical

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .rpc("get_trending_recipes", { p_limit: 24 });

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>

        <FeatureShowcase />

        {recipes && recipes.length > 0 ? (
          <>
            <TrendingGrid recipes={recipes} />
            <div className="flex justify-center pt-4">
              <Link
                href="/recipes?sort=popular"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("viewAll")} &rarr;
              </Link>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
