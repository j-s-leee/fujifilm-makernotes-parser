import { RecipeItem } from "@/components/recipe-item";
import { addSign } from "@/lib/utils";

interface RecipeSettingsProps {
  recipe: {
    simulation: string | null;
    dynamic_range_development: number | null;
    grain_roughness: string | null;
    grain_size: string | null;
    color_chrome: string | null;
    color_chrome_fx_blue: string | null;
    wb_type: string | null;
    wb_color_temperature: number | null;
    wb_red: number | null;
    wb_blue: number | null;
    highlight: number | null;
    shadow: number | null;
    color: number | null;
    sharpness: number | null;
    noise_reduction: number | null;
    clarity: number | null;
    bw_adjustment: number | null;
    bw_magenta_green: number | null;
  };
}

export function RecipeSettings({ recipe }: RecipeSettingsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Settings
      </h2>

      {/* Film Simulation separator */}
      {recipe.simulation && (
        <div className="flex items-center justify-between border-b border-dashed border-border pb-4 mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Film Simulation
          </span>
          <span className="font-bold tracking-wide">{recipe.simulation}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4">
        {recipe.dynamic_range_development != null && (
          <RecipeItem
            label="Dynamic Range"
            value={`DR${recipe.dynamic_range_development}`}
          />
        )}
        {recipe.grain_roughness && (
          <RecipeItem
            label="Grain Effect"
            value={`${recipe.grain_roughness}, ${recipe.grain_size ?? ""}`}
          />
        )}
        {recipe.color_chrome && (
          <RecipeItem label="Color Chrome" value={recipe.color_chrome} />
        )}
        {recipe.color_chrome_fx_blue && (
          <RecipeItem
            label="Color Chrome FX"
            value={recipe.color_chrome_fx_blue}
          />
        )}
        {recipe.wb_type && (
          <RecipeItem
            label="White Balance"
            value={
              recipe.wb_color_temperature
                ? `${recipe.wb_color_temperature}K`
                : recipe.wb_type.replace("-", " ")
            }
          />
        )}
        {recipe.wb_type && (
          <RecipeItem
            label="WB Shift"
            value={
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-red-400">
                  R:{addSign(recipe.wb_red ?? 0)}
                </span>
                <span className="font-mono text-xs text-blue-400">
                  B:{addSign(recipe.wb_blue ?? 0)}
                </span>
              </span>
            }
          />
        )}
        {recipe.highlight != null && (
          <RecipeItem label="Highlight Tone" value={recipe.highlight} />
        )}
        {recipe.shadow != null && (
          <RecipeItem label="Shadow Tone" value={recipe.shadow} />
        )}
        {recipe.color != null && (
          <RecipeItem label="Color" value={recipe.color} />
        )}
        {recipe.sharpness != null && (
          <RecipeItem label="Sharpness" value={recipe.sharpness} />
        )}
        {recipe.noise_reduction != null && (
          <RecipeItem label="Noise Reduction" value={recipe.noise_reduction} />
        )}
        {recipe.clarity != null && (
          <RecipeItem label="Clarity" value={recipe.clarity} />
        )}
        {recipe.bw_adjustment != null && (
          <RecipeItem label="BW Adj" value={recipe.bw_adjustment} />
        )}
        {recipe.bw_magenta_green != null && (
          <RecipeItem label="BW M/G" value={recipe.bw_magenta_green} />
        )}
      </div>
    </div>
  );
}
