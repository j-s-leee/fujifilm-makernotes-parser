import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { listContent } from "@/lib/content";
import { getAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "changelog" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getAlternates("/changelog"),
  };
}

export default async function ChangelogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "changelog" });
  const entries = listContent("changelog", locale);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="space-y-6">
        {entries.map((entry) => (
          <article
            key={entry.slug}
            className="border-b border-border pb-6 last:border-0"
          >
            <Link href={`/changelog/${entry.slug}`} className="group block">
              <time className="text-xs text-muted-foreground">{entry.date}</time>
              <h2 className="mt-1 text-lg font-semibold group-hover:text-primary transition-colors">
                {entry.title}
              </h2>
              {entry.summary && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.summary}
                </p>
              )}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
