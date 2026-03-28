import { Link } from "@/i18n/navigation";
import { createStaticClient } from "@/lib/supabase/server";
import { TrendingGrid } from "@/components/trending-grid";
import { FeatureCarousel } from "@/components/feature-carousel";
import { TrendingSection } from "@/components/trending-section";
import { HeroSection } from "@/components/hero-section";
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
    <div className="container py-12 md:py-20">
      <div className="flex flex-col gap-24 sm:gap-32">
        {/* Hero + Features */}
        <div className="flex flex-col gap-16 sm:gap-20">
          <HeroSection>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("heroTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
              {t("heroSubtitle")}
            </p>
          </HeroSection>

          <FeatureCarousel />
        </div>

        {/* Trending Recipes */}
        {recipes && recipes.length > 0 ? (
          <TrendingSection>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  {t("trendingTitle")}
                </h2>
                <Link
                  href="/recipes?sort=popular"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("viewAll")} &rarr;
                </Link>
              </div>

              <TrendingGrid recipes={recipes} />
            </div>
          </TrendingSection>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
