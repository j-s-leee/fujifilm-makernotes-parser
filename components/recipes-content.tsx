"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RecipeFilters } from "@/components/recipe-filters";

interface RecipesContentProps {
  params: {
    simulation?: string;
    sort?: string;
    sensor?: string;
    camera?: string;
  };
  sensorGenerations: string[];
  cameraModels: string[];
  simulationOptions: { value: string; label: string }[];
  children: React.ReactNode;
}

export function RecipesContent({
  params,
  sensorGenerations,
  cameraModels,
  simulationOptions,
  children,
}: RecipesContentProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navigate = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <>
      <RecipeFilters
        params={params}
        sensorGenerations={sensorGenerations}
        cameraModels={cameraModels}
        simulationOptions={simulationOptions}
        navigate={navigate}
        isPending={isPending}
      />
      <div
        className={`transition-opacity duration-200 ${
          isPending ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}
