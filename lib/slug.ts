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
