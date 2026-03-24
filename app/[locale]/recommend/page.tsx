import { createClient } from "@/lib/supabase/server";
import { RecommendPageClient } from "@/components/recommend-page-client";
import { setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function RecommendPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <RecommendPageClient isAuthenticated={!!user} />;
}
