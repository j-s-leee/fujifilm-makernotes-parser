import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { AuthPrompt } from "@/components/auth-prompt";
import { GALLERY_SELECT } from "@/lib/queries";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function BookmarksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "bookmarks" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title={t("authTitle")}
        description={t("authDescription")}
      />
    );
  }

  const { data: bmarks } = await supabase
    .from("bookmarks")
    .select("recipe_id")
    .eq("user_id", user.id);
  const bookmarkIds = bmarks?.map((b) => b.recipe_id) ?? [];

  let typedRecipes: Parameters<typeof GalleryGrid>[0]["initialRecipes"] = [];
  if (bookmarkIds.length > 0) {
    const { data: recipes } = await supabase
      .from("recipes_with_stats")
      .select(GALLERY_SELECT)
      .in("id", bookmarkIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(24);
    typedRecipes = (recipes ?? []) as typeof typedRecipes;
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        {typedRecipes.length > 0 ? (
          <GalleryGrid
            initialRecipes={typedRecipes}
            recipeIds={bookmarkIds}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
