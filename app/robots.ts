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

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/profile",
          "/my-recipes",
          "/likes",
          "/bookmarks",
          "/recommend",
          "/login",
        ],
      },
    ],
    sitemap: "https://film-simulation.site/sitemap.xml",
  };
}
