"use server";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { routing } from "@/i18n/routing";

/**
 * next-intl uses localePrefix "as-needed": defaultLocale has no prefix,
 * other locales are prefixed (e.g. /ko/...). revalidatePath only busts
 * the exact path it's given, so each locale variant needs its own call.
 */
function revalidateLocalizedPath(path: string) {
  for (const locale of routing.locales) {
    const localized = locale === routing.defaultLocale ? path : `/${locale}${path}`;
    revalidatePath(localized, "page");
  }
}

function revalidateCategories(params: {
  simulationSlug: string | null;
  cameraModel: string | null;
  lensModel: string | null;
}) {
  if (params.simulationSlug) {
    revalidateLocalizedPath(`/recipes/simulation/${params.simulationSlug}`);
  }
  if (params.cameraModel) {
    revalidateLocalizedPath(`/recipes/camera/${toSlug(params.cameraModel)}`);
  }
  if (params.lensModel) {
    revalidateLocalizedPath(`/recipes/lens/${toSlug(params.lensModel)}`);
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
  revalidateLocalizedPath("/");
  revalidateLocalizedPath(`/u/${params.userIdentifier ?? params.userId}`);
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
    revalidateLocalizedPath(`/recipes/${params.recipeSlug}-${params.recipeId}`);
  }
  revalidateLocalizedPath(`/recipes/${params.recipeId}`);
  revalidateLocalizedPath("/");
  revalidateLocalizedPath(`/u/${params.userIdentifier ?? params.userId}`);
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
  revalidateLocalizedPath(`/u/${params.userId}`);
  if (params.username) {
    revalidateLocalizedPath(`/u/${params.username}`);
  }
  if (params.oldUsername) {
    revalidateLocalizedPath(`/u/${params.oldUsername}`);
  }
  revalidateLocalizedPath("/");
}
