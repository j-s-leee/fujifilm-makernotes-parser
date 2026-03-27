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
  const slugs = getAllSlugs("guide");
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getContent("guide", slug, locale);
  if (!entry) return {};

  return {
    title: entry.meta.title,
    description: entry.meta.summary,
    alternates: getAlternates(`/guide/${slug}`),
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "guide" });
  const entry = getContent("guide", slug, locale);
  if (!entry) notFound();

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-6">
        <BackButton label={t("title")} fallbackHref="/guide" />
      </div>
      <article>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          {entry.meta.title}
        </h1>
        <MarkdownContent content={entry.content} />
      </article>
    </div>
  );
}
