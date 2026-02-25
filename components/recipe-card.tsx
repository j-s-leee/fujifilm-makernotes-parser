import { FujifilmRecipe } from "@/fujifilm/recipe";
import { FujifilmSimulation } from "@/fujifilm/simulation";
import { Copy, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addSign } from "@/lib/utils";
import { RecipeItem } from "@/components/recipe-item";
import { useUser } from "@/hooks/use-user";
import { shareRecipe } from "@/lib/share-recipe";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { useState } from "react";

export function RecipeCard({
  simulation,
  imageSource,
  ...recipe
}: FujifilmRecipe & {
  simulation: FujifilmSimulation | null;
  imageSource?: File | Blob | null;
}) {
  const { toast } = useToast();
  const { user } = useUser();
  const [sharing, setSharing] = useState(false);

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
        title: "Copied",
        description: "Film recipe copied to clipboard",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to copy recipe",
      });
    }
  };

  const handleShare = async () => {
    if (!imageSource) return;
    setSharing(true);
    try {
      const thumbnailBlob = await compressImageToThumbnail(imageSource);
      const result = await shareRecipe(recipe, simulation, thumbnailBlob);
      if (result.success) {
        toast({
          title: "Shared",
          description: "Recipe shared successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error ?? "Failed to share recipe",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to share recipe",
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            {simulation && (
              <h2 className="text-2xl font-bold tracking-tight">
                {simulation}
              </h2>
            )}
            <p className="text-xs uppercase text-muted-foreground mt-1">
              Film Recipe
            </p>
          </div>
          <div className="flex items-center gap-1">
            {user && imageSource && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleShare}
                disabled={sharing}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={copyRecipe}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Film Simulation — prominent separator row */}
        {simulation && (
          <div className="flex items-center justify-between border-b border-dashed border-border pb-4 mb-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Film Simulation
            </span>
            <span className="font-bold tracking-wide">
              {simulation}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          {recipe.dynamicRange && (
            <RecipeItem
              label="Dynamic Range"
              value={`DR${recipe.dynamicRange.development}`}
            />
          )}
          {recipe.grainEffect && (
            <RecipeItem
              label="Grain Effect"
              value={`${recipe.grainEffect.roughness}, ${recipe.grainEffect.size}`}
            />
          )}
          {recipe.colorChromeEffect && (
            <RecipeItem label="Color Chrome" value={recipe.colorChromeEffect} />
          )}
          {recipe.colorChromeFXBlue && (
            <RecipeItem label="Color Chrome FX" value={recipe.colorChromeFXBlue} />
          )}
          {recipe.whiteBalance && (
            <RecipeItem
              label="White Balance"
              value={
                recipe.whiteBalance.colorTemperature &&
                recipe.whiteBalance.type === "K"
                  ? `${recipe.whiteBalance.colorTemperature}K`
                  : recipe.whiteBalance.type.replace("-", " ")
              }
            />
          )}
          {recipe.whiteBalance && (
            <RecipeItem
              label="WB Shift"
              value={
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-red-400">
                    R:{addSign(recipe.whiteBalance.red)}
                  </span>
                  <span className="font-mono text-xs text-blue-400">
                    B:{addSign(recipe.whiteBalance.blue)}
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
