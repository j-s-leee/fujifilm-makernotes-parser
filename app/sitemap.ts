import type { MetadataRoute } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS } from "@/fujifilm/simulation";
import { ALL_CAMERA_MODELS, SENSOR_GENERATIONS } from "@/fujifilm/cameras";
import { toSlug } from "@/lib/slug";

const BASE_URL = "https://film-simulation.site";
const LOCALES = ["en", "ko"] as const;
const DEFAULT_LOCALE = "en";

type Entry = MetadataRoute.Sitemap[number];

/** Build entries for both locales. Default locale has no prefix. */
function localized(
  path: string,
  opts: { priority: number; changeFrequency: Entry["changeFrequency"] },
): Entry[] {
  return LOCALES.map((locale) => ({
    url: `${BASE_URL}${locale === DEFAULT_LOCALE ? "" : `/${locale}`}${path}`,
    lastModified: new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();

  const [recipesRes, profilesRes, lensesRes] = await Promise.all([
    supabase
      .from("recipes")
      .select("id")
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

  // --- Static pages ---
  const staticPages: Entry[] = [
    ...localized("", { priority: 1.0, changeFrequency: "daily" }),
    ...localized("/recipes", { priority: 0.9, changeFrequency: "daily" }),
    ...localized("/privacy", { priority: 0.3, changeFrequency: "yearly" }),
    ...localized("/terms", { priority: 0.3, changeFrequency: "yearly" }),
  ];

  // --- Category pages ---
  const simulationPages = FUJIFILM_SIMULATION_FORM_INPUT_OPTIONS.flatMap(
    ({ value }) =>
      localized(`/recipes/simulation/${value}`, {
        priority: 0.8,
        changeFrequency: "weekly",
      }),
  );

  const cameraPages = ALL_CAMERA_MODELS.flatMap((model) =>
    localized(`/recipes/camera/${toSlug(model)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const sensorPages = SENSOR_GENERATIONS.flatMap((gen) =>
    localized(`/recipes/sensor/${toSlug(gen)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  const lensPages = lenses.flatMap(({ name }) =>
    localized(`/recipes/lens/${toSlug(name)}`, {
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );

  // --- Dynamic pages ---
  const recipePages = recipes.flatMap(({ id }) =>
    localized(`/recipes/${id}`, {
      priority: 0.7,
      changeFrequency: "monthly",
    }),
  );

  const profilePages = profiles.flatMap(({ username }) =>
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
