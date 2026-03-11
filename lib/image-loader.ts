export default function r2Loader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Already a full URL (legacy images or external) — return as-is
  if (src.startsWith("http")) return src;

  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!r2Base) return src;

  // If src already contains a variant marker — serve directly
  if (/_w\d+\.webp$/.test(src)) return `${r2Base}/${src}`;

  // ≤480 → use _w480 thumbnail, >480 → use original
  if (width <= 480) {
    const baseName = src.replace(/\.[^.]+$/, "");
    return `${r2Base}/${baseName}_w480.webp`;
  }
  return `${r2Base}/${src}`;
}
