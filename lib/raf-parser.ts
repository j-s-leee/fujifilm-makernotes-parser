const RAF_MAGIC = "FUJIFILMCCD-RAW";
const JPEG_OFFSET_POS = 60;
const JPEG_LENGTH_POS = 64;

/**
 * Check if a file is a Fujifilm RAF file by reading the magic bytes.
 */
export function isRafFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".raf");
}

/**
 * Extract the embedded JPEG preview from a RAF file.
 *
 * RAF structure:
 *   [0-15]   "FUJIFILMCCD-RAW" magic
 *   [60-63]  JPEG preview offset (big-endian uint32)
 *   [64-67]  JPEG preview length (big-endian uint32)
 *   [offset] Full embedded JPEG with standard EXIF APP1 + MakerNote
 */
export async function extractJpegFromRaf(file: File): Promise<Blob> {
  const headerBuffer = await file.slice(0, 84).arrayBuffer();
  const headerView = new DataView(headerBuffer);

  // Verify RAF magic
  const magic = new TextDecoder().decode(new Uint8Array(headerBuffer, 0, 15));
  if (magic !== RAF_MAGIC) {
    throw new Error("Not a valid Fujifilm RAF file");
  }

  // Read JPEG offset and length (big-endian)
  const jpegOffset = headerView.getUint32(JPEG_OFFSET_POS, false);
  const jpegLength = headerView.getUint32(JPEG_LENGTH_POS, false);

  if (jpegOffset === 0 || jpegLength === 0) {
    throw new Error("RAF file does not contain a JPEG preview");
  }

  // Extract the embedded JPEG
  const jpegBlob = file.slice(jpegOffset, jpegOffset + jpegLength, "image/jpeg");

  // Verify JPEG magic (FFD8)
  const jpegHeader = await jpegBlob.slice(0, 2).arrayBuffer();
  const jpegBytes = new Uint8Array(jpegHeader);
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error("Embedded JPEG data is invalid");
  }

  return jpegBlob;
}
