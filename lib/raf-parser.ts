/**
 * RAF file structure (from ExifTool/dcraw):
 *   [0-15]    "FUJIFILMCCD-RAW " magic (16 bytes, trailing space/null)
 *   [16-19]   Format version (ASCII, e.g. "0201")
 *   [20-27]   Camera ID (8 bytes)
 *   [28-59]   Camera model (32 bytes)
 *   [60-63]   Directory version (ASCII, e.g. "0100")
 *   [64-83]   Unknown/padding (20 bytes)
 *   [84-87]   JPEG preview offset (big-endian uint32)
 *   [88-91]   JPEG preview length (big-endian uint32)
 *   [92-95]   CFA header offset
 *   [96-99]   CFA header length
 *   [100-103] CFA data offset
 *   [104-107] CFA data length
 */

const RAF_MAGIC = "FUJIFILMCCD-RAW";
const JPEG_OFFSET_POS = 84;
const JPEG_LENGTH_POS = 88;

/**
 * Check if a file is a Fujifilm RAF file by extension.
 */
export function isRafFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".raf");
}

/**
 * Extract the embedded JPEG preview from a RAF file.
 */
export async function extractJpegFromRaf(file: File): Promise<Blob> {
  const headerBuffer = await file.slice(0, 108).arrayBuffer();
  const headerView = new DataView(headerBuffer);

  // Verify RAF magic (first 15 chars, byte 16 is space or null)
  const magic = new TextDecoder().decode(new Uint8Array(headerBuffer, 0, 15));
  if (magic !== RAF_MAGIC) {
    throw new Error(`Not a valid RAF file (magic: "${magic}")`);
  }

  // Read JPEG offset and length (big-endian uint32)
  const jpegOffset = headerView.getUint32(JPEG_OFFSET_POS, false);
  const jpegLength = headerView.getUint32(JPEG_LENGTH_POS, false);

  if (jpegOffset === 0 || jpegLength === 0) {
    throw new Error(
      `RAF JPEG pointer is zero (offset=${jpegOffset}, length=${jpegLength})`
    );
  }

  if (jpegOffset + jpegLength > file.size) {
    throw new Error(
      `RAF JPEG range out of bounds (offset=${jpegOffset}, length=${jpegLength}, fileSize=${file.size})`
    );
  }

  // Extract the embedded JPEG
  const jpegBlob = file.slice(jpegOffset, jpegOffset + jpegLength, "image/jpeg");

  // Verify JPEG SOI marker (FF D8)
  const jpegHeader = await jpegBlob.slice(0, 2).arrayBuffer();
  const jpegBytes = new Uint8Array(jpegHeader);
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    // Fallback: scan for JPEG SOI marker in the file
    const scanBlob = await scanForJpeg(file);
    if (scanBlob) return scanBlob;

    throw new Error(
      `No valid JPEG found at offset ${jpegOffset} (got 0x${jpegBytes[0]?.toString(16)}${jpegBytes[1]?.toString(16)})`
    );
  }

  return jpegBlob;
}

/**
 * Fallback: scan the first 1MB of the file for a JPEG SOI marker.
 */
async function scanForJpeg(file: File): Promise<Blob | null> {
  const scanSize = Math.min(file.size, 1024 * 1024);
  const buffer = await file.slice(0, scanSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.length - 1; i++) {
    // Look for FF D8 FF (JPEG SOI + first marker byte)
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // Find JPEG end (FF D9) or use rest of file
      const jpegBlob = file.slice(i, file.size, "image/jpeg");
      return jpegBlob;
    }
  }

  return null;
}
