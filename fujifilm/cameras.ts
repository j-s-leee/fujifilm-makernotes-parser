export type SensorGeneration =
  | "X-Trans I"
  | "X-Trans II"
  | "X-Trans III"
  | "X-Trans IV"
  | "X-Trans V"
  | "Bayer";

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
 * All known camera models — used only for generateStaticParams().
 * The DB camera_models table is the source of truth at runtime.
 */
export const ALL_CAMERA_MODELS: string[] = [
  "X-Pro1", "X-E1",
  "X-T1", "X-E2", "X-E2S", "X-Pro2", "X100S", "X100T",
  "X-T2", "X-T20", "X-H1", "X-E3", "X100F",
  "X-T3", "X-T30", "X-T30 II", "X-T4", "X-Pro3", "X-S10", "X-E4", "X100V",
  "X-T5", "X-H2", "X-H2S", "X-S20", "X100VI",
  "X-A1", "X-A2", "X-A3", "X-A5", "X-A7", "X-A10", "X-A20",
  "X-T100", "X-T200",
];
