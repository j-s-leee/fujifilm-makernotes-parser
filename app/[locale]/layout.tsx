import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { UserInteractionsProvider } from "@/contexts/user-interactions-context";
import { CollectionsProvider } from "@/contexts/collections-context";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL("https://film-simulation.site"),
    title: {
      default: "film-simulation.site",
      template: "%s | film-simulation.site",
    },
    description: t("siteDescription"),
    openGraph: {
      type: "website",
      siteName: "film-simulation.site",
      title: "film-simulation.site",
      description: t("siteDescription"),
      images: [{ url: "/logo/og.png" }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/logo/og.png"],
    },
    icons: {
      icon: [
        { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/logo/favicon.ico",
      apple: "/logo/apple-touch-icon.png",
    },
    manifest: "/logo/site.webmanifest",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_R2_PUBLIC_URL}
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} bg-background font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <UserInteractionsProvider>
              <CollectionsProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex flex-1 flex-col">{children}</main>
                  <Footer />
                </div>
                <Toaster position="top-center" richColors />
                <SpeedInsights />
              </CollectionsProvider>
            </UserInteractionsProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
