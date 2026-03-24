import type { Metadata } from "next";
import { ScanLine, Camera, Settings, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { ALL_CAMERA_MODELS } from "@/fujifilm/cameras";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "extract" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/extract"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

export default async function ExtractPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "extract" });

  const steps = [
    { icon: Upload, title: t("step1Title"), description: t("step1Description") },
    { icon: Camera, title: t("step2Title"), description: t("step2Description") },
    { icon: Settings, title: t("step3Title"), description: t("step3Description") },
  ];

  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Film Simulation Recipe Extractor",
    description: t("metaDescription"),
    url: "https://www.film-simulation.site/extract",
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
            <ScanLine className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground max-w-lg">
            {t("subtitle")}
          </p>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-center mb-6">
            {t("howItWorks")}
          </h2>
          <div className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supported cameras */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-center mb-4">
            {t("supportedCameras")}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {ALL_CAMERA_MODELS.map((model) => (
              <span
                key={model}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {model}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ScanLine className="h-4 w-4" />
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
