const DEFAULT_MAX_SIDE = 600;
const WEBP_QUALITY = 0.8;
const JPEG_FALLBACK_QUALITY = 0.8;

/**
 * Compress an image for thumbnail upload.
 *
 * Uses createImageBitmap for high-quality (Lanczos) downscaling,
 * then outputs WebP (with JPEG fallback for older browsers).
 *
 * Returns { blob, contentType, extension }.
 */
export async function compressImageToThumbnail(
  source: File | Blob,
  maxSide: number = DEFAULT_MAX_SIDE,
): Promise<{ blob: Blob; contentType: string; extension: string }> {
  // Decode and get original dimensions
  const bitmap = await createImageBitmap(source);
  const { width: origW, height: origH } = bitmap;

  // Calculate target dimensions (limit longer side)
  const longerSide = Math.max(origW, origH);
  const scale = Math.min(1, maxSide / longerSide);
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  // High-quality resize via createImageBitmap (uses Lanczos internally)
  const resized =
    scale < 1
      ? await createImageBitmap(source, {
          resizeWidth: targetW,
          resizeHeight: targetH,
          resizeQuality: "high",
        })
      : bitmap;

  // Draw to canvas
  const canvas = document.createElement("canvas");
  canvas.width = resized.width;
  canvas.height = resized.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(resized, 0, 0);
  resized.close();
  if (scale < 1) bitmap.close();

  // Try WebP first (much better quality/size ratio than JPEG)
  const webpBlob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webpBlob && webpBlob.type === "image/webp") {
    return { blob: webpBlob, contentType: "image/webp", extension: "webp" };
  }

  // Fallback to JPEG
  const jpegBlob = await canvasToBlob(
    canvas,
    "image/jpeg",
    JPEG_FALLBACK_QUALITY,
  );
  if (jpegBlob) {
    return { blob: jpegBlob, contentType: "image/jpeg", extension: "jpg" };
  }

  throw new Error("Failed to compress image");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
