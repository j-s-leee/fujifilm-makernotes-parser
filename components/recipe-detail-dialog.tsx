"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeItem } from "@/components/recipe-item";
import { addSign } from "@/lib/utils";

interface RecipeDetailDialogProps {
  recipe: {
    simulation: string | null;
    grain_roughness: string | null;
    grain_size: string | null;
    color_chrome: string | null;
    color_chrome_fx_blue: string | null;
    wb_type: string | null;
    wb_color_temperature: number | null;
    wb_red: number | null;
    wb_blue: number | null;
    dynamic_range_development: number | null;
    highlight: number | null;
    shadow: number | null;
    color: number | null;
    sharpness: number | null;
    noise_reduction: number | null;
    clarity: number | null;
    bw_adjustment: number | null;
    bw_magenta_green: number | null;
    thumbnail_path: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumbnailUrl: string | null;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  thumbnailUrl,
}: RecipeDetailDialogProps) {
  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {recipe.simulation ?? "Unknown Simulation"}
          </DialogTitle>
          <p className="text-xs uppercase text-muted-foreground">Film Recipe</p>
        </DialogHeader>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="Recipe photo"
            className="w-full rounded-lg object-cover"
          />
        )}
        <div className="grid grid-cols-2 gap-x-4">
          {recipe.grain_roughness && (
            <RecipeItem label="Grain" value={`${recipe.grain_roughness} ${recipe.grain_size ?? ""}`} />
          )}
          {recipe.color_chrome && (
            <RecipeItem label="Color Chrome" value={recipe.color_chrome} />
          )}
          {recipe.color_chrome_fx_blue && (
            <RecipeItem label="FX Blue" value={recipe.color_chrome_fx_blue} />
          )}
          {recipe.wb_type && (
            <RecipeItem
              label={`R: ${addSign(recipe.wb_red ?? 0)} B: ${addSign(recipe.wb_blue ?? 0)}`}
              value={recipe.wb_color_temperature ? `${recipe.wb_color_temperature} K` : recipe.wb_type.replace("-", " ")}
            />
          )}
          {recipe.dynamic_range_development != null && (
            <RecipeItem label="DR" value={recipe.dynamic_range_development} />
          )}
          {recipe.highlight != null && <RecipeItem label="Highlight" value={recipe.highlight} />}
          {recipe.shadow != null && <RecipeItem label="Shadow" value={recipe.shadow} />}
          {recipe.color != null && <RecipeItem label="Color" value={recipe.color} />}
          {recipe.sharpness != null && <RecipeItem label="Sharpness" value={recipe.sharpness} />}
          {recipe.noise_reduction != null && <RecipeItem label="Noise Reduction" value={recipe.noise_reduction} />}
          {recipe.clarity != null && <RecipeItem label="Clarity" value={recipe.clarity} />}
          {recipe.bw_adjustment != null && <RecipeItem label="BW Adj" value={recipe.bw_adjustment} />}
          {recipe.bw_magenta_green != null && <RecipeItem label="BW M/G" value={recipe.bw_magenta_green} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
