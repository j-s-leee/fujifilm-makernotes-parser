"use client";

import {
  Film,
  SunMoon,
  Grip,
  Droplets,
  Sun,
  Contrast,
  Palette,
  Diamond,
  Waves,
  Sparkle,
  Copy,
  Check,
} from "lucide-react";
import { addSign } from "@/lib/utils";
import { useState, type ReactNode } from "react";

interface RecipeSettingsProps {
  recipe: {
    id: number;
    simulation: string | null;
    sensor_generation: string | null;
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

function SettingRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

export function RecipeSettings({ recipe }: RecipeSettingsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const lines: string[] = [];
    if (recipe.simulation) lines.push(`Film Simulation: ${recipe.simulation}`);
    if (recipe.dynamic_range_development != null)
      lines.push(`Dynamic Range: DR${recipe.dynamic_range_development}`);
    if (recipe.grain_roughness)
      lines.push(
        `Grain Effect: ${recipe.grain_roughness}${recipe.grain_size ? `, ${recipe.grain_size}` : ""}`,
      );
    if (recipe.color_chrome)
      lines.push(`Color Chrome: ${recipe.color_chrome}`);
    if (recipe.color_chrome_fx_blue)
      lines.push(`Color Chrome FX Blue: ${recipe.color_chrome_fx_blue}`);
    if (recipe.wb_type) {
      const wb = recipe.wb_color_temperature
        ? `${recipe.wb_color_temperature}K`
        : recipe.wb_type.replace("-", " ");
      lines.push(`White Balance: ${wb}`);
      lines.push(
        `WB Shift: R:${addSign(recipe.wb_red ?? 0)} B:${addSign(recipe.wb_blue ?? 0)}`,
      );
    }
    if (recipe.highlight != null)
      lines.push(`Highlight: ${addSign(recipe.highlight)}`);
    if (recipe.shadow != null)
      lines.push(`Shadow: ${addSign(recipe.shadow)}`);
    if (recipe.color != null)
      lines.push(`Color: ${addSign(recipe.color)}`);
    if (recipe.sharpness != null)
      lines.push(`Sharpness: ${addSign(recipe.sharpness)}`);
    if (recipe.noise_reduction != null)
      lines.push(`Noise Reduction: ${addSign(recipe.noise_reduction)}`);
    if (recipe.clarity != null)
      lines.push(`Clarity: ${addSign(recipe.clarity)}`);

    const url = `${window.location.origin}/recipes/${recipe.id}`;
    const text = lines.join("\n") + `\n\n${url}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const iconSize = "h-4 w-4";

  return (
    <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Recipe Settings</h2>
        {recipe.sensor_generation && (
          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            {recipe.sensor_generation}
          </span>
        )}
      </div>

      {/* Settings list */}
      <div className="space-y-3">
        {recipe.simulation && (
          <SettingRow
            icon={<Film className={iconSize} />}
            label="Film Simulation"
            value={recipe.simulation}
          />
        )}
        {recipe.dynamic_range_development != null && (
          <SettingRow
            icon={<SunMoon className={iconSize} />}
            label="Dynamic Range"
            value={`DR${recipe.dynamic_range_development}`}
          />
        )}
        {recipe.grain_roughness && (
          <SettingRow
            icon={<Grip className={iconSize} />}
            label="Grain Effect"
            value={`${recipe.grain_roughness}${recipe.grain_size ? `, ${recipe.grain_size}` : ""}`}
          />
        )}
        {recipe.color_chrome && (
          <SettingRow
            icon={<Droplets className={iconSize} />}
            label="Color Chrome"
            value={recipe.color_chrome}
          />
        )}
        {recipe.color_chrome_fx_blue && (
          <SettingRow
            icon={<Droplets className={iconSize} />}
            label="Color Chrome FX Blue"
            value={recipe.color_chrome_fx_blue}
          />
        )}
        {recipe.wb_type && (
          <SettingRow
            icon={<Sun className={iconSize} />}
            label="White Balance"
            value={
              <div className="flex flex-col items-end gap-0.5">
                <span>
                  {recipe.wb_color_temperature
                    ? `${recipe.wb_color_temperature}K`
                    : recipe.wb_type.replace("-", " ")}
                </span>
                <span className="flex items-center gap-2 font-normal">
                  <span className="font-mono text-xs text-red-400">
                    R:{addSign(recipe.wb_red ?? 0)}
                  </span>
                  <span className="font-mono text-xs text-blue-400">
                    B:{addSign(recipe.wb_blue ?? 0)}
                  </span>
                </span>
              </div>
            }
          />
        )}
        {(recipe.highlight != null || recipe.shadow != null) && (
          <SettingRow
            icon={<Contrast className={iconSize} />}
            label="Tone Curve"
            value={
              <span>
                H:{addSign(recipe.highlight ?? 0)}, S:{addSign(recipe.shadow ?? 0)}
              </span>
            }
          />
        )}
        {recipe.color != null && (
          <SettingRow
            icon={<Palette className={iconSize} />}
            label="Color"
            value={addSign(recipe.color)}
          />
        )}
        {recipe.sharpness != null && (
          <SettingRow
            icon={<Diamond className={iconSize} />}
            label="Sharpness"
            value={addSign(recipe.sharpness)}
          />
        )}
        {recipe.noise_reduction != null && (
          <SettingRow
            icon={<Waves className={iconSize} />}
            label="Noise Reduction"
            value={addSign(recipe.noise_reduction)}
          />
        )}
        {recipe.clarity != null && (
          <SettingRow
            icon={<Sparkle className={iconSize} />}
            label="Clarity"
            value={addSign(recipe.clarity)}
          />
        )}
        {recipe.bw_adjustment != null && (
          <SettingRow
            icon={<Contrast className={iconSize} />}
            label="BW Adjustment"
            value={addSign(recipe.bw_adjustment)}
          />
        )}
        {recipe.bw_magenta_green != null && (
          <SettingRow
            icon={<Contrast className={iconSize} />}
            label="BW M/G"
            value={addSign(recipe.bw_magenta_green)}
          />
        )}
      </div>

      {/* Action button */}
      <div className="mt-6">
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Recipe
            </>
          )}
        </button>
      </div>
    </div>
  );
}
