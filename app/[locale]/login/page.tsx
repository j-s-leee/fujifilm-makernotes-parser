import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="container flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image src="/logo/favicon-32x32.png" alt="film-simulation.site" width={20} height={20} className="dark:invert" unoptimized />
            <h1 className="text-lg font-bold tracking-tight">{t("siteTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("signInDescription")}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <GoogleSignInButton className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
