"use server";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { routing } from "@/i18n/routing";

/**
 * next-intl uses localePrefix "as-needed": the default locale (en) is requested
 * without a prefix (e.g. /u/x), but next-intl's middleware *rewrites* that
 * internally to /en/u/x to satisfy the [locale] route segment. Per Next.js's
 * revalidatePath docs, a rewritten route must be revalidated by its
 * destination path, not the source path the browser sees — so every locale,
 * including the default, needs its prefixed path revalidated. The unprefixed
 * path is also revalidated as a harmless fallback.
 */
function revalidateLocalizedPath(path: string) {
  revalidatePath(path, "page");
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${path}`, "page");
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
