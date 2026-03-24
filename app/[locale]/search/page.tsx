import type { Metadata } from "next";
import { ImageIcon, MessageSquareText, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/search"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "search" });

  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  const textExamples = [
    t("example1"),
    t("example2"),
    t("example3"),
    t("example4"),
    t("example5"),
    t("example6"),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Film Simulation Recipe Finder",
    description: t("metaDescription"),
    url: "https://www.film-simulation.site/search",
    applicationCategory: "PhotographyApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="container py-8 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-2xl">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground max-w-lg">
            {t("subtitle")}
          </p>
        </div>

        {/* Two modes */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Image search */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">{t("imageTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("imageDescription")}
            </p>
            <ul className="mt-auto flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>• {t("imageBullet1")}</li>
              <li>• {t("imageBullet2")}</li>
              <li>• {t("imageBullet3")}</li>
            </ul>
          </div>

          {/* Text search */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">{t("textTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("textDescription")}
            </p>
            <ul className="mt-auto flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>• {t("textBullet1")}</li>
              <li>• {t("textBullet2")}</li>
              <li>• {t("textBullet3")}</li>
            </ul>
          </div>
        </div>

        {/* Text search examples */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-center mb-4">
            {t("examplesTitle")}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {textExamples.map((example) => (
              <span
                key={example}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                &ldquo;{example}&rdquo;
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            {t("cta")}
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">{t("ctaHint")}</p>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold text-center mb-6">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium">{faq.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
