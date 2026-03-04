export function getThumbnailUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2Url) return `${r2Url}/${path}`;

  // Fallback: Supabase storage (for existing images or when R2 is not configured)
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${sbUrl}/storage/v1/object/public/thumbnails/${path}`;
}
