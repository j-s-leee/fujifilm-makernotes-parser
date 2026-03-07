const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/openai/clip-vit-base-patch32";

/**
 * Generate a CLIP image embedding via HuggingFace Inference API.
 * Sends raw image bytes and returns a 512-dimensional float array.
 *
 * Returns null if the API call fails (non-blocking for callers).
 */
export async function getImageEmbedding(
  imageBuffer: Buffer
): Promise<number[] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("HUGGINGFACE_API_KEY not set, skipping embedding");
    return null;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(
        `HF embedding API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    // HF feature-extraction returns a nested array: [[...512 floats]]
    const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;

    if (embedding.length !== 512) {
      console.error(`Unexpected embedding dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}
