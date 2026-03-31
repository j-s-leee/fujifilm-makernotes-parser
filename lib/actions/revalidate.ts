"use server";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";

function revalidateCategories(params: {
  simulationSlug: string | null;
  cameraModel: string | null;
  lensModel: string | null;
}) {
  if (params.simulationSlug) {
    revalidatePath(`/recipes/simulation/${params.simulationSlug}`, "page");
  }
  if (params.cameraModel) {
    revalidatePath(`/recipes/camera/${toSlug(params.cameraModel)}`, "page");
  }
  if (params.lensModel) {
    revalidatePath(`/recipes/lens/${toSlug(params.lensModel)}`, "page");
  }
}

/**
 * Revalidate pages affected by a new recipe being created.
 * Called client-side after shareRecipe() succeeds.
 */
export async function revalidateOnRecipeCreated(params: {
  userId: string;
  userIdentifier: string | null;
  simulationSlug: string | null;
  cameraModel: string | null;
  lensModel: string | null;
}) {
  revalidatePath("/", "page");
  revalidatePath(`/u/${params.userIdentifier ?? params.userId}`, "page");
  revalidateCategories(params);
}

/**
 * Revalidate pages affected by a recipe being deleted or restored.
 * Called from API routes after soft-delete/restore.
 */
export async function revalidateOnRecipeChanged(params: {
  recipeSlug: string | null;
  recipeId: number;
  userId: string;
  userIdentifier: string | null;
  simulationSlug: string | null;
  cameraModel: string | null;
  lensModel: string | null;
}) {
  if (params.recipeSlug) {
    revalidatePath(`/recipes/${params.recipeSlug}-${params.recipeId}`, "page");
  }
  revalidatePath(`/recipes/${params.recipeId}`, "page");
  revalidatePath("/", "page");
  revalidatePath(`/u/${params.userIdentifier ?? params.userId}`, "page");
  revalidateCategories(params);
}

/**
 * Revalidate pages affected by a profile update.
 * Called from the profile API route after update.
 */
export async function revalidateOnProfileUpdated(params: {
  userId: string;
  username: string | null;
  oldUsername?: string | null;
}) {
  revalidatePath(`/u/${params.userId}`, "page");
  if (params.username) {
    revalidatePath(`/u/${params.username}`, "page");
  }
  if (params.oldUsername) {
    revalidatePath(`/u/${params.oldUsername}`, "page");
  }
  revalidatePath("/", "page");
}
