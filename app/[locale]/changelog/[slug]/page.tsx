import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getContent, getAllSlugs } from "@/lib/content";
import { MarkdownContent } from "@/components/markdown-content";
import { BackButton } from "@/components/back-button";
import { getAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  const slugs = getAllSlugs("changelog");
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getContent("changelog", slug, locale);
  if (!entry) return {};

  return {
    title: entry.meta.title,
    description: entry.meta.summary,
    alternates: getAlternates(`/changelog/${slug}`),
  };
}

export default async function ChangelogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "changelog" });
  const entry = getContent("changelog", slug, locale);
  if (!entry) notFound();

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-6">
        <BackButton label={t("title")} fallbackHref="/changelog" />
      </div>
      <article>
        <time className="text-xs text-muted-foreground">{entry.meta.date}</time>
        <h1 className="mt-2 mb-8 text-2xl font-bold tracking-tight">
          {entry.meta.title}
        </h1>
        <MarkdownContent content={entry.content} />
      </article>
    </div>
  );
}
