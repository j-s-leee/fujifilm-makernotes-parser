const SIZES = [480, 960, 1200];

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

  // If src contains _w (variant marker), it's already a variant path — serve directly
  if (/_w\d+\.webp$/.test(src)) return `${r2Base}/${src}`;

  // Select the smallest pre-generated size that covers the requested width
  const baseName = src.replace(/\.[^.]+$/, "");
  const target = SIZES.find((s) => s >= width) ?? SIZES[SIZES.length - 1];
  return `${r2Base}/${baseName}_w${target}.webp`;
}
