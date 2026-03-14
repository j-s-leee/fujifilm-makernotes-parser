import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getLegalContent } from "@/lib/legal-content";
import { MarkdownContent } from "@/components/markdown-content";

export const metadata: Metadata = {
  title: "Terms of Service — Film Recipe Viewer",
};

type Props = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getLegalContent("terms", locale);

  return (
    <div className="container py-8 md:py-12">
      <div className="w-full mx-auto">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          {locale === "ko" ? "이용약관" : "Terms of Service"}
        </h1>
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
