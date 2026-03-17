import type { MetadataRoute } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS } from "@/fujifilm/simulation";
import { ALL_CAMERA_MODELS, SENSOR_GENERATIONS } from "@/fujifilm/cameras";
import { toSlug } from "@/lib/slug";

const BASE_URL = "https://www.film-simulation.site";
const LOCALES = ["en", "ko"] as const;
const DEFAULT_LOCALE = "en";

type Entry = MetadataRoute.Sitemap[number];

/** Build a single sitemap entry with hreflang alternates for all locales. */
function localized(
  path: string,
  opts: {
    priority: number;
    changeFrequency: Entry["changeFrequency"];
    lastModified?: Date;
  },
): Entry {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
    languages[locale] = `${BASE_URL}${prefix}${path}`;
  }
  languages["x-default"] = `${BASE_URL}${path}`;

  return {
    url: `${BASE_URL}${path}`,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();

  const [recipesRes, profilesRes, lensesRes] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, slug, created_at")
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("username")
      .not("username", "is", null),
    supabase
      .from("lenses")
      .select("name"),
  ]);

  const recipes = recipesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const lenses = lensesRes.data ?? [];

  // --- Static pages (no lastModified — omit rather than lie) ---
  const staticPages: Entry[] = [
    localized("", { priority: 1.0, changeFrequency: "daily" }),
    localized("/recipes", { priority: 0.9, changeFrequency: "daily" }),
    localized("/privacy", { priority: 0.3, changeFrequency: "yearly" }),
    localized("/terms", { priority: 0.3, changeFrequency: "yearly" }),
  ];

  // --- Category pages ---
  const simulationPages = FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS.map(
    ({ value }) =>
      localized(`/recipes/simulation/${value}`, {
        priority: 0.8,
        changeFrequency: "weekly",
      }),
  );

  const cameraPages = ALL_CAMERA_MODELS.map((model) =>
    localized(`/recipes/camera/${toSlug(model)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const sensorPages = SENSOR_GENERATIONS.map((gen) =>
    localized(`/recipes/sensor/${toSlug(gen)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const lensPages = lenses.map(({ name }) =>
    localized(`/recipes/lens/${toSlug(name)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  // --- Dynamic pages ---
  const recipePages = recipes.map(({ id, slug, created_at }) =>
    localized(`/recipes/${slug}-${id}`, {
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: created_at ? new Date(created_at) : undefined,
    }),
  );

  const profilePages = profiles.map(({ username }) =>
    localized(`/u/${username}`, {
      priority: 0.6,
      changeFrequency: "weekly",
    }),
  );

  return [
    ...staticPages,
    ...simulationPages,
    ...cameraPages,
    ...sensorPages,
    ...lensPages,
    ...recipePages,
    ...profilePages,
  ];
}
