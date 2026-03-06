import { createHash } from "crypto";

interface RecipeHashInput {
  simulation: string | null;
  grain_roughness: string | null;
  grain_size: string | null;
  highlight: number | null;
  shadow: number | null;
  color: number | null;
  sharpness: number | null;
  dynamic_range_development: number | null;
}

export function computeRecipeHash(input: RecipeHashInput): string {
  const parts = [
    input.simulation,
    input.grain_roughness,
    input.grain_size,
    input.highlight,
    input.shadow,
    input.color,
    input.sharpness,
    input.dynamic_range_development,
  ];
  const payload = parts.map((v) => (v == null ? "" : String(v))).join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
