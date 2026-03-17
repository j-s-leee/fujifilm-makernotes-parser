import {
  SENSOR_GENERATIONS,
  ALL_CAMERA_MODELS,
  type SensorGeneration,
} from "@/fujifilm/cameras";
import {
  type FujifilmSimulation,
  labelForFujifilmSimulation,
  isStringFujifilmSimulation,
} from "@/fujifilm/simulation";

/** Convert a display name to a URL slug: "X-Trans V" → "x-trans-v" */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Resolve a simulation slug to its DB value and display label.
 * DB stores FujifilmSimulation enum values like "classic-chrome", "provia".
 * The slug IS the DB value (already kebab-case).
 */
export function fromSimulationSlug(
  slug: string,
): { dbValue: FujifilmSimulation; label: string } | null {
  if (!isStringFujifilmSimulation(slug)) return null;
  const sim = slug as FujifilmSimulation;
  const label = labelForFujifilmSimulation(sim);
  return { dbValue: sim, label: label.medium };
}

/** Resolve a sensor slug back to a SensorGeneration value */
export function fromSensorSlug(slug: string): SensorGeneration | null {
  return SENSOR_GENERATIONS.find((g) => toSlug(g) === slug) ?? null;
}

/** Resolve a camera slug back to a camera model name */
export function fromCameraSlug(slug: string): string | null {
  return ALL_CAMERA_MODELS.find((m) => toSlug(m) === slug) ?? null;
}

/** Resolve a lens slug back to a lens name from a list of known names */
export function fromLensSlug(
  slug: string,
  knownNames: string[],
): string | null {
  return knownNames.find((n) => toSlug(n) === slug) ?? null;
}

/**
 * Generate a recipe slug from parsed metadata.
 * Example: simulation="classic-chrome", camera="X-T5", lens="XF35mmF1.4 R"
 * → "classic-chrome-x-t5-xf35mmf1-4-r"
 */
export function generateRecipeSlug(
  simulation: string | null,
  cameraModel: string | null,
  lensModel: string | null,
): string {
  const parts = [simulation, cameraModel, lensModel]
    .filter(Boolean)
    .map((p) => toSlug(p!));

  return parts.join("-") || "recipe";
}

/**
 * Build the full slug-id path segment for a recipe URL.
 * Example: slug="classic-chrome-x-t5", id=123 → "classic-chrome-x-t5-123"
 */
export function buildRecipeSlugId(slug: string, id: number): string {
  return `${slug}-${id}`;
}

/**
 * Extract the numeric recipe ID from a slug-id URL segment.
 * "classic-chrome-x-t5-123" → 123
 * "123" → 123 (backward compatible with old URLs)
 */
export function parseRecipeId(slugId: string): number {
  // Try slug-id pattern: last hyphen-separated numeric segment
  const match = slugId.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  // Fallback: entire string is numeric (old URL format)
  return parseInt(slugId, 10);
}
