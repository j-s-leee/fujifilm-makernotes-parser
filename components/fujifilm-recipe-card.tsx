import { FujifilmRecipe } from "@/fujifilm/recipe";
import { Copy, Film } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addSign } from "@/lib/utils";

export function FujifilmRecipeCard({
  simulation,
  ...recipe
}: FujifilmRecipe & { simulation: string | null }) {
  const { toast } = useToast();

  const getRecipeText = () => {
    const recipeItems = [
      simulation && `Film Simulation: ${simulation}`,
      recipe.grainEffect &&
        `Grain: ${recipe.grainEffect.roughness} ${recipe.grainEffect.size}`,
      recipe.colorChromeEffect && `Color Chrome: ${recipe.colorChromeEffect}`,
      recipe.colorChromeFXBlue &&
        `Color Chrome FX Blue: ${recipe.colorChromeFXBlue}`,
      recipe.whiteBalance &&
        `White Balance: ${
          recipe.whiteBalance.type === "K"
            ? `${recipe.whiteBalance.colorTemperature}K`
            : recipe.whiteBalance.type.replace("-", " ")
        } (R:${addSign(recipe.whiteBalance.red)}, B:${addSign(
          recipe.whiteBalance.blue
        )})`,
      recipe.dynamicRange &&
        `Dynamic Range: ${recipe.dynamicRange.development}`,
      recipe.highlight != null && `Highlight: ${recipe.highlight}`,
      recipe.shadow != null && `Shadow: ${recipe.shadow}`,
      recipe.color != null && `Color: ${recipe.color}`,
      recipe.sharpness != null && `Sharpness: ${recipe.sharpness}`,
      recipe.highISONoiseReduction != null &&
        `Noise Reduction: ${recipe.highISONoiseReduction}`,
      recipe.clarity != null && `Clarity: ${recipe.clarity}`,
      recipe.bwAdjustment != null && `BW Adjustment: ${recipe.bwAdjustment}`,
      recipe.bwMagentaGreen != null &&
        `BW Magenta Green: ${recipe.bwMagentaGreen}`,
    ].filter(Boolean);

    return recipeItems.join("\n");
  };

  const copyRecipe = async () => {
    try {
      await navigator.clipboard.writeText(getRecipeText());
      toast({
        title: "Film Recipe Copied",
        description: "Film Recipe Copied",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Copying Film Recipe Failed",
      });
    }
  };

  return (
    <Card className="font-space-grotesk">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-[22px] font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Film className="h-5 w-5" />
            Film Recipe
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={copyRecipe}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {/* <div className="flex flex-wrap gap-2"> */}
          {simulation && (
            <RecipeItem label="Film Simulation" value={simulation} />
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
              label={`R: ${addSign(recipe.whiteBalance.red)} B: ${addSign(
                recipe.whiteBalance.blue
              )}`}
              value={`${
                recipe.whiteBalance.colorTemperature &&
                recipe.whiteBalance.type === "K"
                  ? `${recipe.whiteBalance.colorTemperature} K`
                  : recipe.whiteBalance.type.replace("-", " ")
              }`}
            />
          )}
          {recipe.dynamicRange && (
            <RecipeItem
              label="DR"
              value={`${recipe.dynamicRange.development}`}
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
            <RecipeItem
              label="BW Magenta Green"
              value={recipe.bwMagentaGreen}
            />
          )}
        </div>
      </CardContent>
    </Card>
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
    <div
      className={`flex flex-col gap-1 border-t border-solid border-muted py-4 pr-2`}
    >
      <p className="text-muted-foreground text-xs font-normal leading-normal uppercase">
        {label}
      </p>
      <p className="text-foreground text-sm font-semibold leading-normal uppercase">
        {addSign(value)}
      </p>
    </div>
  );
}
