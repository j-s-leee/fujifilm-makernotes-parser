export type SensorGeneration =
  | "X-Trans I"
  | "X-Trans II"
  | "X-Trans III"
  | "X-Trans IV"
  | "X-Trans V"
  | "Bayer";

// Fujifilm camera model → sensor generation mapping
// Camera model strings come from EXIF data, usually prefixed with "FUJIFILM"
const CAMERA_SENSOR_MAP: Record<string, SensorGeneration> = {
  // X-Trans I (12MP, 2012)
  "X-Pro1": "X-Trans I",
  "X-E1": "X-Trans I",

  // X-Trans II (16MP, 2013-2014)
  "X-T1": "X-Trans II",
  "X-E2": "X-Trans II",
  "X-E2S": "X-Trans II",
  "X-Pro2": "X-Trans II",
  "X100S": "X-Trans II",
  "X100T": "X-Trans II",

  // X-Trans III (24MP, 2016-2018)
  "X-T2": "X-Trans III",
  "X-T20": "X-Trans III",
  "X-H1": "X-Trans III",
  "X-E3": "X-Trans III",
  "X100F": "X-Trans III",

  // X-Trans IV (26MP, 2018-2022)
  "X-T3": "X-Trans IV",
  "X-T30": "X-Trans IV",
  "X-T30 II": "X-Trans IV",
  "X-T4": "X-Trans IV",
  "X-Pro3": "X-Trans IV",
  "X-S10": "X-Trans IV",
  "X-E4": "X-Trans IV",
  "X100V": "X-Trans IV",

  // X-Trans V (40MP, 2022+)
  "X-T5": "X-Trans V",
  "X-H2": "X-Trans V",
  "X-H2S": "X-Trans V",
  "X-S20": "X-Trans V",
  "X100VI": "X-Trans V",

  // Bayer sensor cameras
  "X-A1": "Bayer",
  "X-A2": "Bayer",
  "X-A3": "Bayer",
  "X-A5": "Bayer",
  "X-A7": "Bayer",
  "X-A10": "Bayer",
  "X-A20": "Bayer",
  "X-T100": "Bayer",
  "X-T200": "Bayer",
};

/**
 * Get the sensor generation for a camera model string from EXIF.
 * EXIF camera model is typically "FUJIFILM X-T5" — we strip the manufacturer prefix.
 */
export function getSensorGeneration(
  cameraModel: string | null,
): SensorGeneration | null {
  if (!cameraModel) return null;

  // Strip common manufacturer prefixes
  const model = cameraModel
    .replace(/^FUJIFILM\s*/i, "")
    .replace(/^FUJI\s*/i, "")
    .trim();

  // Direct match
  if (model in CAMERA_SENSOR_MAP) {
    return CAMERA_SENSOR_MAP[model];
  }

  // Fuzzy match: try removing spaces/hyphens for edge cases
  const normalized = model.replace(/[\s-]/g, "").toUpperCase();
  for (const [key, gen] of Object.entries(CAMERA_SENSOR_MAP)) {
    if (key.replace(/[\s-]/g, "").toUpperCase() === normalized) {
      return gen;
    }
  }

  return null;
}

/** All sensor generations in order for filter UI */
export const SENSOR_GENERATIONS: SensorGeneration[] = [
  "X-Trans V",
  "X-Trans IV",
  "X-Trans III",
  "X-Trans II",
  "X-Trans I",
  "Bayer",
];

/**
 * Get all camera model patterns that match a given sensor generation.
 * Returns patterns suitable for Supabase `.ilike()` queries (with FUJIFILM prefix).
 */
export function getCameraModelsForGeneration(
  generation: SensorGeneration,
): string[] {
  return Object.entries(CAMERA_SENSOR_MAP)
    .filter(([, gen]) => gen === generation)
    .map(([model]) => model);
}
