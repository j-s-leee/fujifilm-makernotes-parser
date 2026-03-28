import { createClient } from "@/lib/supabase/client";
import { computeRecipeHash } from "@/lib/recipe-hash";
import { generateRecipeSlug } from "@/lib/slug";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";

export async function shareRecipe(
  recipe: FujifilmRecipe,
  simulation: FujifilmSimulation | null,
  thumbnail: { blob: Blob; contentType: string; extension: string },
  cameraModel?: string | null,
  lensModel?: string | null,
  extraThumbnails?: { blob: Blob; contentType: string; extension: string }[],
): Promise<{ success: true; recipeId: number } | { success: false; error: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  async function uploadFile(
    file: { blob: Blob; contentType: string; extension: string },
    batch = false,
  ): Promise<{ key: string; blurDataUrl: string; width: number | null; height: number | null; embedding: number[] | null; colorHistogram: number[] | null }> {
    const formData = new FormData();
    const f = new File([file.blob], `upload.${file.extension}`, {
      type: file.contentType,
    });
    formData.append("file", f);

    const url = batch ? "/api/upload?batch=1" : "/api/upload";
    const uploadRes = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file");
    }

    return uploadRes.json();
  }

  // Upload all photos in parallel (primary + extras)
  let primaryUpload: Awaited<ReturnType<typeof uploadFile>>;
  let extraUploads: Awaited<ReturnType<typeof uploadFile>>[] = [];

  try {
    const uploads = await Promise.all([
      uploadFile(thumbnail),
      ...(extraThumbnails ?? []).map((t) => uploadFile(t, true)),
    ]);
    primaryUpload = uploads[0];
    extraUploads = uploads.slice(1);
  } catch {
    return { success: false, error: "Failed to upload photos" };
  }

  const { key: fileName, blurDataUrl, width, height, embedding, colorHistogram } = primaryUpload;

  // Resolve all FK lookups in parallel
  const wbSlug = recipe.whiteBalance?.type ?? null;
  const normalizedCamera = cameraModel
    ? cameraModel.replace(/^FUJIFILM\s*/i, "").trim()
    : null;

  const [simResult, camResult, lensResult, wbResult] = await Promise.all([
    simulation
      ? supabase.from("simulations").select("id").eq("slug", simulation).single()
      : Promise.resolve({ data: null }),
    normalizedCamera
      ? supabase.from("camera_models").select("id").eq("name", normalizedCamera).single()
      : Promise.resolve({ data: null }),
    lensModel
      ? supabase.rpc("resolve_lens_id", { lens_name: lensModel })
      : Promise.resolve({ data: null }),
    wbSlug
      ? supabase.from("wb_types").select("id").eq("slug", wbSlug).single()
      : Promise.resolve({ data: null }),
  ]);

  const simulationId = simResult.data?.id ?? null;
  const cameraModelId = camResult.data?.id ?? null;
  const lensId = lensResult.data ?? null;
  const wbTypeId = wbResult.data?.id ?? null;

  // Generate SEO-friendly slug from recipe metadata
  const slug = generateRecipeSlug(simulation ?? null, normalizedCamera, lensModel ?? null);

  // Insert recipe with FK references and enum values
  const { data: inserted, error: insertError } = await supabase.from("recipes").insert({
    user_id: user.id,
    slug,
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
    thumbnail_width: width ?? null,
    thumbnail_height: height ?? null,
    image_embedding: embedding ?? null,
    color_histogram: colorHistogram ?? null,
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
  }).select("id").single();

  if (insertError || !inserted) {
    return { success: false, error: "Failed to save recipe" };
  }

  // Insert additional photos into recipe_photos
  if (extraUploads.length > 0) {
    const photoRows = extraUploads.map((upload, index) => ({
      recipe_id: inserted.id,
      storage_path: upload.key,
      blur_data_url: upload.blurDataUrl ?? null,
      width: upload.width ?? null,
      height: upload.height ?? null,
      position: index + 1,
      image_embedding: upload.embedding ?? null,
      color_histogram: upload.colorHistogram ?? null,
    }));

    const { error: photosError } = await supabase
      .from("recipe_photos")
      .insert(photoRows);

    if (photosError) {
      // Clean up: delete the recipe if photo insert fails (transaction safety)
      await supabase.from("recipes").delete().eq("id", inserted.id);
      return { success: false, error: "Failed to save additional photos" };
    }
  }

  return { success: true, recipeId: inserted.id };
}
