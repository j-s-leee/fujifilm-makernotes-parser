import { FujifilmRecipe } from "@/fujifilm/recipe";

export function FujifilmRecipeCard({
  simulation,
  ...recipe
}: FujifilmRecipe & { simulation: string | null }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Fujifilm Recipe</h3>

      {/* {recipe.model && <h4>{recipe.model}</h4>} */}

      <div className="grid grid-cols-2 gap-3">
        {simulation && (
          <RecipeItem label="Film Simulation" value={simulation} />
        )}
        {recipe.grainEffect && (
          <RecipeItem
            label="Grain Effect"
            value={`${recipe.grainEffect.roughness} ${recipe.grainEffect.size}`}
          />
        )}
        {recipe.colorChromeEffect && (
          <RecipeItem
            label="Color Chrome Effect"
            value={recipe.colorChromeEffect}
          />
        )}
        {recipe.colorChromeFXBlue && (
          <RecipeItem
            label="Color Chrome Blue"
            value={recipe.colorChromeFXBlue}
          />
        )}
        {recipe.whiteBalance && (
          <RecipeItem
            label="White Balance"
            value={`${recipe.whiteBalance.type} ${recipe.whiteBalance.colorTemperature} R: ${recipe.whiteBalance.red} B: ${recipe.whiteBalance.blue}`}
          />
        )}
        {recipe.dynamicRange && (
          <RecipeItem
            label="Dynamic Range"
            value={`${recipe.dynamicRange.range} ${recipe.dynamicRange.setting} ${recipe.dynamicRange.development}`}
          />
        )}
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
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-muted/50 rounded-md p-2 text-center">
      <div className="font-medium">{value}</div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
