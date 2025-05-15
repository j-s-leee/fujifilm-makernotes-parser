import { FujifilmRecipe } from "@/fujifilm/recipe";
import { Film } from "lucide-react";

export function FujifilmRecipeCard({
  simulation,
  ...recipe
}: FujifilmRecipe & { simulation: string | null }) {
  return (
    <div className="space-y-2">
      {/* {recipe.model && <h4>{recipe.model}</h4>} */}

      <div className="grid grid-cols-2 gap-2">
        {/* <div className="flex flex-wrap gap-2"> */}
        {simulation && (
          <RecipeItem label={<Film className="h-4 w-4" />} value={simulation} />
        )}
        {recipe.grainEffect && (
          <RecipeItem
            label="Grain"
            value={`${recipe.grainEffect.roughness} ${recipe.grainEffect.size}`}
          />
        )}
        {recipe.colorChromeEffect && (
          <RecipeItem label="Color Chrome" value={recipe.colorChromeEffect} />
        )}
        {recipe.colorChromeFXBlue && (
          <RecipeItem label="FX Blue" value={recipe.colorChromeFXBlue} />
        )}
        {recipe.whiteBalance && (
          <RecipeItem
            label={`R: ${recipe.whiteBalance.red} B: ${recipe.whiteBalance.blue}`}
            value={`${
              recipe.whiteBalance.colorTemperature &&
              recipe.whiteBalance.type === "K"
                ? `${recipe.whiteBalance.colorTemperature} K`
                : recipe.whiteBalance.type.replace("-", " ")
            }`}
          />
        )}
        {recipe.dynamicRange && (
          <RecipeItem label="DR" value={`${recipe.dynamicRange.development}`} />
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {recipe.highlight != null && (
          <RecipeItem label="Highlight" value={recipe.highlight} />
        )}
        {recipe.shadow != null && (
          <RecipeItem label="Shadow" value={recipe.shadow} />
        )}
        {recipe.color != null && (
          <RecipeItem label="Color" value={recipe.color} />
        )}
        {recipe.sharpness != null && (
          <RecipeItem label="Sharpness" value={recipe.sharpness} />
        )}
        {recipe.highISONoiseReduction != null && (
          <RecipeItem
            label="Noise Reduction"
            value={recipe.highISONoiseReduction}
          />
        )}
        {recipe.clarity != null && (
          <RecipeItem label="Clarity" value={recipe.clarity} />
        )}
        {recipe.bwAdjustment != null && (
          <RecipeItem label="BW Adjustment" value={recipe.bwAdjustment} />
        )}
        {recipe.bwMagentaGreen != null && (
          <RecipeItem label="BW Magenta Green" value={recipe.bwMagentaGreen} />
        )}
      </div>
    </div>
  );
}

function RecipeItem({
  label,
  value,
}: {
  label: string | React.ReactNode;
  value: string | number;
}) {
  return (
    <div className="bg-muted/50 rounded-md p-2 text-center">
      <div className="font-medium uppercase text-sm">
        {typeof value === "number" ? (value > 0 ? "+" + value : value) : value}
      </div>
      <div className="text-xs text-muted-foreground uppercase flex justify-center">
        {label}
      </div>
    </div>
  );
}
