import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getLegalContent } from "@/lib/legal-content";
import { MarkdownContent } from "@/components/markdown-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Film Recipe Viewer",
};

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getLegalContent("privacy", locale);

  return (
    <div className="container py-8 md:py-12">
      <div className="w-full mx-auto">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          {locale === "ko" ? "개인정보 취급방침" : "Privacy Policy"}
        </h1>
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
