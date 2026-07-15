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
  "X half",
  "X100VI",
  "X-E5",
  "X-M5",
  "X-T50",
  "X-S20",
  "X-T5",
  "X-T30 III",
  "X-T30 II",
  "X-T30",
  "X-E4",
  "X100V",
  "X-S10",
  "X-T4",
  "X100F",
  "X-T200",
  "X-A7",
  "XF10",
  "X-T3",
  "X-E3",
  "X-T100",
  "X70",
  "X100T",
  "X-T20",
  "X-Pro3",
  "X-A5",
  "XQ2",
  "X100S",
  "X-Pro2",
  "X-T2",
  "X-A3",
  "X30",
  "X-E2S",
  "X-E2",
  "X-A20",
  "X-A2",
  "X100",
  "X-T1",
  "XQ1",
  "XF1",
  "X20",
  "X-E1",
  "X-M1",
  "X-A10",
  "X-A1",
  "X-T10",
  "X-Pro1",
  "X10",
];
