/**
 * Returns the thumbnail URL for a recipe image.
 *
 * - `hasVariants` true + `width` ≤ 480 → returns _w480 variant URL
 * - Otherwise → returns the original R2 URL
 */
export function getThumbnailUrl(
  path: string | null,
  width?: number,
  hasVariants?: boolean,
): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2Url) {
    if (hasVariants && width && width <= 480) {
      const baseName = path.replace(/\.[^.]+$/, "");
      return `${r2Url}/${baseName}_w480.webp`;
    }
    return `${r2Url}/${path}`;
  }

  // Fallback: Supabase storage (for existing images or when R2 is not configured)
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${sbUrl}/storage/v1/object/public/thumbnails/${path}`;
}
