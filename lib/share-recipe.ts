import { createClient } from "@/lib/supabase/client";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";

export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnailBlob: Blob
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Upload thumbnail
  const fileName = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("thumbnails")
    .upload(fileName, thumbnailBlob, {
      contentType: "image/jpeg",
    });

  if (uploadError) {
    return { success: false, error: "Failed to upload thumbnail" };
  }

  // Insert recipe
  const { error: insertError } = await supabase.from("recipes").insert({
    user_id: user.id,
    simulation: simulation ?? null,
    grain_roughness: recipe.grainEffect?.roughness ?? null,
    grain_size: recipe.grainEffect?.size ?? null,
    color_chrome: recipe.colorChromeEffect ?? null,
    color_chrome_fx_blue: recipe.colorChromeFXBlue ?? null,
    wb_type: recipe.whiteBalance?.type ?? null,
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
  });

  if (insertError) {
    return { success: false, error: "Failed to save recipe" };
  }

  return { success: true };
}
