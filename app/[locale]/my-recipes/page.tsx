import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthPrompt } from "@/components/auth-prompt";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function MyRecipesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "myRecipes" });

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

  redirect(`/u/${user.id}`);
}
