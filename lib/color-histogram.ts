import sharp from "sharp";

const BINS = 16;
const CHANNELS = 3;
const RESIZE = 200;

/**
 * Compute an RGB color histogram from an image buffer.
 *
 * Process: resize to 200×200 → extract raw RGB → 16 bins per channel
 * → normalize each channel (sum = 1.0).
 *
 * Returns a 48-dimensional float array (16 bins × 3 channels).
 */
export async function computeColorHistogram(
  buffer: Buffer
): Promise<number[]> {
  const { data } = await sharp(buffer)
    .resize(RESIZE, RESIZE, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const histogram = new Float64Array(BINS * CHANNELS);
  const totalPixels = RESIZE * RESIZE;

  for (let i = 0; i < data.length; i += CHANNELS) {
    const rBin = (data[i] >> 4) & 0x0f; // 0-255 → 0-15
    const gBin = (data[i + 1] >> 4) & 0x0f;
    const bBin = (data[i + 2] >> 4) & 0x0f;

    histogram[rBin]++;
    histogram[BINS + gBin]++;
    histogram[BINS * 2 + bBin]++;
  }

  // Normalize each channel to sum 1.0
  for (let c = 0; c < CHANNELS; c++) {
    const offset = c * BINS;
    for (let b = 0; b < BINS; b++) {
      histogram[offset + b] /= totalPixels;
    }
  }

  return Array.from(histogram);
}
