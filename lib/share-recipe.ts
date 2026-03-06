import { createClient } from "@/lib/supabase/client";
import { computeRecipeHash } from "@/lib/recipe-hash";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";

export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnail: { blob: Blob; contentType: string; extension: string },
  cameraModel?: string | null,
  lensModel?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Upload thumbnail via API route (R2)
  const formData = new FormData();
  const file = new File([thumbnail.blob], `upload.${thumbnail.extension}`, {
    type: thumbnail.contentType,
  });
  formData.append("file", file);

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    return { success: false, error: "Failed to upload thumbnail" };
  }

  const { key: fileName, blurDataUrl } = await uploadRes.json();

  // Resolve FK: simulation_id
  let simulationId: number | null = null;
  if (simulation) {
    const { data: sim } = await supabase
      .from("simulations")
      .select("id")
      .eq("slug", simulation)
      .single();
    simulationId = sim?.id ?? null;
  }

  // Resolve FK: camera_model_id
  let cameraModelId: number | null = null;
  if (cameraModel) {
    const normalizedCamera = cameraModel.replace(/^FUJIFILM\s*/i, "").trim();
    const { data: cm } = await supabase
      .from("camera_models")
      .select("id")
      .eq("name", normalizedCamera)
      .single();
    cameraModelId = cm?.id ?? null;
  }

  // Resolve FK: lens_id (upsert — new lenses can appear)
  let lensId: number | null = null;
  if (lensModel) {
    const { data: existing } = await supabase
      .from("lenses")
      .select("id")
      .eq("name", lensModel)
      .single();
    if (existing) {
      lensId = existing.id;
    } else {
      const { data: inserted } = await supabase
        .from("lenses")
        .insert({ name: lensModel })
        .select("id")
        .single();
      lensId = inserted?.id ?? null;
    }
  }

  // Resolve FK: wb_type_id
  let wbTypeId: number | null = null;
  const wbSlug = recipe.whiteBalance?.type ?? null;
  if (wbSlug) {
    const { data: wb } = await supabase
      .from("wb_types")
      .select("id")
      .eq("slug", wbSlug)
      .single();
    wbTypeId = wb?.id ?? null;
  }

  // Insert recipe with FK references and enum values
  const { error: insertError } = await supabase.from("recipes").insert({
    user_id: user.id,
    simulation_id: simulationId,
    camera_model_id: cameraModelId,
    lens_id: lensId,
    wb_type_id: wbTypeId,
    grain_roughness: recipe.grainEffect?.roughness ?? null,
    grain_size: recipe.grainEffect?.size ?? null,
    color_chrome: recipe.colorChromeEffect ?? null,
    color_chrome_fx_blue: recipe.colorChromeFXBlue ?? null,
    wb_color_temperature: recipe.whiteBalance?.colorTemperature ?? null,
    wb_red: recipe.whiteBalance?.red ?? null,
    wb_blue: recipe.whiteBalance?.blue ?? null,
    dynamic_range_setting: recipe.dynamicRange?.setting ?? null,
    dynamic_range_development: recipe.dynamicRange?.development ?? null,
    highlight: recipe.highlight ?? null,
    shadow: recipe.shadow ?? null,
    color: recipe.color ?? null,
    sharpness: recipe.sharpness ?? null,
    noise_reduction: recipe.highISONoiseReduction ?? null,
    clarity: recipe.clarity ?? null,
    bw_adjustment: recipe.bwAdjustment ?? null,
    bw_magenta_green: recipe.bwMagentaGreen ?? null,
    thumbnail_path: fileName,
    blur_data_url: blurDataUrl ?? null,
    recipe_hash: computeRecipeHash({
      simulation: simulation ?? null,
      grain_roughness: recipe.grainEffect?.roughness ?? null,
      grain_size: recipe.grainEffect?.size ?? null,
      highlight: recipe.highlight ?? null,
      shadow: recipe.shadow ?? null,
      color: recipe.color ?? null,
      sharpness: recipe.sharpness ?? null,
      dynamic_range_development: recipe.dynamicRange?.development ?? null,
    }),
  });

  if (insertError) {
    return { success: false, error: "Failed to save recipe" };
  }

  return { success: true };
}
