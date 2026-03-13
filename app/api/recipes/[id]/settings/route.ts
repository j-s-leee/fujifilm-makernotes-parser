import { createStaticClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const RECIPE_SETTINGS_SELECT =
  "id, simulation, sensor_generation, dynamic_range_development, grain_roughness, grain_size, color_chrome, color_chrome_fx_blue, wb_type, wb_color_temperature, wb_red, wb_blue, highlight, shadow, color, sharpness, noise_reduction, clarity, bw_adjustment, bw_magenta_green";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("recipes_with_stats")
    .select(RECIPE_SETTINGS_SELECT)
    .eq("id", recipeId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
