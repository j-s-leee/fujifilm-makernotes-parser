import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import { RecommendHistory } from "@/components/recommend-history";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function RecommendHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "recommend" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title={t("historyAuthTitle")}
        description={t("historyAuthDescription")}
      />
    );
  }

  const [{ data: textItems }, { data: imageItems }] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, query_text, created_at")
      .eq("user_id", user.id)
      .not("query_text", "is", null)
      .is("image_path", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("recommendations")
      .select("id, image_path, image_width, image_height, blur_data_url, created_at")
      .eq("user_id", user.id)
      .not("image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <RecommendHistory
      textItems={(textItems ?? []).map((i) => ({
        id: i.id as number,
        queryText: i.query_text as string,
        createdAt: i.created_at as string,
      }))}
      imageItems={(imageItems ?? []).map((i) => ({
        id: i.id as number,
        imagePath: i.image_path as string,
        imageWidth: i.image_width as number | null,
        imageHeight: i.image_height as number | null,
        blurDataUrl: i.blur_data_url as string | null,
        createdAt: i.created_at as string,
      }))}
    />
  );
}
