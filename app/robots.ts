import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  const privatePaths = [
    "/api/",
    "/admin/",
    "/profile",
    "/my-recipes",
    "/likes",
    "/bookmarks",
    "/recommend",
    "/login",
  ];

  // Block both default (en) and locale-prefixed paths
  const disallow = [
    ...privatePaths,
    ...privatePaths.map((p) => `/ko${p}`),
  ];

  return {
    // AI training bot blocking is handled by Cloudflare managed robots.txt
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: "https://www.film-simulation.site/sitemap.xml",
  };
}
