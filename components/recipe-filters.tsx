"use client";

import { useState } from "react";
import { ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";

interface RecipeFiltersProps {
  params: {
    simulation?: string;
    sort?: string;
    sensor?: string;
    camera?: string;
  };
  sensorGenerations: string[];
  cameraModels: string[];
  simulationOptions: { value: string; label: string }[];
  navigate: (url: string) => void;
  isPending: boolean;
}

function buildUrl(
  params: RecipeFiltersProps["params"],
  overrides: Record<string, string | undefined>,
) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (merged.simulation) search.set("simulation", merged.simulation);
  if (merged.sensor) search.set("sensor", merged.sensor);
  if (merged.camera) search.set("camera", merged.camera);
  if (merged.sort) search.set("sort", merged.sort);
  const qs = search.toString();
  return `/recipes${qs ? `?${qs}` : ""}`;
}

export function RecipeFilters({
  params,
  sensorGenerations,
  cameraModels,
  simulationOptions,
  navigate,
  isPending,
}: RecipeFiltersProps) {
  const [open, setOpen] = useState(true);

  const activeFilters: { label: string; clearUrl: string }[] = [];
  if (params.sensor) {
    activeFilters.push({
      label: params.sensor,
      clearUrl: buildUrl(params, { sensor: undefined }),
    });
  }
  if (params.camera) {
    activeFilters.push({
      label: params.camera,
      clearUrl: buildUrl(params, { camera: undefined }),
    });
  }
  if (params.simulation) {
    const opt = simulationOptions.find((o) => o.value === params.simulation);
    activeFilters.push({
      label: opt?.label ?? params.simulation,
      clearUrl: buildUrl(params, { simulation: undefined }),
    });
  }

  const pillBase =
    "shrink-0 rounded-md border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer";
  const pillActive = "bg-foreground text-background";
  const pillInactive =
    "border-border text-muted-foreground hover:text-foreground";

  return (
    <div className="flex flex-col gap-3">
      {/* Filter button + active chips + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            open || activeFilters.length > 0
              ? "bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <SlidersHorizontal className="h-3 w-3" />
          )}
          Filter
          {activeFilters.length > 0 && (
            <span className="ml-0.5 rounded-full bg-background text-foreground px-1.5 text-[10px] leading-4">
              {activeFilters.length}
            </span>
          )}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Active filter chips */}
        {activeFilters.map((f) => (
          <button
            key={f.label}
            onClick={() => navigate(f.clearUrl)}
            className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            {f.label}
            <X className="h-3 w-3" />
          </button>
        ))}

        {/* Sort — pushed to right */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate(buildUrl(params, { sort: undefined }))}
            className={`text-xs font-medium ${
              params.sort !== "popular"
                ? "text-foreground underline"
                : "text-muted-foreground"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => navigate(buildUrl(params, { sort: "popular" }))}
            className={`text-xs font-medium ${
              params.sort === "popular"
                ? "text-foreground underline"
                : "text-muted-foreground"
            }`}
          >
            Popular
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {open && (
        <div className="flex flex-col gap-4 rounded-md border border-border p-3">
          {/* Sensor */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Sensor
            </span>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
              <button
                onClick={() => navigate(buildUrl(params, { sensor: undefined }))}
                className={`${pillBase} ${!params.sensor ? pillActive : pillInactive}`}
              >
                All
              </button>
              {sensorGenerations.map((gen) => (
                <button
                  key={gen}
                  onClick={() => navigate(buildUrl(params, { sensor: params.sensor === gen ? undefined : gen }))}
                  className={`${pillBase} ${params.sensor === gen ? pillActive : pillInactive}`}
                >
                  {gen}
                </button>
              ))}
            </div>
          </div>

          {/* Camera */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Camera
            </span>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
              <button
                onClick={() => navigate(buildUrl(params, { camera: undefined }))}
                className={`${pillBase} ${!params.camera ? pillActive : pillInactive}`}
              >
                All
              </button>
              {cameraModels.map((model) => (
                <button
                  key={model}
                  onClick={() => navigate(buildUrl(params, { camera: params.camera === model ? undefined : model }))}
                  className={`${pillBase} ${params.camera === model ? pillActive : pillInactive}`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Film
            </span>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
              <button
                onClick={() => navigate(buildUrl(params, { simulation: undefined }))}
                className={`${pillBase} ${!params.simulation ? pillActive : pillInactive}`}
              >
                All
              </button>
              {simulationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => navigate(buildUrl(params, { simulation: params.simulation === opt.value ? undefined : opt.value }))}
                  className={`${pillBase} ${params.simulation === opt.value ? pillActive : pillInactive}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
