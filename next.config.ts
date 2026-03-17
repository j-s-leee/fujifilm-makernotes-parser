import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  headers: async () => [
    {
      // Recipe detail — match both /recipes/123 and /recipes/slug-123
      source: "/:locale*/recipes/:slugId([\\w-]+-\\d+|\\d+)",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=172800",
        },
      ],
    },
    {
      // User profile
      source: "/:locale*/u/:identifier*",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, max-age=3600, stale-while-revalidate=7200",
        },
      ],
    },
    {
      // Category pages (simulation, camera, sensor, lens)
      source: "/:locale*/recipes/:category(simulation|camera|sensor|lens)/:slug*",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, max-age=3600, stale-while-revalidate=7200",
        },
      ],
    },
    {
      // Recipe settings API
      source: "/api/recipes/:id/settings",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=172800",
        },
      ],
    },
    {
      // Static SEO files
      source: "/(sitemap.xml|robots.txt)",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
